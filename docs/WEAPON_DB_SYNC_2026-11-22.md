# Đồng bộ weapons và phân quyền Designer — 22/11/2026

Đã đọc proposal gốc [ShadowVale_RBL_Capstone_Proposal.docx](https://docs.google.com/document/d/1YcvHYPC9uM9GjLfx8VijyOdNmXJ6L9zH/edit), mục 3.1.b–c: Designer author nội dung maps, enemy parameters, loot, recipes, quests và weapon stats; Admin phụ trách user/role, review/approval và configuration. Theo yêu cầu trực tiếp mới nhất của người dùng, **mọi chỉnh sửa nội dung và cấu hình ảnh hưởng gameplay, gồm AI/solver, thuộc Designer**. Đây là quyết định phân quyền triển khai; không sửa proposal để khớp code.

| Chức năng | Designer | Analyst | Admin |
| --- | --- | --- | --- |
| Tạo/import/sửa/xóa bản nháp game, validate, submit | Có | Không | Không |
| Unity catalog trong Content authoring | Có | Không | Không |
| Đọc analytics/cấu hình solver | Có | Có | Có |
| Tạo/sửa/clone/activate/xóa cấu hình AI/solver | Có | Không | Không |
| Review, approve/reject, publish/rollback content | Không | Không | Có |
| Quản lý user/role | Không | Không | Có |

Quyền sửa solver áp dụng cả frontend và endpoint backend. Các API solver hiện có vẫn dùng luồng cấu hình riêng; thay đổi này không bổ sung workflow Draft cho solver.

## Sai lệch đã xác định

Sau lần [dọn item test](TEST_ITEM_CLEANUP_2026-11-22.md), `weapons` chứa 18 hàng: 14 hàng test lịch sử và 4 súng gameplay trong Draft #15 (AK47, M16, K54, Mosin). Shotgun/SMG/carbine chỉ là định nghĩa trong JSON mẫu cũ, chưa được triển khai. Đã loại ba định nghĩa này khỏi bản nháp và khỏi các lần import mới; vẫn bảo toàn metadata nguồn để truy vết. Không xóa lịch sử hoặc thay Published #9.

Bộ import cũ chỉ lấy `Map01Content.json`. AK47 thực tế được tạo từ `W_AK47.prefab`; `Map01RifleVisual` giữ baseline của prefab khi dùng AK và dùng hằng số `Map01M16` khi đổi sang M16. Vì vậy số trong JSON không phản ánh đúng AK runtime.

| AK47 (`rifle_standard`) | Draft #15 trước | Unity prefab / DB sau |
| --- | ---: | ---: |
| Damage | 24 | 30 |
| Fire rate (phát/giây) | 6,5 | 10 (600 phát/phút) |
| Range (m) | 40 | 120 |

Exporter mới resolve damage/range/fire rate từ prefab AK và constants M16; magazine/reload từ Player prefab. Các trường khác giữ dữ liệu JSON. Hash provenance bao gồm hai prefab này. Các giá trị là thông số cơ sở, trước skill, lethal-hit override và hệ số khó của địch; không tuyên bố mọi phát bắn đều gây đúng lượng HP cơ sở.

## Lần đồng bộ thông số: revision 1 → 2 (lịch sử)

- Đích duy nhất: version 15, trạng thái Draft; revision **1 → 2**.
- Tác giả: chuyển Admin → tài khoản **designer**, theo lựa chọn của người dùng.
- Chỉ một hàng weapons có thông số lệch: AK47, cập nhật ba trường trên.
- Kiểm tra lại đủ 7 súng, toàn bộ trường weapon đã xuất không còn khác biệt.
- Xóa validation/bundle/checksum của Draft để bắt buộc validate lại trước khi submit.
- So sánh toàn bộ hàng weapons/version khác và lịch sử publication trong transaction: không đổi.
- Backup trước cập nhật nằm trong `output/local-unity-integration/weapons-v15-before-1795356112841.json`, không commit file backup vào Git.

## Loại định nghĩa chưa triển khai: revision 2 → 3

- Bỏ đúng ba item/weapon: shotgun_pump, smg_compact, carbine_scout khỏi Draft #15; còn 31 items và 4 guns.
- Xóa liên kết weapon của ba prototype enemy scout/heavy/boss_commander tới các súng đã bỏ. Không gán súng thay thế suy đoán; Designer cần review metadata prototype trước publish.
- Các công thức, loot và reward không tham chiếu ba item này. Công cụ dừng nếu có phụ thuộc khác, không cascade-delete.
- Backup trước lần loại bỏ: output/local-unity-integration/weapons-v15-before-1795356844278.json, gồm version, weapons, item đã bỏ và enemy links.
- Đọc lại revision 3: 4 súng đúng whitelist, không còn dữ liệu dư cần loại; Published và các bản lịch sử không đổi.
- Giao diện Unity catalog chỉ hiển thị vũ khí đã triển khai. Tệp nguồn có thể chứa định nghĩa tham khảo nhưng bộ import không đưa chúng vào DB.

Mở bằng tài khoản designer: **Content authoring → Drafts → #15 → Weapons**. Dữ liệu DB đã thay đổi ngay; code exporter và quyền sửa solver cần triển khai FE/BE mới. Catalog nhúng trên API hiện tại có thể vẫn chứa AK cũ cho tới khi triển khai.

SQL chỉ đọc có mã và tên súng: `backend/shadowvale_be/docs/database/weapons-draft-15.sql`. Không đối chiếu bằng UUID hoặc danh sách weapons không lọc version.

## Công cụ tái lập

```powershell
node tools/sync-unity-catalog.mjs --unity G:/game/Capstone/ShadowVale/Assets
node --test tools/tests/unity-catalog.test.mjs tools/tests/unity-authoring.test.mjs
node tools/sync-unity-weapons.mjs --version 15 --revision 3 --designer designer --pg-module output/local-unity-integration/pg-runtime/node_modules/pg/lib/index.js
```

Công cụ mặc định chỉ lập kế hoạch. `--write` chỉ cập nhật Draft đúng revision, backup trước ghi và rollback khi đọc lại không khớp hoặc có thay đổi ở phiên bản/lịch sử khác. Khi số/mã súng khác nguồn, công cụ dừng để kiểm tra. Chỉ khi chọn rõ --prune-unused mới được loại định nghĩa có cờ reference-only, không thêm hàng hoặc xóa định nghĩa lạ.

Designer kiểm tra và validate/submit bản nháp; Admin duyệt rồi publish. Lần đồng bộ này không tự publish hoặc thay build Unity.

## Kiểm chứng

- 14 kiểm thử exporter/schema/FK qua; `--check` xác nhận snapshot khớp nguồn Unity.
- 55 kiểm thử frontend qua; TypeScript/Vite build và lint file phân quyền qua.
- Backend và các project test compile thành công, 0 warning/error (`OpenApiGenerateDocuments=false`). Backend integration tests chưa thực thi local, cần CI.
- Đọc lại Supabase ở revision 3: không còn thay đổi weapons hoặc author cần áp dụng; 4 súng và map rules khớp snapshot. Published #9 không đổi.
