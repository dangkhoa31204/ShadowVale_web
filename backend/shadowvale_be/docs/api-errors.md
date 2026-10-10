# Danh sách lỗi API dùng cho FE và kiểm thử Scalar

Lỗi HTTP trả `application/problem+json`: `status`, `title`, `detail`, `instance`, `code`, `message`, `traceId`; lỗi nhập liệu có thêm `errors` theo trường. Dùng `status` và `code` để xử lý, `errors` để hiển thị cạnh input, `traceId` để tra log. Không dùng nội dung thông báo làm điều kiện xử lý.

```json
{
  "status": 400,
  "title": "Validation failed",
  "detail": "Please check the submitted fields.",
  "instance": "/api/users",
  "code": "VALIDATION_FAILED",
  "message": "Please check the submitted fields.",
  "traceId": "request-trace-id",
  "errors": { "Email": ["The Email field is not a valid e-mail address."] }
}
```

## Lỗi chung

- `400 VALIDATION_FAILED`: thiếu body/trường bắt buộc, JSON sai cú pháp, sai kiểu, enum không hợp lệ, vượt độ dài/khoảng giá trị, vi phạm quy tắc nghiệp vụ. Xem `errors`.
- `401 UNAUTHORIZED`: thiếu/sai/hết hạn/đã thu hồi Bearer token; game dùng `X-Game-Key`. Access token của phiên đã logout không sử dụng được nữa.
- `403 FORBIDDEN`: đăng nhập hợp lệ nhưng thiếu quyền của endpoint.
- `404 NOT_FOUND`: route hoặc bản ghi không tồn tại. GUID sai định dạng trong route `{id:guid}` trả 404 vì không khớp route; GUID sai trong query/body trả 400.
- `405 METHOD_NOT_ALLOWED`: gọi sai HTTP method, xem header `Allow`.
- `409 CONFLICT`: trùng dữ liệu, bị tham chiếu, sai trạng thái hoặc revision cũ.
- `413 PAYLOAD_TOO_LARGE`: body vượt giới hạn endpoint/server/proxy.
- `415 UNSUPPORTED_MEDIA_TYPE`: Content-Type không được hỗ trợ; body JSON dùng `application/json`.
- `429 RATE_LIMITED`: vượt giới hạn gọi login/refresh hoặc game; chờ trước khi thử lại.
- `500 INTERNAL_ERROR`: lỗi bất ngờ phía server; trả thông báo chung và traceId, không trả stack trace, SQL hay thông tin kết nối.

Các mã riêng trong Auth/ContentVersions được giữ nguyên. Lỗi framework chung áp dụng khi điều kiện tương ứng xảy ra, không có nghĩa mọi endpoint đều có đủ các lỗi trên. 401/403 chỉ áp dụng endpoint có xác thực/phân quyền. GET không có body không có lỗi nhập body JSON thông thường.

## Auth

- `POST /api/auth/login`: 400 thiếu username/email hoặc password; 401 `INVALID_CREDENTIALS` sai tài khoản/mật khẩu; 403 `ACCOUNT_DEACTIVATED` tài khoản bị khóa; 429 vượt giới hạn.
- `POST /api/auth/refresh`: 400 thiếu refreshToken; 401 token không tồn tại, hết hạn, bị thu hồi hoặc tái sử dụng; 429 vượt giới hạn. Sau rotation phải dùng cặp token mới.
- `POST /api/auth/logout`: 400 thiếu refreshToken. Token không tồn tại/đã thu hồi vẫn có thể trả 204 để logout lặp lại an toàn; không coi đây là lỗi.
- `GET /api/auth/me`: 401 phiên không hợp lệ; 404 nếu tài khoản không còn tồn tại tại thời điểm đọc.
- `PUT /api/auth/me/password`: 400 thiếu/sai currentPassword hoặc newPassword không đạt giới hạn; 404 tài khoản không tồn tại; đổi mật khẩu thu hồi các phiên.

## Users (ADMIN)

- `GET /api/users`: 400 role không hợp lệ, page/pageSize ngoài giới hạn (page 1–1.000.000, pageSize 1–100).
- `GET /api/users/{id}`: 404 user không tồn tại.
- `POST /api/users`: 400 username/email/password/role không hợp lệ; username 3–50 ký tự đúng pattern, password 8–128; 409 username/email trùng.
- `PUT /api/users/{id}`: 400 email/role không hợp lệ hoặc thiếu isActive; 404 user không tồn tại; 409 email trùng, tự hạ quyền hoặc tự khóa tài khoản Admin hiện tại.
- `PUT /api/users/{id}/password`: 400 password thiếu hoặc ngoài 8–128 ký tự; 404 user không tồn tại.

## Content versions

Các endpoint đọc/chỉnh Draft dùng Admin hoặc Designer; approve/reject/publish/rollback và lịch sử publication chỉ Admin. Revision phải lấy từ response mới nhất sau mỗi thao tác.

- `GET /api/content-versions`: 400 search quá dài, status sai, phân trang sai.
- `GET /api/content-versions/{id}`: 404 `CONTENT_VERSION_NOT_FOUND`.
- `POST /api/content-versions`: 400 label/schemaVersion không hợp lệ; 404 parentVersionId không tồn tại khi clone.
- `GET /api/content-versions/{id}/compare`: 400 thiếu/sai targetId; 404 version nguồn hoặc đích không tồn tại.
- `PUT /api/content-versions/{id}`: 400 metadata/revision không hợp lệ; 404 version không tồn tại; 409 `CONTENT_VERSION_NOT_DRAFT` hoặc `CONTENT_VERSION_CHANGED`.
- `DELETE /api/content-versions/{id}`: 400 thiếu/sai revision trong body; 404 không tồn tại; 409 không phải Draft hoặc revision cũ.
- `POST /api/content-versions/{id}/validate`: 400 request/revision sai; 404 không tồn tại; 409 không phải Draft/revision cũ. Bundle không hợp lệ trả **200 với isValid=false và errors**, sửa các path được báo rồi validate lại.
- `POST /api/content-versions/{id}/submit`: 400 thiếu bundle/checksum đã validate hoặc `CONTENT_BUNDLE_INVALID`; 404 không tồn tại; 409 `CONTENT_VERSION_INVALID_STATUS` (cần Draft) hoặc `CONTENT_VERSION_CHANGED`.
- `POST /api/content-versions/{id}/approve`: 400 reviewNote quá dài/request sai hoặc bundle không hợp lệ; 404 không tồn tại; 409 cần InReview hoặc revision đã thay đổi. reviewNote có thể bỏ trống khi approve.
- `POST /api/content-versions/{id}/reject`: 400 reviewNote thiếu/trống/quá dài; 404 không tồn tại; 409 cần InReview hoặc revision cũ.
- `POST /api/content-versions/{id}/publish`: 400 reason thiếu/quá dài hoặc bundle không hợp lệ; 404 không tồn tại; 409 cần Approved, revision cũ hoặc `CONTENT_VERSION_NOT_REVIEWED`.
- `POST /api/content-versions/{id}/rollback`: 400 reason/revision/request sai hoặc bundle không hợp lệ; 404 không tồn tại; 409 cần Archived, revision cũ hoặc `CONTENT_VERSION_NEVER_PUBLISHED`.
- `GET /api/content-versions/{id}/bundle`: 404 không tồn tại; 409 `CONTENT_VERSION_NOT_VALIDATED` (validate lại sau chỉnh sửa).
- `GET /api/content-publications`: 400 contentVersionId/query/phân trang sai. Không có lịch sử khớp bộ lọc trả danh sách rỗng.

## Chỉnh nội dung trong version (ADMIN, DESIGNER)

Mỗi resource dưới đây có đủ năm endpoint. Áp dụng riêng cho từng resource `items`, `skills`, `loot-tables`, `enemy-types`, `maps`, `recipes`, `quests`:

- `GET /api/content-versions/{versionId}/{resource}`: 404 version không tồn tại.
- `GET /api/content-versions/{versionId}/{resource}/{id}`: 404 version/bản ghi không tồn tại trong version đó.
- `POST /api/content-versions/{versionId}/{resource}`: 400 các quy tắc input dưới đây; 404 version không tồn tại; 409 code trùng hoặc version không mở để chỉnh.
- `PUT /api/content-versions/{versionId}/{resource}/{id}`: 400 input sai; 404 version/bản ghi không tồn tại; 409 code trùng hoặc version không mở để chỉnh.
- `DELETE /api/content-versions/{versionId}/{resource}/{id}`: 404 version/bản ghi không tồn tại; 409 bản ghi đang bị tham chiếu hoặc version không mở để chỉnh.

Version mở để chỉnh là Draft hoặc Rejected; chỉnh Rejected chuyển về Draft. Chỉnh nội dung làm tăng revision và xóa kết quả validate cũ.

Các trường hợp nhập sai cần kiểm tra theo resource:

- Tất cả: code sai pattern `^[a-z][a-z0-9_]*$`/quá 64 ký tự, tên thiếu/quá dài, enum/giá trị số sai. Tham chiếu code phải thuộc cùng version.
- `items`: type/rarity sai, stack/weight/value ngoài khoảng; thiếu/sai subtype weapon hoặc consumable so với item type; weapon phải có stack 1. Melee không dùng ammo/magazine/reload; ranged cần ammo đúng loại và thông số magazine/reload. Damage, fire rate, range, durability và các chỉ số phải trong giới hạn DTO. JSON thuộc tính phải đúng cấu trúc.
- `skills`: maxLevel ngoài 1–100, xpCurve sai cấu trúc hoặc giá trị âm, category/stat không hợp lệ.
- `loot-tables`: rollsMin lớn hơn rollsMax, thiếu entries, quantity min lớn hơn max, weight/chance sai hoặc itemCode không hợp lệ.
- `enemy-types`: thông số/enum enemy sai, loot-table/skill tham chiếu sai; dữ liệu JSON sai cấu trúc.
- `maps`: thông số map, danh sách loot/enemy placements hoặc tham chiếu enemy/loot-table sai; tọa độ và dữ liệu JSON phải hợp lệ.
- `recipes`: output item/quantity, ingredients/itemCode/quantity hoặc điều kiện craft không hợp lệ.
- `quests`: loại/mục tiêu/điều kiện/rewards không hợp lệ, tham chiếu item/map/quest/skill sai.

Các giới hạn cụ thể từng field được thể hiện trong schema request của Scalar; `errors` từ service xác định chính xác field sai. Validate bundle kiểm tra thêm quy tắc toàn bộ snapshot, ví dụ Safe Camp và liên kết giữa các resource.

## Solver configurations

Đọc: Admin/Analyst/Designer. Ghi: Admin/Analyst.

- `GET /api/solver-configurations`: 400 filter enum/kiểu dữ liệu sai.
- `GET /api/solver-configurations/{id}`: 404 không tồn tại.
- `POST /api/solver-configurations`: 400 code/name/family/parameters/time budget/QUBO weights không hợp lệ; 409 code trùng.
- `PUT /api/solver-configurations/{id}`: 400 thông số sai; 404 không tồn tại; 409 sửa cấu hình đã có sessions/results (chỉ đổi tên được), hoặc cấu hình active không tương thích timeBudgetMs/quboWeights với nhóm active.
- `POST /api/solver-configurations/{id}/clone`: 400 code/name mới không hợp lệ; 404 nguồn không tồn tại; 409 code trùng.
- `PATCH /api/solver-configurations/{id}/active`: 400 body sai; 404 không tồn tại; 409 timeBudgetMs/quboWeights không khớp các cấu hình active để so sánh công bằng.
- `DELETE /api/solver-configurations/{id}`: 404 không tồn tại; 409 đã có sessions/results; dùng deactivate thay vì xóa.

## Analytics

Đọc: Admin/Analyst/Designer; export: Admin/Analyst. Query source phải human/replay, family hợp lệ, from không sau to và khoảng ngày trong giới hạn service.

- `GET /api/analytics/overview`: 400 bộ lọc sai.
- `GET /api/analytics/heatmap`: 400 bộ lọc/cellSize/eventTypes sai.
- `GET /api/analytics/funnel`: 400 bộ lọc sai.
- `GET /api/analytics/weapons`: 400 bộ lọc sai.
- `GET /api/analytics/playstyle`: 400 bộ lọc sai.
- `GET /api/analytics/versions/compare`: 400 thiếu a/b hoặc GUID rỗng/sai định dạng; 404 một trong hai version không tồn tại.
- `GET /api/analytics/ai/comparison`: 400 source bắt buộc hoặc bộ lọc sai.
- `GET /api/analytics/ai/scalability`: 400 source bắt buộc hoặc bộ lọc sai.
- `GET /api/analytics/export/{dataset}`: 404 dataset không thuộc sessions/events/encounters/coordination-results; 400 bộ lọc sai, export events thiếu from/to hoặc vượt 92 ngày. Thành công trả CSV; lỗi trước khi bắt đầu streaming trả JSON.

## Game (X-Game-Key)

- `GET /api/game/content/manifest`: 404 nếu không có nội dung publish theo quy tắc service.
- `GET /api/game/content/bundle`: 404 không có bundle publish. 304 với ETag khớp là thành công và không có body.
- `GET /api/game/content/versions/{versionId}/bundle`: 404 version/bundle không tồn tại hoặc không được cung cấp cho game.
- `POST /api/game/sessions`: 400 sessionId/installId/source/platform/startedAt sai; human không được chọn requestedVariant, replay cần requestedVariant. Tham chiếu content/solver không hợp lệ theo service trả 404/409.
- `PUT /api/game/sessions/{sessionId}`: 400 installId/source/outcome/thời gian/stats sai, counter âm, ID rỗng/trùng, batch chứa null hoặc vượt số lượng cho phép; 404 session/tham chiếu không tồn tại; 409 upload mâu thuẫn session đã lưu; 413 body vượt 2 MiB. Xem response để biết các telemetry entries được chấp nhận/bỏ qua; không phải mọi entry không hợp lệ đều làm cả batch thất bại.

## Meta và vận hành

- `GET /api/meta/enums`: cần đăng nhập; không có body/query nghiệp vụ cần validate.
- `/health`: endpoint vận hành dùng health-check writer mặc định, không phải API nghiệp vụ; không nằm trong hợp đồng ProblemDetails của controllers.

## Scalar và debugger

Restart API sau khi cập nhật rồi Send lại request trong Scalar; response cũ trong UI không tự thay đổi. Scalar hiển thị JSON lỗi và các response lỗi trong OpenAPI.

Middleware xử lý exception **trong request**. Nếu Visual Studio bật dừng ngay khi exception được ném, mở Debug → Windows → Exception Settings và bỏ lựa chọn Break When Thrown cho exception nghiệp vụ hoặc Common Language Runtime Exceptions phù hợp; có thể chạy Ctrl+F5 để kiểm tra response mà không attach debugger. Việc debugger dừng không có nghĩa exception chưa được middleware xử lý.

Lỗi cấu hình khi khởi động (ví dụ thiếu Game:ApiKeys/Jwt:Key) xảy ra trước khi HTTP server chạy, nên phải sửa cấu hình; Scalar chưa thể nhận JSON. Client ngắt kết nối, proxy từ chối request trước khi đến app, hoặc CSV đã bắt đầu streaming cũng không thể bảo đảm đổi response thành JSON. Chi tiết lỗi nội bộ được ghi vào log server.
