# Unity → Supabase và Designer authoring — 22/11/2026

## Kết quả trên Supabase thật

Đã kiểm kê chỉ đọc schema `shadowvale` và `public` của database backend đang cấu hình. Kết quả: **23 bảng ứng dụng**, **1 bảng `__ef_migrations_history`**, không có bảng ứng dụng trong `public` và không có bảng ngoài mô hình EF hiện tại. Các bảng loot, crafting, skills, enemy và quest trước đó trống do chưa nhập dữ liệu game. Không có bảng nào được xác định an toàn để DROP, nên không xóa bảng hoặc lịch sử phiên bản.

Đã nhập một giao dịch thành công thành **Draft #15**, ID `a1c53061-65ce-4896-a940-e7526109d2c2`; hiện revision 3 sau khi sửa AK47, chuyển cho tài khoản designer và loại shotgun/SMG/carbine mẫu chưa triển khai. Không validate/submit/approve/publish tự động. Bundle và validated_at của Draft vẫn trống để bắt buộc đi qua quy trình backend bình thường. **Published #9 không bị thay đổi.**

| Bảng/nhóm | Dòng của Draft #15 |
| --- | ---: |
| items | 31 |
| weapons | 4 |
| consumables | 4 |
| skills | 3 |
| loot_tables | 17 |
| loot_table_entries | 148 |
| maps | 3 |
| map_loot_tables | 10 |
| enemy_types | 8 |
| crafting_recipes | 10 |
| crafting_recipe_ingredients | 20 |
| quests | 2 nhóm / 55 mục tiêu |
| enemy_placements / quest_rewards | 0 |

Đã đọc lại toàn bộ số dòng theo version và so sánh `maps.layout` với bundle import: khớp. Không đọc/export mật khẩu, refresh token, danh sách người chơi hay nội dung telemetry. Các phiên bản cũ có thể cùng `code` với Draft mới; đó là lịch sử version, không phải dòng trùng trong cùng một version.

Dao scripted vẫn nằm ở Unity source reference; không tạo chỉ số dao giả trong DB. Các giá trị schema mặc định hoặc suy ra từ archetype được liệt kê trong `importNotes` và changelog của Draft để review.

## Một nguồn chỉnh sửa

**Drafts** là nơi CRUD qua API hiện có vào các bảng Supabase. **Unity catalog** là snapshot để import/đối chiếu, không phải bộ bảng editable thứ hai.

- Vật phẩm, súng và consumable: `items` cùng bảng subtype `weapons`/`consumables`.
- Loot và lượng rơi: `loot_tables`/`loot_table_entries`; container gắn vào map qua `map_loot_tables`.
- Công thức: `crafting_recipes`/`crafting_recipe_ingredients`.
- Nhiệm vụ: `quests`/`quest_rewards`, lưu metadata theo version.
- Trade stock và các luật còn thiếu cột riêng: dùng JSON có cấu trúc trong **`maps.layout.game_rules`**. Không thêm bảng mới trùng catalog.
- Giá mua/giá trị súng dùng `items.base_value`; không lưu thêm giá trùng trong từng trade offer.

Designer là người tạo, import, chỉnh sửa, xóa bản nháp, validate và submit. Frontend chỉ cho Designer mở Content authoring và chỉnh Draft/Rejected của mình. Backend chặn Admin tại mọi endpoint ghi nội dung, kể cả gọi API trực tiếp. Admin xem nội dung, approve/reject, publish và rollback; Analyst không được authoring. Approved, InReview, Published và Archived vẫn chỉ đọc. Luồng giữ nguyên: **Draft → Validate → Submit → Approve → Publish**, có revision và lịch sử publication.

Sau khi triển khai FE/BE mới: đăng nhập Designer → **Content authoring → Unity catalog → Import Unity as new draft** để tạo bản nháp thuộc Designer, rồi sửa trong **Content authoring → Drafts**. Draft #15 đã chuyển sang tài khoản `designer` theo lựa chọn của người dùng; revision 3 chỉ còn 4 súng gameplay (AK47, M16, K54, Mosin), đã bỏ shotgun/SMG/carbine mẫu; thông số AK47 lấy từ prefab runtime (30 damage, 10 phát/giây, 120 m). Chưa publish; xem `WEAPON_DB_SYNC_2026-11-22.md`. Sửa item/weapon/loot/crafting bằng các form có sẵn. Trong **Maps → Trade and game rules** có form thêm/sửa/xóa stock, số đạn kèm, điểm nộp vật liệu, tier odds và adaptive values. Repair/field crafting đầy đủ ở Advanced JSON → layout.game_rules. Validation backend chặn cấu trúc sai, khoảng giá trị sai, mã item/ammo/recipe/mục tiêu không tồn tại và credit ID trùng trước khi publish.

Unity catalog chỉ nằm trong Content authoring của Designer, không có mục sidebar riêng hoặc liên kết trong Analytics. Admin và Analyst không được truy cập API catalog/comparison; đường dẫn cũ chỉ redirect Designer sang tab Unity. Analytics dùng mã telemetry ghi trong phiên chơi.

Nút **Import Unity as new draft** tạo một Draft rỗng rồi ghi qua authoring API, không clone bundle test đang live. Nếu gián đoạn, UI giữ Draft ID để retry vào cùng draft; các row đã ghi được đọc lại để không tạo trùng. Tạo import mới không tự publish hoặc thay bản live.

## Unity consumer

Đã cập nhật source Unity local và cung cấp patch `docs/unity/database-content-bindings.patch` cho checkout khác:

- Bundle mapper giữ BaseValue/Rarity/Stats của item và game_rules của map.
- PublishedContent áp dụng giá/condition/salvage metadata, tier/adaptive/repair/logistics và field crafting vào bản copy cấu hình local.
- CampTrader đọc stock theo map từ published bundle; mảng rỗng là không có offer, thiếu field giữ stock fallback.
- Bundle cũ không có rule mới tiếp tục dùng mặc định. Các offer mới vẫn phải có vũ khí được gameplay hỗ trợ.

**Cần build lại Unity** để các binding mới hoạt động. Bản game cũ vẫn bỏ qua các rule mới. Tạo weapon mới trên DB không tự sinh model/animation; quest metadata không thay thế state machine nhiệm vụ; map metadata không thay thế geometry/NavMesh/spawn trong scene. Patch đã áp dụng ở checkout `G:\game\Capstone\ShadowVale`; dùng cho checkout Unity khác khi tích hợp.

Patch không có dòng context; áp dụng trên checkout Unity cùng base bằng `git apply --unidiff-zero <path-to-database-content-bindings.patch>`. Đã kiểm tra reverse-apply trên source local để xác nhận patch khớp toàn bộ thay đổi.

## Công cụ vận hành

Exporter và tests:

```powershell
node tools/sync-unity-catalog.mjs --unity G:/game/Capstone/ShadowVale/Assets
node tools/sync-unity-catalog.mjs --unity G:/game/Capstone/ShadowVale/Assets --check
node --test tools/tests/unity-catalog.test.mjs tools/tests/unity-authoring.test.mjs
```

CLI import trực tiếp chỉ dành cho vận hành được ủy quyền. Chạy `npm install --prefix tools` để cài driver `pg` và `npm ci --prefix frontend/shadowvale_fe` cho dependency validation. Dùng `ConnectionStrings__Default` hoặc `.env` backend. Mặc định chỉ in kế hoạch; `--write` mới tạo một Draft mới trong transaction. Công cụ không update version cũ hoặc DROP/publish. `--pg-module <absolute path to pg/lib/index.js>` hỗ trợ driver đã cài ở vị trí khác. Có thể truyền `--ca <certificate>`; khi không truyền, kết nối tuân theo SSL Mode của backend, không thay cấu hình máy chủ.

```powershell
node tools/supabase-content-sync.mjs
node tools/supabase-content-sync.mjs --write
```

Script SQL read-only `backend/shadowvale_be/docs/database/content-usage-audit.sql` dùng kiểm kê lại trên môi trường mục tiêu. Bảng migration phải giữ. Bảng trống nhưng có FK/consumer/contract authoring không được xem là thừa.

## Kiểm chứng và triển khai

- **55 frontend tests** qua sau khi đổi phân quyền: Admin không được sửa/submit bản nháp, không được chuyển tới Unity catalog; Designer dùng catalog trong Content authoring.
- **12 Node tests** qua: schema bundle/rules, FK nội bộ, xác suất loot, field crafting và coverage các bảng.
- **7 Unity EditMode tests** của PublishedContent qua, gồm giá/credit/field rule mới, stock rỗng và fallback bundle cũ.
- TypeScript, ESLint các file thay đổi và Vite production build qua.
- Backend cùng project tests biên dịch qua khi tách bước OpenAPI. Runtime unit/integration .NET trên máy này vẫn bị Windows Application Control chặn như báo cáo trước; cần chạy CI trước deploy. Không thay API route/DTO nên không cần thêm endpoint OpenAPI cho import.
- Dữ liệu Draft #15 đã ở Supabase. UI authoring mới cần triển khai FE/BE từ source; push lên `Khoa` không tự triển khai Render. Chưa tự merge vào `dev` hoặc publish #15.
