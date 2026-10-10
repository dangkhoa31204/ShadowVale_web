# API integration coverage and gaps

Cập nhật 2026-10-10, hợp đồng BE dev commit **f2c8b8c**. Đã fast-forward nhánh
Khoa từ 7089d01 qua ba commit upstream; không sửa thêm BE, DB hay Unity.
Phần tích hợp và ghi chú do lượt làm FE này sửa thuộc frontend.

## Luồng Designer đã làm rõ và phần chưa triển khai

Designer nhận báo cáo Analyst → tạo content version Draft, chỉnh chỉ số →
đính kèm thay đổi source code/map/nhiệm vụ trên Git **nếu có** → tổng hợp một
gói gửi Admin → Admin xem toàn bộ gói và Reject/Approve. Approve vẫn tách
khỏi Publish theo workflow hiện có.

Git/ảnh/CI build không bắt buộc khi chỉ chỉnh chỉ số. Dữ liệu maps/quests sửa
qua CRUD hiện có không đồng nghĩa với thay đổi Unity scene/source code.
FE hiện kết nối phần content JSON; report/ảnh vẫn local. Chưa có API báo cáo
Analyst được gửi cho Designer và chưa có API gắn report/evidence vào snapshot
review trên server, nên **chưa đáp ứng toàn bộ luồng gói chung**. Analytics
aggregate/CSV không thay thế báo cáo do Analyst gửi. Không đánh dấu submit
content JSON là đã gửi cả report/ảnh/Git.

Hợp đồng cần BE bổ sung, điều kiện Git tùy chọn và bằng chứng source tại
[BE_HANDOFF.md](BE_HANDOFF.md), đặc biệt BE-06. Báo cáo/ảnh/tham chiếu source là
thành phần review; runtime JSON tải cho Unity vẫn giữ nguyên từ BE.

## Hợp đồng sau đồng bộ dev

OpenAPI vẫn có **81 operation**: Analytics 9, Auth 5, entity CRUD 35, versions 14,
Game 5, Meta 1, Solver 7, Users 5. Con số 72 trong kế hoạch ban đầu là đếm thiếu.

| Thay đổi BE dev | FE hiện tại |
| --- | --- |
| /api/content-versions thay /api/content/versions | Tất cả adapters content chuyển sang route mới. |
| GET version trả {version,bundle} | Metadata lấy từ version; Admin Full content lấy bundle từ response này. Editor vẫn nạp CRUD DTO để có resource GUID. |
| Compare /{sourceId}/compare?targetId=… | Render differences.path/before/after nguyên từ BE, có filter section. Version đầu dùng baseline rỗng. |
| Validate yêu cầu revision, trả errors và revision mới | Gửi revision đang xem, cập nhật metadata sau validate; submit dùng revision mới. |
| Submit/approve/reject/publish/rollback yêu cầu revision | Gửi revision BE, recheck trước quyết định. Reject dùng reviewNote, publish/rollback dùng reason. |
| Metadata PUT yêu cầu revision và schemaVersion | Gửi đúng revision sau các parent CRUD đã lưu, không dùng revision ban đầu của batch. |
| DELETE Draft yêu cầu revision và chỉ archive | Gửi DELETE body; loại archived chưa từng publish khỏi danh sách rollback. |
| List mặc định bỏ Archived | Tải thêm trang status=Archived và hợp nhất theo ID. |
| AuthoredById/reviewedById/publishedById thay user ref | Hiển thị tên tài khoản hiện tại nếu ID trùng; nếu không hiển thị ID, không bịa tên. |
| Publication history /api/content-publications chỉ Admin | Designer/Analyst không gọi endpoint này; UI history chỉ Admin. |
| Version metadata/detail/compare chỉ Admin/Designer | Analyst không gọi content endpoints; Analytics nhập version GUID thủ công. Versions page ghi rõ quyền BE còn thiếu. |
| Runtime bundle chính thức chuyển sang schema DB 1.0, 14 list | JSON tải nguyên văn từ BE. Editor import cùng shape không thay thế việc BE validate/checksum. |

Theo yêu cầu UI mới nhất (2026-10-10), Admin có **Dashboard**, **Review content**,
**Publish versions** và **Users**; mở
**Account → Analytics**. Cả ba role xem aggregate analytics và solver. Chỉ
Admin/Analyst được CRUD solver và xuất CSV. Admin không mở trang authoring.

## Đã kết nối

- Auth usernameOrEmail, /me, single-flight refresh, logout và đổi mật khẩu.
  Cặp access/refresh token lưu cùng nhau; Web Locks phối hợp tab remember-me.
  BroadcastChannel đồng bộ rotation/logout cho các tab có cùng sessionStorage
  được copy khi mở tab; session identity tách biệt các lần đăng nhập.
  API error không chuyển sang demo; validation hiện tại field; 403/409/429 giữ
  session và nội dung đang sửa.
- Bảy resource CRUD, giữ 14 tab: weapon/consumable thuộc item, entries thuộc
  loot table, placements/loot references thuộc map, ingredients thuộc recipe,
  rewards thuộc quest. Quan hệ bằng code, URL bằng GUID; map detail tải đủ.
- Save chỉ gửi parent đã đổi theo thứ tự phụ thuộc, gỡ references trước delete.
  Lỗi chỉ rõ phần đã lưu/phần còn lại; retry bỏ qua resource đã commit. Lỗi ở
  metadata cũng giữ nội dung và liệt kê resource đã lưu.
- Validate/submit/review/publish/rollback/history dùng BE; không mô phỏng status,
  revision hoặc checksum. Admin chỉ approve sau khi load diff, recheck revision.
  Reject và rollback yêu cầu lý do. Editor khóa sau submit.
- Rejected version chỉnh resource để BE tự trả về Draft, hoặc clone thành Draft
  mới. BE không cho metadata-only save/delete/validate khi còn Rejected; UI nêu lý do.
- JSON lấy nguyên response endpoint bundle; không serialize editor để giả runtime.
  Import editor JSON rebind GUID theo version hiện tại và khóa code/item type cũ.
- Analytics overview/funnel/weapons/playstyle, heatmap, version comparison cạnh
  nhau, AI comparison/scalability, chart p95 theo agent count và hộp thoại CSV.
  Date/version/map/solver/family/source Human/Replay là filter chung. Số liệu lấy
  aggregate BE, không tính lại từ demo events. Heatmap world X/Z, cell 1–50 m.
- Solver list/detail/create/edit/clone/active/delete. Form theo algorithm, sáu
  QUBO weights và số dùng slider + nhập tay. Used config chỉ rename; clone trước
  khi chỉnh params. New/clone inactive; A/B là nhãn đọc isAbArm BE.

## BE chưa hỗ trợ

| Tính năng | UI và phần BE cần thêm |
| --- | --- |
| Analyst gửi báo cáo cho Designer | Analytics đã có; thiếu lưu/gửi/list/detail báo cáo Analyst và liên kết vào Draft. Cần cho luồng mới làm rõ. |
| Gói review chung, report/evidence upload | Soạn/lưu/xuất local theo account/version. Cần API/ownership/storage và snapshot gắn contentVersionId/revision để Admin xem toàn bộ gói. Git/ảnh tùy chọn. |
| Git local / Git/CI team build | Branch/commit hiện là mô tả local. Gói review có thể đính kèm tham chiếu thủ công; tự động ingest manifest/build API là tích hợp có điều kiện, không chặn gói chỉ đổi chỉ số. |
| Bundle model/map scene/đồ họa/binary artifacts | Không publish qua content JSON. Cần Unity build pipeline, artifacts, checksum/platform compatibility/download manifest. |
| Skill progress | Chưa có aggregate API; không hiển thị số liệu suy đoán. |
| General settings | Không mở settings giả. |
| Sửa ai_settings | Chưa có authoring CRUD; không đưa vào resource editor. |
| Public password recovery/registration | Không mở flow công khai; chỉ đổi mật khẩu tài khoản đang đăng nhập. |

Báo cáo và ảnh ghi **Local draft — chưa đồng bộ server**, lưu browser theo
account/version. Cho save/export review package, khóa gửi report lên server.
Gửi gameplay content cho review vẫn độc lập. Admin không nhận local report như
dữ liệu server. Game changes/Game bundle hiển thị lý do thiếu API; không báo
upload/publish giả. Ảnh dẫn chứng không phải asset bundle cập nhật Unity.
Lưu local là hành vi hiện tại, không phải hoàn thành yêu cầu gói review chung.

## Lỗi BE/Unity phát hiện khi rà soát bàn giao

- **BE-01:** runtime JSON BE (schema_version string, version_no, 14 list phẳng)
  không khớp schema/loader Unity local (schema_version integer, bundle_version,
  quan hệ lồng). BE và Unity phải thống nhất contract; FE không chuyển đổi file
  tải hoặc checksum để che sự lệch này.
- **BE-02:** DELETE Draft chưa validate đổi status sang Archived, trong khi
  check constraint trong repo yêu cầu Archived có bundle/checksum. Draft mới
  có thể bị DB từ chối xóa nếu constraint đó đang được áp dụng.

Hai kết luận dựa trên source/schema, chưa tái hiện bằng BE và DB thật. Chi tiết
bằng chứng và điều kiện nghiệm thu ở [BE_HANDOFF.md](BE_HANDOFF.md).

## Giới hạn BE

| Giới hạn | Cách FE xử lý / phần còn lại |
| --- | --- |
| Không có bulk save atomic | Lưu resource tuần tự; report committed/remaining. Timeout sau commit có thể cần reload để đối chiếu. |
| Entity CRUD chưa nhận revision / If-Match của client | BE đã có EF concurrency token; FE preflight trước batch. Metadata/workflow đã nhận revision; entity writes vẫn có thể nhận dữ liệu từ client đã đọc bản cũ. |
| GET metadata + list resource không atomic snapshot | Có thể đổi khi đang đọc; cần BE snapshot/ETag nếu cần bảo đảm tuyệt đối. |
| Ownership trên authoring chưa gắn theo tác giả | FE chỉ cho Designer edit own drafts; cần thống nhất/enforce cùng quy tắc ở BE, hoặc đổi cả FE nếu chọn cộng tác Draft. Proposal không tự yêu cầu author-only. |
| Analyst không có version catalog, content detail/compare/history | Versions page ghi restriction; analytics nhập version GUID, không gọi endpoint cấm. |
| Analyst không có map catalog | Nhập map code; không gọi map entity endpoint. |
| OpenAPI thiếu response schemas của ServiceResult version controller | Generator FE đọc positional DTO từ ContentVersionDto.cs/AdminContentRequests.cs; BE nên bổ sung ProducesResponseType. |
| OpenAPI trùng authoring/analytics WeaponDto | Generator tạo AuthoringWeaponDto từ WeaponRequest, sửa ItemDto.weapon trong schema FE. BE nên dùng full-name schema IDs. |
| Version DTO chỉ có actor ID, thiếu display name | Tên current account hoặc ID; history Admin dùng actorUsername BE. |
| isAbArm suy ra từ active và algorithm | Quy tắc BE đã có, không thiếu setter; UI chỉ hiển thị, active PATCH theo rule BE. |
| Active solver cần cùng budget và sáu weights | Hiển thị rule và lỗi BE, không tự sửa config khác. |
| Single-use refresh rotation | Web Locks + atomic pair; BroadcastChannel cho sessionStorage copy giữa tab. Browser thiếu Web Locks/BroadcastChannel yêu cầu sign in lại khi cần refresh; không rotate token không được phối hợp. |

## User/role UI theo yêu cầu mới nhất

Admin có màn Users: list/detail/create/update/reset password. Không có DELETE user;
vô hiệu hóa tài khoản dùng PUT update. Trang Change password tách khỏi Profile,
mở từ menu Account và gọi /auth/me/password.
Xem USER_PROFILE_APPEARANCE.md về scope, ngôn ngữ, theme và kết quả UI QA.

## Dành cho Unity

/api/game/content/* và /api/game/sessions* dùng game policy. Không đặt
X-Game-Key trong FE, VITE env, localStorage hay request browser. Admin tải JSON
qua JWT user endpoint /api/content-versions/{id}/bundle.

## Checklist bổ sung từ ảnh

| Màn hình / hộp thoại | API trong checklist | UI |
| --- | --- | --- |
| Solver list/filter/active/A-B/usage/delete | S-01,S-06,S-07 | Có; Designer read-only, Admin/Analyst mutate. |
| Tạo/sửa/clone, params theo thuật toán, 6 weights | S-02…S-05 | Có; slider/manual, used config rename-only. |
| Dashboard cân bằng và filter chung | A-01,A-05,A-06,A-07 | Analytics → Overview. |
| Heatmap map/event/cell | A-04 | Có; map code nhập tay. |
| Hai version cạnh nhau | A-08 | Có, responsive; Analyst nhập GUID. |
| AI comparison và latency theo agents | A-09,A-10 | Có; source bắt buộc, chart giữ node bins riêng. |
| Dialog CSV dataset/time | A-12 | Có; Admin/Analyst, dùng filter chung. |

## Kiểm chứng và bàn giao

- 55 tests đạt (26 nền demo + 29 contract tests mới).
- Build TypeScript/Vite và lint đều đạt ở lần kiểm tra cuối sau adapter dev mới.
- Contract tests dùng Axios adapter + DTO fixtures, không chứng minh BE/DB hoạt động:
  refresh concurrent/tab lock, validation/403/409/429, pagination/Archived, nested
  parent requests, partial retry, metadata failure, revisions, compare values,
  workflow, raw JSON, CSV, local report isolation, role scope và solver routes.
- Browser QA dùng fixture in-memory API 127.0.0.1:15079 và FE 15173, explicit
  VITE_DEMO_MODE=false. Không gọi BE, không ghi DB. Đã chạy lại theo hợp đồng dev mới:
  - Designer sửa rifle damage 26 → 42, save (revision 2), validate (revision 3),
    submit (revision 4), editor khóa; Admin thấy đúng baseline 25 → 42, approve,
    publish có reason, tải JSON và View changes từ dòng Published.
  - Rollback có reason trả version đầu về Published; reject có reviewNote;
    Designer clone bản rejected rồi chuyển đúng vào Draft mới, và sửa resource
    của bản rejected để BE fixture trả lại Draft.
  - Lượt QA trước thay đổi Dashboard: Admin sidebar đúng 2 mục, Account → Analytics; overview, heatmap map/event,
    AI comparison/chart p95, hai cột version; CSV events hoàn tất qua dialog.
  - Solver used config chỉ name editable, rename/clone/edit clone/create Genetic/
    activate; Designer chỉ View, không có CSV/New/Clone/Edit; Analyst có manage
    và so sánh analytics bằng GUID, trang Versions ghi đúng hạn chế BE.
  - Report local: nhập description/commit, import JPG, save/reload giữ ảnh và
    nội dung, export review JSON có image; nút gửi server khóa. Account scope
    và không gọi HTTP report được kiểm tra bằng contract tests.
  - Ảnh [admin-review-qa.jpg](admin-review-qa.jpg) dùng dữ liệu fixture, không phải
    ảnh chứng minh BE/DB thật đã chạy.
  - Chưa kiểm tra thủ công UI delete solver/version, mọi nhánh lỗi upload/quota,
    đổi mật khẩu và refresh hai browser tab thật; các nhánh request đã có tests.
- **Chưa kiểm chứng BE thật/DB**: GET http://localhost:5079/health hai lần connection
  refused; không thấy process dotnet/ShadowVale.API ở lúc kiểm tra. Ảnh DB người
  dùng gửi cho thấy user tồn tại, nhưng HTTP BE chưa chạy/không truy cập được.
- Không khởi động BE trong lượt này vì startup seeder có thể ghi dữ liệu DB.
  Không chạy tools/SeedContent hoặc reset/seed DB; cập nhật từ dev là code Git.

Từ repo root, người dùng có thể chạy:
`dotnet run --project backend/shadowvale_be/ShadowVale.API --launch-profile http`.
BE mới hỗ trợ .env local; FE không đọc file này và không lưu connection string.
Kiểm tra /health trước, chạy npm run dev trong FE. Production cần proxy /api hoặc
VITE_API_BASE_URL đúng API URL và CORS phù hợp. VITE env chỉ là public config.

Live acceptance còn cần kiểm chứng: auth/refresh/password; Designer create/edit/
validate/submit; Admin compare/approve/reject/publish/rollback; checksum BE JSON;
solver active constraints/used rename-only; aggregate/CSV trên telemetry thật.
Không đánh dấu live pass từ unit tests hoặc fixture UI.

## Bảng đối chiếu toàn bộ operation

| # | Method | Endpoint | Role | FE function | State |
| --- | --- | --- | --- | --- | --- |
| 1 | GET | /api/analytics/overview | All | Analytics → overview | Connected |
| 2 | GET | /api/analytics/heatmap | All | Analytics → heatmap | Connected |
| 3 | GET | /api/analytics/funnel | All | Analytics → funnel | Connected |
| 4 | GET | /api/analytics/weapons | All | Analytics → weapons | Connected |
| 5 | GET | /api/analytics/playstyle | All | Analytics → playstyle | Connected |
| 6 | GET | /api/analytics/versions/compare | All | Analytics → versions / compare | Connected |
| 7 | GET | /api/analytics/ai/comparison | All | Analytics → ai / comparison | Connected |
| 8 | GET | /api/analytics/ai/scalability | All | Analytics → ai / scalability | Connected |
| 9 | GET | /api/analytics/export/{dataset} | Admin / Analyst | Analytics → export / {dataset} | Connected |
| 10 | POST | /api/auth/login | User / anonymous login | Login / session / Account password | Connected |
| 11 | POST | /api/auth/refresh | User / anonymous login | Login / session / Account password | Connected |
| 12 | POST | /api/auth/logout | User / anonymous login | Login / session / Account password | Connected |
| 13 | GET | /api/auth/me | User / anonymous login | Login / session / Account password | Connected |
| 14 | PUT | /api/auth/me/password | User / anonymous login | Login / session / Account password | Connected |
| 15 | GET | /api/content-versions/{versionId}/items | Admin / Designer | Items / Weapons / Consumables | Connected |
| 16 | POST | /api/content-versions/{versionId}/items | Admin / Designer | Items / Weapons / Consumables | Connected |
| 17 | GET | /api/content-versions/{versionId}/items/{id} | Admin / Designer | Items / Weapons / Consumables | Detail DTO covered by list; separate GET not used |
| 18 | PUT | /api/content-versions/{versionId}/items/{id} | Admin / Designer | Items / Weapons / Consumables | Connected |
| 19 | DELETE | /api/content-versions/{versionId}/items/{id} | Admin / Designer | Items / Weapons / Consumables | Connected |
| 20 | GET | /api/content-versions/{versionId}/skills | Admin / Designer | Skills | Connected |
| 21 | POST | /api/content-versions/{versionId}/skills | Admin / Designer | Skills | Connected |
| 22 | GET | /api/content-versions/{versionId}/skills/{id} | Admin / Designer | Skills | Detail DTO covered by list; separate GET not used |
| 23 | PUT | /api/content-versions/{versionId}/skills/{id} | Admin / Designer | Skills | Connected |
| 24 | DELETE | /api/content-versions/{versionId}/skills/{id} | Admin / Designer | Skills | Connected |
| 25 | GET | /api/content-versions/{versionId}/loot-tables | Admin / Designer | Loot tables / Loot entries | Connected |
| 26 | POST | /api/content-versions/{versionId}/loot-tables | Admin / Designer | Loot tables / Loot entries | Connected |
| 27 | GET | /api/content-versions/{versionId}/loot-tables/{id} | Admin / Designer | Loot tables / Loot entries | Detail DTO covered by list; separate GET not used |
| 28 | PUT | /api/content-versions/{versionId}/loot-tables/{id} | Admin / Designer | Loot tables / Loot entries | Connected |
| 29 | DELETE | /api/content-versions/{versionId}/loot-tables/{id} | Admin / Designer | Loot tables / Loot entries | Connected |
| 30 | GET | /api/content-versions/{versionId}/enemy-types | Admin / Designer | Enemy types | Connected |
| 31 | POST | /api/content-versions/{versionId}/enemy-types | Admin / Designer | Enemy types | Connected |
| 32 | GET | /api/content-versions/{versionId}/enemy-types/{id} | Admin / Designer | Enemy types | Detail DTO covered by list; separate GET not used |
| 33 | PUT | /api/content-versions/{versionId}/enemy-types/{id} | Admin / Designer | Enemy types | Connected |
| 34 | DELETE | /api/content-versions/{versionId}/enemy-types/{id} | Admin / Designer | Enemy types | Connected |
| 35 | GET | /api/content-versions/{versionId}/maps | Admin / Designer | Maps / Placements / Map loot | Connected |
| 36 | POST | /api/content-versions/{versionId}/maps | Admin / Designer | Maps / Placements / Map loot | Connected |
| 37 | GET | /api/content-versions/{versionId}/maps/{id} | Admin / Designer | Maps / Placements / Map loot | Connected |
| 38 | PUT | /api/content-versions/{versionId}/maps/{id} | Admin / Designer | Maps / Placements / Map loot | Connected |
| 39 | DELETE | /api/content-versions/{versionId}/maps/{id} | Admin / Designer | Maps / Placements / Map loot | Connected |
| 40 | GET | /api/content-versions/{versionId}/recipes | Admin / Designer | Recipes / Ingredients | Connected |
| 41 | POST | /api/content-versions/{versionId}/recipes | Admin / Designer | Recipes / Ingredients | Connected |
| 42 | GET | /api/content-versions/{versionId}/recipes/{id} | Admin / Designer | Recipes / Ingredients | Detail DTO covered by list; separate GET not used |
| 43 | PUT | /api/content-versions/{versionId}/recipes/{id} | Admin / Designer | Recipes / Ingredients | Connected |
| 44 | DELETE | /api/content-versions/{versionId}/recipes/{id} | Admin / Designer | Recipes / Ingredients | Connected |
| 45 | GET | /api/content-versions/{versionId}/quests | Admin / Designer | Quests / Rewards | Connected |
| 46 | POST | /api/content-versions/{versionId}/quests | Admin / Designer | Quests / Rewards | Connected |
| 47 | GET | /api/content-versions/{versionId}/quests/{id} | Admin / Designer | Quests / Rewards | Detail DTO covered by list; separate GET not used |
| 48 | PUT | /api/content-versions/{versionId}/quests/{id} | Admin / Designer | Quests / Rewards | Connected |
| 49 | DELETE | /api/content-versions/{versionId}/quests/{id} | Admin / Designer | Quests / Rewards | Connected |
| 50 | GET | /api/content-versions | Admin / Designer | Version metadata / full bundle / Overview | Connected |
| 51 | POST | /api/content-versions | Admin / Designer (Designer UI) | Content authoring → create/update/archive draft | Connected |
| 52 | GET | /api/content-versions/{id} | Admin / Designer | Version metadata / full bundle / Overview | Connected |
| 53 | PUT | /api/content-versions/{id} | Admin / Designer (Designer UI) | Content authoring → create/update/archive draft | Connected |
| 54 | DELETE | /api/content-versions/{id} | Admin / Designer (Designer UI) | Content authoring → create/update/archive draft | Connected |
| 55 | GET | /api/content-versions/{id}/compare | Admin / Designer | View changes / Compare versions | Connected, BE before/after |
| 56 | POST | /api/content-versions/{id}/validate | Admin / Designer (Designer UI) | Content authoring → validate/submit | Connected, revision |
| 57 | POST | /api/content-versions/{id}/submit | Admin / Designer (Designer UI) | Content authoring → validate/submit | Connected, revision |
| 58 | POST | /api/content-versions/{id}/approve | Admin | Review content → approve/reject | Connected, revision/reviewNote |
| 59 | POST | /api/content-versions/{id}/reject | Admin | Review content → approve/reject | Connected, revision/reviewNote |
| 60 | POST | /api/content-versions/{id}/publish | Admin | Publish versions → publish/rollback | Connected, revision/reason |
| 61 | POST | /api/content-versions/{id}/rollback | Admin | Publish versions → publish/rollback | Connected, revision/reason |
| 62 | GET | /api/content-versions/{id}/bundle | Admin / Designer | Versions → JSON | Connected, raw bytes |
| 63 | GET | /api/content-publications | Admin | Publish versions → Publication history | Connected |
| 64 | GET | /api/game/content/manifest | Unity | Không gọi FE | Unity only |
| 65 | GET | /api/game/content/bundle | Unity | Không gọi FE | Unity only |
| 66 | GET | /api/game/content/versions/{versionId}/bundle | Unity | Không gọi FE | Unity only |
| 67 | POST | /api/game/sessions | Unity | Không gọi FE | Unity only |
| 68 | PUT | /api/game/sessions/{sessionId} | Unity | Không gọi FE | Unity only |
| 69 | GET | /api/meta/enums | All | Dropdowns editor/analytics/solver | Connected |
| 70 | GET | /api/solver-configurations | All | Analytics → Solver configurations | Connected |
| 71 | POST | /api/solver-configurations | Admin / Analyst | Analytics → Solver configurations | Connected |
| 72 | GET | /api/solver-configurations/{id} | All | Analytics → Solver configurations | Connected |
| 73 | PUT | /api/solver-configurations/{id} | Admin / Analyst | Analytics → Solver configurations | Connected |
| 74 | DELETE | /api/solver-configurations/{id} | Admin / Analyst | Analytics → Solver configurations | Connected |
| 75 | POST | /api/solver-configurations/{id}/clone | Admin / Analyst | Analytics → Solver configurations | Connected |
| 76 | PATCH | /api/solver-configurations/{id}/active | Admin / Analyst | Analytics → Solver configurations | Connected |
| 77 | GET | /api/users | Admin | Users UI | Connected |
| 78 | POST | /api/users | Admin | Users UI | Connected |
| 79 | GET | /api/users/{id} | Admin | Users UI | Connected |
| 80 | PUT | /api/users/{id} | Admin | Users UI | Connected |
| 81 | PUT | /api/users/{id}/password | Admin | Users UI | Connected |
