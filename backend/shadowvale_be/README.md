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

## Content versions (Admin / Designer)

API này dùng JWT, cho phép role `Admin` và `Designer`:

- `GET /api/content-versions?search=&status=Draft&page=1&pageSize=20`: danh sách metadata, không tải toàn bộ bundle.
- `GET /api/content-versions/{id}`: `{ version, bundle }`, bundle dựng từ các bảng của đúng phiên bản.
- `POST /api/content-versions`: `{ label, changelog?, schemaVersion: "1.0", parentVersionId? }`.
  Bỏ `parentVersionId` để tạo bản nháp trống; truyền ID để sao chép nội dung của một phiên bản.
  Backend cấp version number, tạo ID mới và remap các quan hệ; không sao chép trạng thái duyệt/phát hành.
- `PUT /api/content-versions/{id}`: `{ label, changelog?, schemaVersion: "1.0", revision }`.
  Hiện cập nhật metadata; CRUD từng bảng nội dung là bước tiếp theo.
- `POST /api/content-versions/{id}/validate`: `{ revision }`.
- `GET /api/content-versions/{id}/compare?targetId={guid}`: thay đổi từ phiên bản nguồn sang phiên bản đích,
  kèm revision của cả hai. So sánh theo code/khóa ghép; enemy placements so sánh nội dung, bỏ ID được tạo lại khi clone.

Chỉ `Draft` được cập nhật/validate. `revision` bắt buộc và phải khớp phiên bản hiện tại;
request thiếu revision trả 400, phiên bản đã thay đổi hoặc không còn Draft trả 409.
Cập nhật metadata tăng revision và xóa kết quả validation/checksum cũ.
Validation cũng tăng revision để tránh ghi đè kết quả của request khác; client phải dùng revision trả về cho lần ghi tiếp theo.

Bundle v1.0 dùng snake_case và tham chiếu bằng code, dựa trên contract content editor hiện có ở frontend.
Schema nằm trong `ShadowVale.BLL/Schemas/content-bundle-1.0.schema.json`, được nhúng vào assembly.
Backend kiểm tra JSON Schema, danh tính trùng, loại item/tham chiếu cùng phiên bản,
đúng một Safe Camp, khoảng loot, subtype weapon/consumable, melee, skill level và vòng lặp quest.
Draft trống tạo được nhưng không validate thành công cho tới khi có Safe Camp và dữ liệu hợp lệ.
JSONB được xuất thành object/array, không thành chuỗi JSON.

Validation trả 200 với `{ id, revision, isValid, validatedAt, bundleChecksum, errors: [{ path, message }] }`.
Bundle hợp lệ được lưu cùng SHA-256 của chính chuỗi JSON có thứ tự key ổn định;
bundle không hợp lệ xóa bundle/checksum cũ và lưu lỗi. Đây chưa phải thao tác publish.
Không có endpoint sửa status, duyệt, publish hay rollback trong giai đoạn này.
Mọi API chỉnh sửa nội dung bổ sung sau này phải cập nhật revision của content version trong cùng transaction.

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

Model DAL hiện ánh xạ toàn bộ 23 bảng nghiệp vụ trong schema `shadowvale`, gồm auth,
content/versioning, solver và telemetry. Model, enum, configuration và migration
`20261008175804_ContentAndTelemetry` được khôi phục từ commit `ab33ea5`, là bản migration
đã được ghi nhận trên database dùng chung. Không cần chạy lại migration này trên database đó.

Test `Data/SchemaMappingTests.cs` đối chiếu cột, kiểu dữ liệu, nullable, identity,
khóa ngoại, check constraint và index với metadata database chụp ngày 09/10/2026
trong `Data/database-schema.json`; test không kết nối database và fixture không chứa
dữ liệu nghiệp vụ hay mật khẩu. Model cũng được kiểm tra khớp migration snapshot.

`dotnet-ef` là local tool (khai báo trong `dotnet-tools.json`), cài một lần sau khi clone: `dotnet tool restore`

```bash
dotnet ef migrations add <TenMigration> --project ShadowVale.DAL --startup-project ShadowVale.API --output-dir Migrations
dotnet ef database update --project ShadowVale.DAL --startup-project ShadowVale.API
```

Bảng được tạo trong schema `shadowvale`, không dùng `public`, vì Supabase tự mở schema `public` qua REST API bằng anon key.

## Deploy

Đặt biến môi trường `ConnectionStrings__Default` và `Jwt__Key`. Thêm domain frontend vào `Cors:AllowedOrigins`.

Khi chạy sau reverse proxy (Railway/Render), cần bật `ForwardedHeaders`. Nếu không, rate limit sẽ thấy mọi request
đến từ cùng một IP của proxy và chặn chung tất cả người dùng.

ContentVersion soft delete: `DELETE /api/content-versions/{id}` with JSON body `{ "revision": 2 }` (Admin/Designer). Only Draft versions can be deleted; success returns 204. This archives the version (Status=Archived, ArchivedAt=UTC, Revision incremented), preserving all content and bundle data. Default searches exclude Archived; use `?status=Archived` to list them. Detail/compare/clone remain available for archived snapshots. Missing versions return 404; stale revisions, concurrent changes, and non-Draft versions return 409; missing/negative revision returns 400. No schema migration is required.

Authentication error responses retain ProblemDetails fields and now include `code`, `message`, and `traceId`. Login returns 401/INVALID_CREDENTIALS for unknown identifiers or wrong passwords, 403/ACCOUNT_DEACTIVATED after correct credentials for disabled accounts, 400/VALIDATION_FAILED with `errors` for invalid input, and 429/AUTH_RATE_LIMITED when throttled. Frontend can display `message` and handle `code`; internal server/database exception text is never sent to clients.

ContentVersion expected business errors use `ServiceResult<T>` rather than throwing exceptions. Controllers return ProblemDetails JSON directly with `code`, `message`, `traceId`, and optional field `errors`: 400/VALIDATION_FAILED, 404/CONTENT_VERSION_NOT_FOUND, 409/CONTENT_VERSION_CHANGED or CONTENT_VERSION_NOT_DRAFT. Successful response bodies and validation reports are unchanged. EF concurrency failures are caught and converted to conflict results; unexpected infrastructure exceptions still use the global exception handler.
