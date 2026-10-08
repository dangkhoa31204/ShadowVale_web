# ShadowVale Backend

ASP.NET Core Web API (.NET 10), 3 lớp, PostgreSQL trên Supabase.

```
ShadowVale.API         Presentation: Controllers, Middlewares, Program.cs
ShadowVale.BLL         Business: Services, Interfaces, Validators, Exceptions, DTOs (chỉ web dùng: Auth, Common...)
ShadowVale.DAL         Data: DbContext, Entities, Configurations, Repositories, Migrations
ShadowVale.Contracts   Chỉ những gì Unity dùng: Content (bundle), Telemetry (netstandard2.1, C# 9)
tests/ShadowVale.BLL.Tests
```

Tham chiếu: `API → BLL → DAL`; API và BLL → `Contracts`. API chỉ gọi `AddBll(...)` và **không `using` được DAL**
(`DisableTransitiveProjectReferences` trong `ShadowVale.API.csproj`), nên Controller bắt buộc phải đi qua Service.

Contracts nhắm netstandard2.1 / C# 9 để Unity dùng được: viết class thường với `{ get; set; }`, không dùng `record`/`init`.
Phía Unity đọc JSON bằng Newtonsoft (`com.unity.nuget.newtonsoft-json`), vì `JsonUtility` không đọc được property.

## Xử lý lỗi

Controller **không viết try/catch**. Service trong BLL ném exception ở `BLL/Exceptions`, rồi
`API/Middlewares/GlobalExceptionHandler` đổi sang ProblemDetails (RFC 7807):

| Exception | HTTP |
|---|---|
| `ValidationException` | 400, kèm `errors: { field: [msg] }` |
| `UnauthorizedException` | 401 |
| `ForbiddenException` | 403 |
| `NotFoundException` | 404 |
| `ConflictException` | 409 |
| exception khác | 500. Chỉ môi trường Development mới hiện `detail`. |

## Auth & role

Role cố định theo proposal: `Admin`, `Designer`, `Analyst`, mỗi user một role. **Không có đăng ký công khai**: chỉ Admin tạo
tài khoản. Game không đăng nhập (telemetry ẩn danh).

- **Access token**: JWT HS256, sống 15 phút. Claims: `sub` (user id), `unique_name`, `email`, `role`.
  Gửi kèm header `Authorization: Bearer <token>`.
- **Refresh token**: chuỗi ngẫu nhiên, sống 7 ngày. DB chỉ lưu hash SHA-256 của nó. **Mỗi refresh token dùng được đúng một lần**
  (rotation). Nếu một token đã dùng rồi lại bị gửi lên, mọi phiên của user đó bị thu hồi (coi như token bị lộ).
- Khi đổi mật khẩu, Admin reset mật khẩu, đổi role hoặc khóa tài khoản: mọi refresh token của user bị thu hồi.
- `login` và `refresh` bị giới hạn 10 request/phút/IP, vượt quá trả 429.
- Phân quyền trong controller: `[Authorize(Roles = AppRoles.Admin)]` (hằng số ở `BLL/Constants/AppRoles.cs`).

| Endpoint | Quyền | Ghi chú |
|---|---|---|
| `POST /api/auth/login` | ai cũng gọi được | `{ usernameOrEmail, password }` → `AuthResponse` |
| `POST /api/auth/refresh` | ai cũng gọi được | `{ refreshToken }` → cặp token mới |
| `POST /api/auth/logout` | ai cũng gọi được | `{ refreshToken }` → 204 |
| `GET /api/auth/me` | đã đăng nhập | thông tin user hiện tại |
| `PUT /api/auth/me/password` | đã đăng nhập | `{ currentPassword, newPassword }` |
| `GET /api/users` | Admin | `?search=&role=&isActive=&page=1&pageSize=20` |
| `GET /api/users/{id}` | Admin | |
| `POST /api/users` | Admin | `{ username, email, fullName?, password, role }` |
| `PUT /api/users/{id}` | Admin | `{ email, fullName?, role, isActive }`. Khóa tài khoản = `isActive: false`, không xóa cứng. |
| `PUT /api/users/{id}/password` | Admin | `{ newPassword }` |

Admin không tự hạ role hay tự khóa tài khoản của chính mình được (tránh trường hợp không còn ai quản lý user).

## Test

xUnit + NSubstitute (mock) + Shouldly (assert): `dotnet test`

## Cài đặt lần đầu

Secret không commit lên git, mỗi người tự đặt bằng user-secrets:

```bash
cd backend/shadowvale_be
dotnet user-secrets set "ConnectionStrings:Default" "Host=aws-0-<region>.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.<project-ref>;Password=<db-password>;SSL Mode=Require" --project ShadowVale.API
dotnet user-secrets set "Jwt:Key" "<chuỗi ngẫu nhiên dài ít nhất 32 ký tự>" --project ShadowVale.API
```

Lấy connection string trên Supabase tại **Connect → Session pooler**:
- Dùng **Session pooler** (port 5432). Direct connection (`db.<ref>.supabase.co`) chỉ có IPv6 ở gói free nên nhiều mạng không kết nối được.
- Không dùng Transaction pooler (port 6543) để chạy migration.

Tạo bảng trên Supabase (chỉ cần một người chạy mỗi khi có migration mới):

```bash
dotnet tool restore
dotnet ef database update --project ShadowVale.DAL --startup-project ShadowVale.API
```

Tài khoản Admin đầu tiên: đặt 3 secret dưới đây rồi chạy API. Lúc khởi động, API tự tạo Admin **nếu DB chưa có Admin nào**.
Có Admin rồi thì xóa các secret này (`dotnet user-secrets remove "SeedAdmin:Password" --project ShadowVale.API`).

```bash
dotnet user-secrets set "SeedAdmin:Username" "admin" --project ShadowVale.API
dotnet user-secrets set "SeedAdmin:Email" "admin@shadowvale.dev" --project ShadowVale.API
dotnet user-secrets set "SeedAdmin:Password" "<mật khẩu mạnh>" --project ShadowVale.API
```

## Chạy

```bash
dotnet run --project ShadowVale.API
```

- Scalar (giao diện test API): `/scalar`
- Kiểm tra kết nối Supabase: `/health` (trả `Healthy` là kết nối được)

## Migration

`dotnet-ef` là local tool (khai báo trong `dotnet-tools.json`), cài một lần sau khi clone: `dotnet tool restore`

```bash
dotnet ef migrations add <TenMigration> --project ShadowVale.DAL --startup-project ShadowVale.API --output-dir Migrations
dotnet ef database update --project ShadowVale.DAL --startup-project ShadowVale.API
```

Bảng được tạo trong schema `shadowvale`, không dùng `public`, vì Supabase tự mở schema `public` qua REST API bằng anon key.

## Deploy (Render, Docker)

API chạy trong container (`Dockerfile`, build context là thư mục `backend/shadowvale_be`), lắng nghe HTTP cổng 8080.
Render lo HTTPS ở proxy phía trước.

Tạo Web Service trên Render:

- **Runtime:** Docker. **Root Directory:** `backend/shadowvale_be`. **Health Check Path:** `/health`.
- **Environment** (dấu `__` thay cho `:` trong cấu hình):

| Biến | Giá trị |
|---|---|
| `PORT` | `8080` |
| `ConnectionStrings__Default` | Chuỗi **Session pooler** của Supabase, thêm `;Maximum Pool Size=10` ở cuối (gói Free giới hạn số kết nối) |
| `Jwt__Key` | Chuỗi ngẫu nhiên dài ≥ 32 ký tự, **khác** key ở máy dev |
| `Cors__AllowedOrigins__0` | Domain frontend, ví dụ `https://shadowvale.vercel.app` (thêm `__1`, `__2`... nếu nhiều domain) |
| `SeedAdmin__Username`, `SeedAdmin__Email`, `SeedAdmin__Password` | Chỉ đặt ở lần deploy đầu để tạo Admin, tạo xong thì xóa |

Migration **không** tự chạy khi API khởi động. Mỗi khi có migration mới, chạy `dotnet ef database update` từ máy
(trỏ tới Supabase) **trước** khi deploy code mới.

API đã bật `ForwardedHeaders` để rate limit thấy IP thật của người dùng thay vì IP của proxy Render.
Ở môi trường Production, trang Scalar (`/scalar`) bị ẩn; `/health` vẫn mở để Render kiểm tra.

Gói Free của Render tắt service khi không có request, request đầu tiên sau đó mất vài chục giây: game cần
timeout hợp lý và dùng bundle đã lưu khi không kết nối được.
