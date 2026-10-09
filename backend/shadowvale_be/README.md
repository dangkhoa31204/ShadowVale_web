# ShadowVale Backend

ASP.NET Core Web API (.NET 10), 3 lớp, PostgreSQL trên Supabase.

```
ShadowVale.API         Presentation: Controllers, Middlewares, Program.cs
ShadowVale.BLL         Business: Services, Interfaces, Validators, Exceptions, DTOs (chỉ web dùng: Auth, Common...)
ShadowVale.DAL         Data: DbContext, Entities, Configurations, Repositories, Migrations
ShadowVale.Contracts   Chỉ những gì Unity dùng: Content (bundle), Telemetry (netstandard2.1, C# 9)
tests/ShadowVale.BLL.Tests           Unit test (mock repository)
tests/ShadowVale.IntegrationTests    Test qua HTTP với PostgreSQL thật
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
| `BadHttpRequestException` | mã của chính nó, ví dụ 413 khi body vượt giới hạn |
| exception khác | 500. Chỉ môi trường Development mới hiện `detail`. |

Lỗi DB do chính dữ liệu gửi lên gây ra được BLL đổi qua `DatabaseErrors`: trùng khóa / sai khóa ngoại → 409,
vi phạm ràng buộc hoặc giá trị sai kiểu → 400. Những lỗi này không bao giờ thành 5xx, vì game hiểu 5xx là "gửi lại sau"
và sẽ gửi lại mãi.

## Auth & role

Role cố định theo proposal: `Admin`, `Designer`, `Analyst`, mỗi user một role. **Không có đăng ký công khai**: chỉ Admin tạo
tài khoản. Game không đăng nhập (telemetry ẩn danh).

- **Access token**: JWT HS256, sống 15 phút. Claims: `sub` (user id), `unique_name`, `email`, `role`.
  Gửi kèm header `Authorization: Bearer <token>`.
- **Refresh token**: chuỗi ngẫu nhiên, sống 7 ngày. DB chỉ lưu hash SHA-256 của nó. **Mỗi refresh token dùng được đúng một lần**
  (rotation). Nếu một token đã dùng rồi lại bị gửi lên, mọi phiên của user đó bị thu hồi (coi như token bị lộ).
- Khi đổi mật khẩu, Admin reset mật khẩu, đổi role hoặc khóa tài khoản: mọi refresh token của user bị thu hồi.
- `login` và `refresh` bị giới hạn 10 request/phút/IP, vượt quá trả 429 (đổi được trong `RateLimits:Auth`).
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

## Cấu hình solver (`/api/solver-configurations`)

Mỗi cấu hình là một thuật toán cùng bộ tham số. Cả 3 role xem được; chỉ Admin và Analyst sửa được.

| Endpoint | Ghi chú |
|---|---|
| `GET /` | `?family=&algorithm=&isActive=`; mỗi dòng có `variant` (tên solver trong registry Python), `isAbArm`, `sessionCount`, `resultCount` |
| `GET /{id}` | |
| `POST /` | `{ code, name, algorithm, library?, params?, quboWeights?, timeBudgetMs }`; `family` do server suy ra; tạo ở trạng thái **tắt** |
| `PUT /{id}` | `{ name, library?, params?, quboWeights?, timeBudgetMs }`; `code` và `algorithm` không đổi được |
| `POST /{id}/clone` | `{ code, name }`; bản sao ở trạng thái tắt |
| `PATCH /{id}/active` | `{ isActive }` |
| `DELETE /{id}` | Chỉ khi chưa từng được dùng |

Quy tắc giữ cho phép so sánh hợp lệ:
- `params` chỉ nhận đúng các tham số mà constructor solver nhận (`SolverParamsValidator`); `quboWeights` chỉ nhận 6 trọng số
  của solver và luôn được lưu đủ 6 (thiếu thì lấy mặc định của solver).
- Cấu hình **đã được dùng** (có phiên hoặc kết quả trỏ tới) chỉ đổi được tên; muốn thử tham số khác thì clone.
- Mọi cấu hình **đang bật** phải cùng `timeBudgetMs` và `quboWeights`, để các nhánh A/B chỉ khác nhau ở thuật toán.
- Nhánh A/B = cấu hình đang bật, trừ `QpuDwave` (solver chưa chạy được).

Lần khởi động đầu (bảng rỗng), API tự tạo `greedy`, `ga`, `sa`, `sqa`, `qiea`, `qaoa` với tham số đã tune
(`shadowvale-solver/experiments/tuning/tuned.json`), ngân sách 120 ms; chỉ bật sẵn `greedy` và `sqa`.

## Game

Game không đăng nhập. Mỗi bản build gửi header `X-Game-Key`; key nằm trong `Game:ApiKeys` (mảng, mỗi key ≥ 32 ký tự,
cho phép nhiều key để đổi key mà không gián đoạn). Thiếu key thì API **không khởi động**. Key này chỉ để chặn spam
(key nằm trong bản build nên có thể bị lấy ra), vì vậy endpoint game còn bị giới hạn 120 request/phút/IP (`RateLimits:Game`).

DTO nằm trong `ShadowVale.Contracts` (`Game/*`, `Telemetry/*`) để Unity dùng lại; JSON dạng camelCase, thời gian là ISO 8601
có offset (server lưu UTC). Game hiểu mã trả về như sau: **2xx và 409 = xong**; **400 và 413 = bỏ lô**; mã khác = gửi lại sau.

| Endpoint | Ghi chú |
|---|---|
| `GET /api/game/content/manifest` | Version đang Published: `{ versionId, versionNo, label, schemaVersion, checksum, publishedAt }`; chưa có → 404 |
| `GET /api/game/content/bundle` | Bundle nguyên văn, `ETag: "<checksum>"`. Gửi lại checksum trong `If-None-Match` → 304 nếu không đổi |
| `GET /api/game/content/versions/{id}/bundle` | Version từng được publish (kể cả đã archive), cho replay harness |
| `POST /api/game/sessions` | Đăng ký phiên khi bắt đầu chơi, trả solver phải dùng (`solver: null` = dùng mặc định trong bundle) |
| `PUT /api/game/sessions/{id}` | Gửi một lần khi phiên kết thúc: kết quả, `stats`, `events[]`, `coordinationResults[]`; tối đa 2 MB |

`checksum` là SHA-256 của đúng chuỗi bundle mà API trả về, do PostgreSQL tính, nên không phụ thuộc giá trị `bundle_checksum`
mà phần publish lưu.

**Giao solver** (`POST sessions`):
- `source: "human"`: server tự chia đều theo hash của `sessionId` cho các cấu hình đang bật (trừ `QpuDwave`).
  Không được gửi `requestedVariant`.
- `source: "replay"`: bắt buộc gửi `requestedVariant` = `code` của cấu hình muốn chạy (không cần đang bật).
- Gọi lại với cùng `sessionId` trả đúng kết quả cũ; `sessionId` đã thuộc `installId` khác → 409.

**Upload** (`PUT sessions/{id}`): gửi lại bao nhiêu lần cũng không bị nhân đôi; event (theo `clientEventId`) và kết quả re-plan
(theo `id`) đã lưu được đếm là `duplicate`. Kết quả trả về là số `accepted` / `duplicate` / `rejected` của event và của kết quả.
- **400 cả lô:** thiếu hoặc sai thông tin phiên (`endedAt`, `outcome`...), id rỗng hoặc trùng trong lô, quá 5.000 event /
  2.000 kết quả / 200 trận, `stats` có số âm hoặc trận sai.
- **Chỉ bỏ phần tử đó (`rejected`):** loại event lạ, payload > 4 KB, thời điểm nằm ngoài phiên (cho lệch 1 phút trước / 5 phút
  sau), `variant` không tra được cấu hình nào, `taskType` sai.
- `contentVersionId` lạ (ví dụ bundle dự phòng trong game) được lưu là `null`.
- Phiên chưa từng gọi `POST sessions` vẫn được lưu, nhưng không có solver được giao nên không tính vào so sánh solver.

## Test

xUnit + NSubstitute (mock) + Shouldly (assert): `dotnet test`

- `ShadowVale.BLL.Tests`: unit test, không cần DB.
- `ShadowVale.IntegrationTests`: gọi API thật qua `WebApplicationFactory` trên một PostgreSQL **dùng để test**
  (mọi bảng bị `TRUNCATE` trước mỗi test). Đặt biến môi trường `SHADOWVALE_TEST_DB`, ví dụ
  `Host=localhost;Port=5432;Database=shadowvale_test;Username=postgres;Password=<mật khẩu>`.
  **Không bao giờ trỏ biến này vào Supabase.** Không đặt thì các test này bị skip ở máy dev; trên CI thì báo fail.

CI (`.github/workflows/backend.yml` ở gốc repo) chạy build + toàn bộ test với một container `postgres:17` mỗi khi
có thay đổi trong `backend/**`, và lưu kết quả test (`.trx`) cùng coverage làm artifact `backend-test-results`.

## Cài đặt lần đầu

Secret không commit lên git, mỗi người tự đặt bằng user-secrets:

```bash
cd backend/shadowvale_be
dotnet user-secrets set "ConnectionStrings:Default" "Host=aws-0-<region>.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.<project-ref>;Password=<db-password>;SSL Mode=Require" --project ShadowVale.API
dotnet user-secrets set "Jwt:Key" "<chuỗi ngẫu nhiên dài ít nhất 32 ký tự>" --project ShadowVale.API
dotnet user-secrets set "Game:ApiKeys:0" "<chuỗi ngẫu nhiên dài ít nhất 32 ký tự>" --project ShadowVale.API
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

Quy ước khi nhiều người cùng thêm migration: **ai merge sau thì xóa migration của mình rồi chạy lại `migrations add`**
trên code mới nhất. Không sửa tay `ShadowValeDbContextModelSnapshot.cs`.

Trước khi chạy `database update` lên Supabase: xem trước SQL bằng
`dotnet ef migrations script <migration trước> --project ShadowVale.DAL --startup-project ShadowVale.API`.
Mỗi migration chạy trong một transaction, lỗi giữa chừng thì tự rollback.

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
| `Game__ApiKeys__0` | Key của bản build game, ≥ 32 ký tự, khác key ở máy dev (thêm `__1` khi cần đổi key) |
| `Cors__AllowedOrigins__0` | Domain frontend, ví dụ `https://shadowvale.vercel.app` (thêm `__1`, `__2`... nếu nhiều domain) |
| `SeedAdmin__Username`, `SeedAdmin__Email`, `SeedAdmin__Password` | Chỉ đặt ở lần deploy đầu để tạo Admin, tạo xong thì xóa |

Migration **không** tự chạy khi API khởi động. Mỗi khi có migration mới, chạy `dotnet ef database update` từ máy
(trỏ tới Supabase) **trước** khi deploy code mới.

API đã bật `ForwardedHeaders` để rate limit thấy IP thật của người dùng thay vì IP của proxy Render.
Ở môi trường Production, trang Scalar (`/scalar`) bị ẩn; `/health` vẫn mở để Render kiểm tra.

Gói Free của Render tắt service khi không có request, request đầu tiên sau đó mất vài chục giây: game cần
timeout hợp lý và dùng bundle đã lưu khi không kết nối được.
