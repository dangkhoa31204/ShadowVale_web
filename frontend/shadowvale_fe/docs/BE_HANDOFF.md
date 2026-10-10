# Ghi chú bàn giao cho BE — phạm vi đã chốt

Đối chiếu ngày 2026-10-10 với BE dev **f2c8b8c**, proposal, yêu cầu trực tiếp
của người dùng và Unity local. Đây là ghi chú; không sửa BE, DB hay Unity.

FE giữ thiết kế cũ/bố cục mới; theo yêu cầu UI mới nhất, Admin có Dashboard,
Review content và Publish versions,
Analytics ở menu tài khoản. Cả ba role xem Analytics/solver; Admin và Analyst
được quản lý solver/xuất CSV. Báo cáo ảnh trong FE hiện vẫn lưu/xuất local;
đó là giới hạn triển khai hiện tại, chưa đáp ứng luồng gửi gói chung mới làm rõ.

## 0. Luồng Designer đã làm rõ — Git chỉ kèm nếu có

1. Designer đăng nhập và xem báo cáo của Analyst để xác định nội dung cần sửa.
2. Tạo một content version Draft và chỉnh các chỉ số/dữ liệu gameplay.
3. **Nếu có** thay đổi source code, map/scene hoặc tuyến nhiệm vụ trên Git,
   đính kèm tham chiếu commit và báo cáo thay đổi, mô tả, ảnh dẫn chứng.
   Source code được sửa trong repo; web dùng phần này để tổng hợp và review.
4. Gửi **một gói review** gồm content đã validate, báo cáo Analyst liên quan
   và báo cáo thay đổi Git/ảnh nếu có, cùng contentVersionId và revision.
5. Admin xem diff chỉ số trước–sau và phần đính kèm, rồi Reject hoặc Approve.
   Reject có lý do và Designer sửa/gửi lại; Approve chuyển sang bước Publish
   riêng đã có, không tự publish ngay khi duyệt.

**Không bắt buộc Git:** bundle chỉ chỉnh chỉ số vẫn validate/submit/approve/
publish được. Không yêu cầu branch, commit, ảnh, CI build hoặc pipeline asset
cho trường hợp này. Quests/maps dạng dữ liệu chỉnh qua CRUD hiện có cũng
không tự được coi là thay đổi source code trên Git.

| Thành phần trong gói review | Bắt buộc hay có điều kiện | BE hiện tại |
| --- | --- | --- |
| Content version và thay đổi chỉ số/dữ liệu | Thành phần chính của Draft | CRUD, validate, submit, diff và review đã có. |
| Báo cáo Analyst để Designer nhận/xem | Theo luồng đã làm rõ | Có analytics aggregate/CSV, chưa có báo cáo do Analyst lưu và gửi để Designer nhận. |
| Báo cáo thay đổi Git, ảnh dẫn chứng | Chỉ khi có phần thay đổi đó; ảnh là tùy chọn | FE local, chưa có API lưu/đọc chung với gói review. |
| Git/CI build hoặc binary artifacts | Khi cần phát hành thay đổi code/scene/model/graphics thực tế | Chưa có tích hợp build/artifact. Không chặn gói chỉ đổi chỉ số. |

### BE-06 — Báo cáo Analyst và gói review chung cần được lưu trên server

Đây là phần còn thiếu để thực hiện luồng mới, không còn là một tính năng
chỉ lưu local khi cần Admin thực sự xem chung gói đã gửi.

**Hợp đồng tối thiểu cần thống nhất:**

- Analyst tạo/lưu/gửi báo cáo; Designer có danh sách và chi tiết báo cáo đã gửi.
  Báo cáo có tác giả, tiêu đề, nhận xét/đề xuất và phạm vi dữ liệu dùng để phân
  tích (version/map/khoảng thời gian khi có). Báo cáo nháp không tự xuất hiện
  như báo cáo đã gửi. Các API analytics hiện có vẫn là nguồn số liệu.
- Draft liên kết báo cáo Analyst được dùng và lưu báo cáo thay đổi kèm ảnh;
  phần Git là tùy chọn. Khi có, lưu repo/commit cố định, mô tả và file/scene
  liên quan; branch chỉ là thông tin phụ vì branch có thể thay đổi.
- Admin đọc toàn bộ gói bằng contentVersionId. Mở rộng workflow hiện có để
  submit ghi nhận cùng revision và snapshot báo cáo/ảnh/tham chiếu đã gửi;
  không tạo một workflow approve/reject riêng cho Git.
- Gói đang chờ duyệt phải giữ nguyên nội dung đã gửi. Reject giữ snapshot
  và lý do; lần sửa/gửi lại có revision/snapshot mới để truy vết. Quyền đọc/
  sửa báo cáo, quyền ảnh và ownership thống nhất với BE-03.
- Submit thất bại nếu thành phần được chọn để đính kèm chưa lưu được. Với
  trường hợp không có Git, không validate Git/build/evidence như field bắt buộc.

Không cần tự động đọc repo local, webhook Git/CI hay editor code trên web để
hoàn thành bước tổng hợp/review ban đầu: có thể nhập commit và báo cáo thủ công.
Không đưa report/ảnh/source code vào runtime JSON mà Unity đang đọc; đó là
metadata/attachments của gói review, gắn cùng content version được duyệt.

**Nghiệm thu:** Analyst gửi báo cáo → Designer nhận đúng báo cáo → tạo Draft
chỉ đổi chỉ số → gửi một gói → Admin xem đúng diff và báo cáo → Reject rồi
sửa/gửi lại, hoặc Approve. Lặp lại với Git commit và ảnh đính kèm; đổi branch
hay report sau khi gửi không làm thay đổi snapshot Admin đã duyệt. Không có
Git/ảnh/build vẫn gửi được gói chỉ chỉnh chỉ số.

## 1. Hai lỗi cần xử lý trước khi nghiệm thu luồng đầy đủ

### BE-01 — Hợp đồng bundle BE và Unity chưa tương thích

**Bằng chứng source:**
- BE: `ShadowVale.BLL/Services/ContentBundleBuilder.cs`,
  `ShadowVale.BLL/Schemas/content-bundle-1.0.schema.json`.
- Unity: `Assets/StreamingAssets/Content/content.schema.json`,
  `Assets/_Project/Scripts/Data/Content/ContentBundle.cs`,
  `Assets/_Project/Scripts/Content/SchemaValidator.cs`.

| | BE đang publish | Unity đang đọc |
| --- | --- | --- |
| Version | version_no (số) | bundle_version (chuỗi semver) |
| Schema | schema_version: "1.0" | schema_version: 1 (integer) |
| Item identity | code/name/item_type | id/display_name/category |
| Enemy collection | enemy_types | enemy_archetypes |
| Recipe collection | crafting_recipes + ingredients riêng | craft_recipes + inputs lồng |
| Quan hệ/dữ liệu con | 14 danh sách phẳng | entries/spawn groups/loot placements… lồng |
| AI settings | builder hiện không xuất ai_settings | root ai_settings trong schema Unity |

**Yêu cầu:** BE và Unity chốt một runtime contract có version rõ ràng. Nếu giữ
Unity hiện tại, BE cần xuất runtime phù hợp; nếu chọn schema mới, phía Unity
phải cập nhật loader/validator. Không chỉ đổi tên vài field vì quan hệ và hình
dạng dữ liệu cũng khác. Không chuyển đổi bundle trong FE: file tải phải đúng
bản BE validate/seal, checksum và game manifest phải cùng bản.

**Nghiệm thu:** JSON thực tế sau publish parse và validate được trong Unity,
load đúng items/weapons/maps/enemies/recipes/quests; checksum của manifest
khớp bytes bundle; rollback vẫn tải được phiên bản từng publish.
Kiểm tra AJV tĩnh với mẫu flat hiện tại thất bại trên schema Unity. Chưa có
kiểm thử publish BE thật → Unity thật.

### BE-02 — DELETE Draft chưa validate mâu thuẫn với check constraint

**Bằng chứng:**
- `ContentVersionService.DeleteAsync` đổi Draft sang Archived, không tạo bundle.
- `ContentVersionConfiguration.cs` và migration
  `20261008175804_ContentAndTelemetry.cs` có constraint
  `status NOT IN ('Published','Archived') OR (bundle IS NOT NULL AND bundle_checksum IS NOT NULL)`.

Draft vừa tạo chưa validate có bundle/checksum null. Nếu DB áp dụng constraint
trong repo, thao tác này bị DB từ chối. Đây là mâu thuẫn source/schema, chưa
tái hiện trên DB thật.

**Yêu cầu:** soft-delete Draft được phép khi chưa validate; vẫn giữ ràng buộc
bundle/checksum cho Published và Archived đã từng publish. Không cho rollback
Draft đã bị xóa. Không cần thêm endpoint delete mới hay tự publish/validate
một Draft chỉ để xóa.

**Nghiệm thu:** tạo Draft → DELETE với revision đúng trả 204; stale revision trả
409; Archived chưa từng publish không rollback được; phiên bản đã publish
vẫn phải giữ bundle/checksum.

## 2. Ba điểm cần đồng bộ hợp đồng/quy tắc với FE

### BE-03 — Quy tắc tác giả phải thống nhất ở server

FE hiện cho Designer sửa Draft/Rejected của chính mình; BE authoring chỉ kiểm
tra role và status, các mutation không nhận actor để đối chiếu AuthoredById.
Cần thống nhất và enforce quy tắc đang áp dụng, bao gồm entity CRUD, sửa/xóa
metadata, validate và submit. Nếu sản phẩm chọn cộng tác cùng Draft, phải chốt
lại FE và quyền BE cùng nhau; proposal không tự quy định chỉ tác giả được sửa.

Admin vẫn cần đọc nội dung để review; quyền quản lý solver của Admin/Analyst là
quyền riêng. Không suy ra việc mở thêm authoring/user management trên UI Admin.

**Nghiệm thu:** dùng hai Designer khác nhau kiểm tra trực tiếp API; kết quả
đúng quy tắc đã thống nhất, không chỉ dựa vào nút ẩn/khóa trên FE.

### BE-04 — Entity CRUD cần nhận revision mà client đã xem

Metadata/workflow đã nhận revision. Bảy resource CRUD hiện chưa nhận revision
của client (kể cả DELETE). BE **đã có** EF concurrency token trên
ContentVersion.Revision, nên không yêu cầu xây lại cơ chế này. Tuy nhiên,
request mang dữ liệu cũ đến sau khi request khác đã lưu xong có thể được BE đọc
revision mới rồi chấp nhận, ghi đè thay đổi.

**Yêu cầu:** kiểm tra revision/If-Match của client tại thời điểm ghi, dùng cơ
chế concurrency sẵn có; xung đột trả 409. FE sẽ gửi revision mới sau mỗi lần
resource lưu thành công. Không yêu cầu đồng thời thêm cả revision và ETag.

**Nghiệm thu:** hai tab cùng đọc revision R; tab 1 lưu thành R+1; tab 2 gửi
dữ liệu từ R phải bị từ chối; không mất thay đổi tab 1.

### BE-05 — OpenAPI phải phản ánh DTO thực

File `docs/openapi.json` hiện thiếu schemas ContentVersionDto,
ContentVersionDetailsDto, ContentComparisonDto, ContentValidationResultDto và
ContentPublicationDto. Hai class WeaponDto authoring/analytics bị dùng chung
schema ID; ItemDto.weapon đang trỏ tới weapon/shots/kills thay vì stats.

**Yêu cầu:** sửa khai báo response/schema ID để schema của từng DTO đúng và
không trùng, rồi sinh lại OpenAPI. Giữ rõ required/nullable, enum, numeric bounds
và ProblemDetails. FE đang có workaround đọc DTO C# và tách AuthoringWeaponDto;
khi OpenAPI sửa xong phải bỏ workaround tương ứng, không thêm API bù.

**Nghiệm thu:** sinh TypeScript chỉ từ OpenAPI đủ toàn bộ operation và DTO;
ItemDto.weapon có class/damage/fireRate…, còn analytics WeaponDto giữ số liệu.

## 3. Cải thiện tiện dụng, không chặn FE hiện tại

| Mục | Đề nghị tối thiểu | Hiện tại |
| --- | --- | --- |
| Catalog cho Analyst | Lookup version id/versionNo/label/status/publishedAt và map code/name theo version; chỉ metadata cần lọc Analytics | Analyst nhập GUID/map code. Không cần cấp quyền đọc runtime bundle hay CRUD content. |
| Tên tác giả/người duyệt/publish | Bổ sung display name/username bên cạnh ID trong Version DTO | FE hiển thị ID khi không phải tài khoản hiện tại. Không cần mở user directory. |
| Save nhiều resource/snapshot đọc | Cân nhắc một transaction có revision nếu muốn toàn bộ Save draft thành công/thất bại cùng nhau | FE đã lưu tuần tự, báo saved/remaining và giữ phần chưa lưu. Đây là nâng cấp, không bắt buộc thêm ngay. |

## 4. Tích hợp phát hành có điều kiện và các mục ngoài phạm vi

Không yêu cầu các mục dưới đây cho mọi Draft. Báo cáo Analyst và gói review
chung đã chuyển thành phần cần bổ sung tại BE-06; không xếp chúng vào mục này.

- **Nhận Git local / Git-CI build, publish model/graphics/Unity scenes:** khi
  triển khai cập nhật asset, cần ingest build manifest + artifacts, commit/source,
  platform/client compatibility, file size/hash/download URL; gắn cùng content
  version đã duyệt. Chỉ đính kèm commit/báo cáo để review không bắt buộc tự động
  ingest Git/CI. Khi phát hành thay đổi source code C#, phải có client build/
  cơ chế cập nhật tương ứng; runtime JSON không tự cập nhật executable code.
  Đây là tích hợp BE + CI + Unity. API manifest/bundle **JSON**
  hiện đã có, chỉ cần mở rộng hợp đồng cho binary; Git push không tự chuyển
  model/texture/scene thành content JSON. Không cần một cơ chế publish JSON thứ hai.
- **Skill progression:** thuộc game trong proposal; chưa có API aggregate để mở
  thêm dashboard skill progress. Không tự yêu cầu thêm bảng/API cho UI hiện tại.
- **General settings, authoring ai_settings:** chưa mở màn FE theo phạm vi hiện
  tại. Ai_settings cần được xét trong BE-01 nếu giữ runtime Unity cũ; không tự
  thêm CRUD settings riêng.
- **Public register/password recovery:** không yêu cầu với internal platform;
  auth login/refresh/me/logout/change-password đã có.
- **User/role management:** API đã có và UI đã nối theo yêu cầu mới nhất (2026-10-10): list/detail/create/update/reset password. Không cần thêm DELETE; deactivate dùng PUT update. Profile tự sửa thông tin chưa có endpoint, FE hiển thị chỉ đọc và hướng dẫn liên hệ Admin.
  Không tính là BE thiếu chức năng.

## 5. Các phần BE đã có — không yêu cầu làm lại

- Auth JWT/role, refresh rotation, logout, /me và đổi mật khẩu.
- Bảy resource CRUD và payload dữ liệu con nằm trong resource cha.
- Validate/submit/approve/reject/publish/rollback, compare before/after,
  publication history Admin và bundle JSON download.
- Analytics aggregate/heatmap/funnel/weapons/playstyle/version comparison/
  AI comparison/scalability/CSV; không cần thêm API tính lại từ demo events.
- Solver create/update/clone/active/delete và used-config rename-only.
  **isAbArm được BE suy ra từ active + algorithm**, không phải thiếu setter;
  không cần thêm checkbox ghi isAbArm. Family cũng suy ra từ algorithm.
- Game JSON manifest, bundle/cache ETag và session telemetry.
  X-Game-Key chỉ ở Unity, không đưa vào FE.

## 6. Kiểm chứng chung trước bàn giao

Chạy BE với database thử và tài khoản từng role, không seed/reset production.
Kiểm tra auth; CRUD/validate/submit/review/publish/reject/edit-rejected/rollback;
DELETE Draft; stale revision; solver used/active constraints; analytics/CSV.
Khi BE-06 có API, kiểm tra thêm Analyst gửi báo cáo → Designer nhận → Admin
review cả gói, cho cả hai trường hợp có Git và không có Git.
Sau đó thử bundle thực tế trong Unity. API localhost:5079 chưa kết nối được ở
lượt kiểm tra FE trước; có dữ liệu trong DB không đồng nghĩa HTTP API đang chạy.

FE hiện có build/lint và 55 tests đạt. Các tests dùng adapter/fixture; không thay
thế kiểm thử BE thật/DB thật. Checklist đầy đủ operation và trạng thái FE ở
[API_INTEGRATION_GAPS.md](API_INTEGRATION_GAPS.md).
