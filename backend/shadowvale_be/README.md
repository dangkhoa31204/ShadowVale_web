# ShadowVale Backend

ASP.NET Core Web API (.NET 10), 3 lớp, PostgreSQL trên Supabase.

```
ShadowVale.API         Presentation: Controllers, Middlewares, Program.cs
ShadowVale.BLL         Business: Services, Interfaces, Validators, Exceptions, DTOs (chỉ web dùng: Auth, Common...)
ShadowVale.DAL         Data: DbContext, Entities, Configurations, Repositories, Migrations
ShadowVale.Contracts   Chỉ những gì Unity dùng: Content (bundle), Telemetry (netstandard2.1, C# 9)
tests/ShadowVale.BLL.Tests           Unit test (mock repository)
tests/ShadowVale.IntegrationTests    Test qua HTTP với PostgreSQL thật
docs/openapi.json                    Tài liệu API, tự sinh lại mỗi lần build
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

Mọi phản hồi lỗi là ProblemDetails, có thêm `code`, `message` và `traceId`. Đăng nhập trả 401 `INVALID_CREDENTIALS` khi
sai tài khoản hoặc mật khẩu, 403 `ACCOUNT_DEACTIVATED` khi đúng mật khẩu nhưng tài khoản bị khóa, 400 `VALIDATION_FAILED`
kèm `errors` khi dữ liệu sai, 429 `AUTH_RATE_LIMITED` khi gọi quá nhanh. Lỗi 5xx không bao giờ trả nội dung exception.

User management validation and session behavior:
- `PUT /api/users/{id}` requires an explicit boolean `isActive`; omission/null returns 400.
- User list pagination accepts page 1-1000000 and pageSize 1-100; out-of-range requests return 400.
- Concurrent duplicate usernames/emails return 409, including email updates.
- Role/state updates and password resets commit together with refresh-token revocation; failure rolls back both.
- Each validated JWT is checked against the current user in PostgreSQL. Missing/inactive users and obsolete role
  claims receive 401 and must log in again; unchanged roles still receive normal endpoint authorization checks.
  Each access token also contains `sid`, the ID of its associated refresh-token row. The API verifies that row
  belongs to the user, has not expired, and is not revoked. Logout of the current refresh token makes its paired
  access token return 401 on the next authenticated request; other devices remain active.
  Refresh rotates both tokens and invalidates the old access/refresh pair. FE must replace both tokens atomically
  and logout with the latest refresh token. Unknown/already-revoked logout remains idempotent (204).
  Role changes, account deactivation and password resets revoke refresh rows, so their access tokens also stop
  working. This adds database checks to authenticated requests. Older access tokens without sid require login
  again after this update. No database schema migration is required.
- `tests/admin_api_smoke.py` uses optional `API_SMOKE_ADMIN_TOKEN`, `API_SMOKE_DESIGNER_TOKEN`,
  `API_SMOKE_ANALYST_TOKEN` from active database users; fabricated JWTs no longer simulate valid sessions.

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
Không có endpoint sửa status tùy ý. API duyệt/publish/rollback dành cho Admin được mô tả bên dưới.
`GET /api/content-versions/{id}/bundle` (Admin/Designer) tải bundle đã validate đúng như game sẽ nhận;
trả 409 nếu version chưa validate kể từ lần sửa gần nhất.
Mọi API chỉnh sửa nội dung bổ sung sau này phải cập nhật revision của content version trong cùng transaction.

### Admin review and publication (Scalar)

Naming conventions for content APIs: lowercase kebab-case resource paths, plural collection names
(`content-versions`, `content-publications`), and HTTP methods describing the operation.
CRUD uses the collection or `/{id}`, never `/get`, `/create`, or `/update`.
The existing workflow commands `/validate`, `/submit`, `/approve`, `/reject`, `/publish`, and query
`/compare` are retained as explicit action routes for compatibility; this API does not model them as
separate persistent REST resources. Scalar summaries use HTTP method + full route + `(ADMIN)` or `(DESIGNER)`,
for example `POST /api/content-versions/{id}/approve (ADMIN)`. Functional explanations are in Description.
Role suffixes indicate the intended UI flow; actual authorization is documented separately because
some endpoints are shared. Version metadata update must not be confused with weapon stats editing.

#### Reusable workflow test fixtures

Run `dotnet run --project tools/SeedContent -- --seed` to create exactly two additional validated Drafts.
The tool reads `ConnectionStrings__Default` or the API user-secrets without printing credentials.
It needs an existing active Designer/Admin author and never creates users, alters existing versions,
or publishes content. Repeating seed preserves any fixture edits/status. Read-only checks:
`dotnet run --project tools/SeedContent -- --verify`.

- `019a0000-0000-7000-8000-000000000001`: TEST Weapon baseline V1, rifle damage 30/reload 2.5, pistol fire rate 2.
- `019a0000-0000-7000-8000-000000000002`: TEST Weapon balance V2, parent V1, rifle damage 40/reload 2, pistol fire rate 3.

Each has two weapons, two ammo items, two maps with exactly one Safe Camp. Other content groups are empty
but valid; scene/icon keys are test placeholders, not actual Unity assets. Both fixtures start Draft with a
validated bundle; always GET the latest revision before each action.

Test first release: V1 validate -> submit -> approve -> publish -> publication history.
Test update: compare V1 -> V2, then V2 validate -> submit -> approve -> publish; V1 becomes Archived.
To test rejection without losing the update scenario, clone V2 before submission, validate and submit the
clone, then reject it with a note. A Rejected version returns to Draft on its first content edit.
Use Analyst/Designer on Admin endpoints for 403; stale revisions and repeated/wrong-state actions for 409.
Current submit also permits Admin, useful when a Designer account is not available.

Numeric canonicalization ignores decimal scale (30 and 30.00), so PostgreSQL numeric precision does not
invalidate an unchanged snapshot. Draft bundles created with an older canonicalization should be validated
again before submission. Already-approved historical snapshots require a separate migration plan if needed.

Scalar hiển thị hậu tố `(ADMIN)` trong Summary của các API phục vụ màn hình Admin.
Các API GET danh sách/detail/compare hiện có vẫn dùng chung cho Admin và Designer;
approve/reject/publish và publication history chỉ cho JWT role `Admin` (Designer/Analyst nhận 403).

- `GET /api/content-versions?status=InReview&page=1&pageSize=20` (ADMIN): danh sách chờ duyệt.
- `GET /api/content-versions/{id}` (ADMIN): metadata và bundle, bao gồm `weapons` với thông số đầy đủ.
- `GET /api/content-versions/{sourceId}/compare?targetId={draftId}` (ADMIN): before/after từ nguồn sang bản cần duyệt. Dùng `parentVersionId` làm nguồn khi có.
- `POST /api/content-versions/{id}/approve` (ADMIN): `{ "revision": 4, "reviewNote": "Balanced" }`.
  Chỉ `InReview` -> `Approved`; ghi reviewer/time/note và tăng revision.
- `POST /api/content-versions/{id}/reject` (ADMIN): `{ "revision": 4, "reviewNote": "Damage too high" }`.
  Chỉ `InReview` -> `Rejected`; note bắt buộc, không quá 2000 ký tự. Designer xử lý reopen/resubmit ở phần riêng.
- `POST /api/content-versions/{id}/publish` (ADMIN): `{ "revision": 5, "reason": "Weapon balance release" }`.
  Chỉ `Approved` -> `Published`, cần thông tin Admin đã duyệt; reason bắt buộc, tối đa 500 ký tự.
- `GET /api/content-publications?contentVersionId={id}&page=1&pageSize=20` (ADMIN): lịch sử phân trang;
  bỏ `contentVersionId` để xem tất cả. Mỗi row gồm version, previousVersion, action, actor, reason và createdAt,
  kèm `versionNo`, `versionLabel`, `previousVersionNo`, `actorUsername` để hiển thị. `action` là `Publish` hoặc `Rollback`.
- `POST /api/content-versions/{id}/rollback` (ADMIN): `{ "revision": 7, "reason": "Damage too high" }`.
  Chỉ version `Archived` **đã từng được publish** -> `Published` (Draft đã xóa không rollback được, trả 409).
  Version đang Published bị archive, lịch sử ghi một dòng `Rollback`, tất cả trong một transaction.
  Bundle được dùng lại nguyên trạng như lúc được duyệt, không validate lại. Reason bắt buộc, tối đa 500 ký tự.

Các thao tác thành công trả 200 và DTO với revision mới. Metadata bổ sung `submittedAt`, `reviewedById`,
`reviewedAt`, `reviewNote`, `publishedById`, `publishedAt`; các trường chưa có giá trị trả null.
FE phải dùng revision mới sau approve để publish; stale revision/sai trạng thái trả 409,
version không tồn tại trả 404, dữ liệu sai hoặc bundle không hợp lệ trả 400.

`POST /api/content-versions/{id}/submit` (DESIGNER): `{ "revision": 3 }`.
JWT Designer hoặc Admin được gọi; Analyst nhận 403. Chỉ nhận Draft với revision hiện tại.
Phải validate thành công trước, rồi dùng revision mới từ response validate để submit.
Submit kiểm tra lại schema, tham chiếu, bundle/checksum và snapshot chưa thay đổi;
chuyển sang `InReview`, lưu `SubmittedAt`, xóa thông tin review cũ và tăng revision trong cùng SaveChanges.
Thành công trả 200 với ContentVersionDto và revision mới; chưa validate/bundle sai trả 400,
stale revision/sai trạng thái trả 409, không tồn tại trả 404.
Khi còn `InReview`/`Approved` phải khóa mọi chỉnh sửa content.
Admin approve/publish kiểm tra lại schema, checksum và bundle có khớp dữ liệu snapshot hay không;
reject vẫn được phép khi bundle không hợp lệ. API reopen/chỉnh weapon vẫn do người phụ trách Designer triển khai.

Publish giữ nguyên bundle đã duyệt. Transaction PostgreSQL dùng advisory lock để tuần tự hóa publish,
archive phiên bản Published cũ, tăng revision của cả hai và ghi history atomically;
partial unique index hiện có bảo đảm tối đa một Published. Không cần migration mới.
Phía Unity/config loader cần tải và áp dụng bundle Published; API game và tích hợp Unity thuộc phần riêng,
publish Admin không tự đẩy thông số vào Unity đang chạy.

ContentVersion soft delete: `DELETE /api/content-versions/{id}` with JSON body `{ "revision": 2 }` (Admin/Designer). Only Draft versions can be deleted; success returns 204. This archives the version (Status=Archived, ArchivedAt=UTC, Revision incremented), preserving all content and bundle data. Default searches exclude Archived; use `?status=Archived` to list them. Detail/compare/clone remain available for archived snapshots. Missing versions return 404; stale revisions, concurrent changes, and non-Draft versions return 409; missing/negative revision returns 400. No schema migration is required.

ContentVersion expected business errors use `ServiceResult<T>` rather than throwing exceptions. Controllers return ProblemDetails JSON directly with `code`, `message`, `traceId`, and optional field `errors`: 400/VALIDATION_FAILED, 404/CONTENT_VERSION_NOT_FOUND, 409/CONTENT_VERSION_CHANGED or CONTENT_VERSION_NOT_DRAFT. Successful response bodies and validation reports are unchanged. EF concurrency failures are caught and converted to conflict results; unexpected infrastructure exceptions still use the global exception handler.

### Nội dung của một version (`/api/content-versions/{versionId}/...`)

Role `Admin` và `Designer`. Mỗi nhóm có đủ `GET /` (danh sách), `GET /{id}`, `POST /`, `PUT /{id}`, `DELETE /{id}`:
`items` (kèm thông số weapon / consumable), `skills`, `loot-tables` (kèm entries), `enemy-types`, `maps` (kèm enemy
placements và loot tables), `recipes` (kèm ingredients), `quests` (kèm rewards).

- Chỉ sửa được version `Draft` hoặc `Rejected`; lần sửa đầu tiên đưa version `Rejected` về `Draft`. Trạng thái khác trả 409.
- Mỗi lần sửa tăng `revision` của version và xóa bundle / checksum / kết quả validation cũ, nên phải lấy lại revision
  rồi validate lại trước khi submit.
- Tham chiếu giữa các dòng dùng `code` trong cùng version (ví dụ `ammoItemCode`, `lootTableCode`); code không tồn tại trả 400.
- `code` trùng trong cùng version trả 409. Dòng đang được dòng khác dùng thì không xóa được (409, có nêu nơi đang dùng).
- Mỗi version chỉ có một map `isSafeCamp`. Danh sách con (entries, placements, ingredients, rewards) được thay toàn bộ khi `PUT`.

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

## Analytics (`/api/analytics`)

Cả 3 role xem được dashboard; chỉ Admin và Analyst được export.

Bộ lọc chung (query string): `source`, `contentVersionId`, `mapCode`, `from`, `to` (thời điểm bắt đầu phiên, tối đa 366 ngày),
`solverConfigurationId`, `family`. **`source` mặc định là `human`; riêng `ai/comparison` và `ai/scalability` bắt buộc chọn
`human` hoặc `replay`**, vì người thật và bot không bao giờ được trộn chung.

| Endpoint | Nội dung |
|---|---|
| `GET overview` | Số phiên, số player, số phiên chưa kết thúc, thời lượng trung bình / trung vị, tỉ lệ outcome, số phiên theo ngày |
| `GET heatmap` | `mapCode` bắt buộc, `eventTypes` (mặc định `player_death`, `player_spotted`), `cellSize` 1–50 m → `{ x, y, count }` |
| `GET funnel` | Phiên bắt đầu → `objective_completed` theo `index` → `mission_result` có `result = "completed"` |
| `GET weapons` | Từ `stats`: số phát bắn, kill, kill/phát bắn, tỉ lệ phiên có dùng |
| `GET playstyle` | Tỉ lệ lén lút = takedowns / (takedowns + weaponKills), `timesDetected`, histogram 10 khoảng |
| `GET versions/compare?a=&b=` | `overview`, `funnel`, `weapons` của 2 content version |
| `GET ai/comparison` | `groupBy=configuration\|family`, tách theo content version, nhóm theo solver được giao cho phiên |
| `GET ai/scalability` | Độ trễ p50 / p95 và objective theo số agent và số node (khoảng 20), từng cấu hình |
| `GET export/{sessions\|events\|encounters\|coordination-results}` | CSV UTF-8 có BOM; `events` bắt buộc có `from`, `to` cách nhau ≤ 92 ngày |

Công thức:
- **Capture rate** = số trận `PlayerCaptured` / số trận có outcome khác `Aborted` (lấy từ `stats.encounters`, nên tính cả
  trận không có lần re-plan nào).
- **Escape time** = `endedAt − startedAt` của các trận `PlayerEscaped`.
- **Coordination score**, độ trễ, tỉ lệ trong ngân sách, tỉ lệ fallback: trên từng lần re-plan (`coordination_results`).
- Vũ khí và lối chơi đọc từ `stats` của phiên đã kết thúc, không đếm event (event `shot_fired` bị game giới hạn tần suất).

CSV: số dùng dấu chấm thập phân, thời gian UTC ISO 8601. Ô **chữ** bắt đầu bằng `= + - @` được thêm `'` để Excel không chạy
như công thức; cột số giữ nguyên (ví dụ `-12.5`).

## Danh mục giá trị (`GET /api/meta/enums`)

Cần đăng nhập. Trả các giá trị hợp lệ để frontend làm dropdown và bộ lọc: thuật toán solver, family, outcome của phiên,
outcome của trận, source (`human` / `replay`).

## Dữ liệu cá nhân

- Game không gửi tên, email, tài khoản hay IP. Người chơi chỉ được nhận diện bằng `installId`: một GUID ngẫu nhiên game tự
  tạo lần đầu chạy, không gắn với danh tính nào.
- API không lưu IP. IP chỉ được dùng trong bộ nhớ để giới hạn tần suất request.
- Payload của event chỉ chứa dữ liệu gameplay (vị trí, vũ khí, kết quả...).
- Tài khoản web (Admin / Designer / Analyst) lưu username, email, họ tên và hash mật khẩu; không có đăng ký công khai.

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

Secret không commit lên git. Có hai cách đặt, chọn một.

**Cách 1: file `.env` (dễ chia sẻ trong nhóm).** Copy `.env.example` thành `.env` rồi điền giá trị thật, hoặc xin file
`.env` của người trong nhóm. Lúc khởi động, API tìm `.env` ở thư mục đang chạy rồi lần lượt lên các thư mục cha, nên file
có thể đặt ở `backend/shadowvale_be`, ở gốc repo, hoặc bên ngoài repo. Tên biến là key cấu hình với `:` viết thành `__`
(ví dụ `ConnectionStrings__Default`). Biến môi trường thật luôn được ưu tiên hơn `.env`, và `.env` được ưu tiên hơn
user-secrets. Chỉ gửi file này qua kênh riêng tư, không dán vào chat chung hay commit.

**Cách 2: user-secrets** (mỗi người tự đặt trên máy mình):

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
- Tài liệu API dạng file: `docs/openapi.json`, được sinh lại mỗi lần build (`Microsoft.Extensions.ApiDescription.Server`).
  Đổi API thì build rồi commit file này cùng code; CI báo lỗi nếu file không khớp.

### Dữ liệu demo (chỉ máy dev)

Để làm và demo dashboard trước khi game gửi dữ liệu thật, bật cờ rồi chạy API ở môi trường Development:

```bash
dotnet user-secrets set "Seed:DemoData" "true" --project ShadowVale.API
```

API sẽ tạo khoảng 300 phiên **giả** (cả `human` và `replay`), đánh dấu `client_version = "demo-seed"`, và một content version
demo đã publish (bundle dự phòng của game) nếu chưa từng có version nào được publish. Mỗi lần chạy, dữ liệu demo cũ bị xóa
rồi tạo lại. Seeder **từ chối chạy** nếu DB đã có phiên không phải demo, và cần có sẵn ít nhất một user.
Chỉ dùng trên Supabase project riêng cho dev. Số liệu là ngẫu nhiên, giống nhau cho mọi solver, **không phải kết quả nghiên cứu**.
Tắt cờ: `dotnet user-secrets remove "Seed:DemoData" --project ShadowVale.API`.

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
