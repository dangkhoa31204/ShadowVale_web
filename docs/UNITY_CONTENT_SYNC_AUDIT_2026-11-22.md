# Đối chiếu Unity, admin và database — 22/11/2026

> Cập nhật sau yêu cầu đồng bộ Supabase và Admin CRUD: xem [kết quả kiểm kê DB thật, Draft #15 và authoring](SUPABASE_UNITY_AUTHORING_2026-11-22.md). Báo cáo bên dưới ghi lại giai đoạn catalog chỉ đọc trước khi nhập database.

## Kết luận

Đã bổ sung danh mục Unity chỉ đọc tại `/admin/game-catalog`, dùng chung cho Admin, Designer và Analyst. Designer còn có tab **Unity game catalog** trong Content management. Analytics hiển thị tên súng, tên mục tiêu và gợi ý mã map từ cùng danh mục; Admin được hiển thị lại mục Analytics trong sidebar.

Nguồn là checkout `G:\game\Capstone\ShadowVale`, không phải repo Unity cũ được dùng trong báo cáo tháng 10. Snapshot ban đầu có 35 vật phẩm, 7 định nghĩa súng cộng dao scripted, 10 công thức, 3 map và 55 mục tiêu Map 1/Map 2. Số lượng chi tiết được hiển thị trực tiếp trong catalog; có thể thay đổi ở lần export tiếp theo.

**Phân biệt ba nguồn:** snapshot lưu cấu hình mặc định trong source Unity; published comparison đọc bundle đã publish trong DB; telemetry phản ánh phiên chơi đã upload. Snapshot không chứng minh người chơi đang chạy đúng cấu hình đó. Unity có thể dùng published bundle, cache hoặc fallback. Không có migration/xóa bảng, ghi vào production, publish content hoặc deploy trong thay đổi này.

## Những gì đã đối chiếu

Đã kiểm tra chỉ đọc web đang triển khai `https://shadowvale-web-1.onrender.com/` qua phiên Admin người dùng đăng nhập ngày 22/11/2026. Publish content hiển thị live version **#9 — fdgdfg revision**, published 15/10/2026 11:32. Full content của phiên bản này có **4 items, 2 weapons, 2 maps**; các nhóm skills, consumables, loot tables/entries, map loot, enemy types/placements, crafting recipes/ingredients, quests/rewards đều **0**. Items/weapons mang tên Test Pistol/Ammo và Test Rifle/Ammo; maps là Test Field và Test Safe Camp. Đây là bằng chứng bundle trên host đang chứa dữ liệu test, không phải danh mục Unity hiện tại. Không publish, rollback hoặc thay đổi bundle này trong quá trình kiểm tra. Không suy ra toàn bộ bảng DB trống từ số dòng của một version.

Sidebar Admin trên bản triển khai chỉ có Review content, Publish content và Users; Analytics chưa có trong sidebar (có thể được truy cập qua account menu theo thiết kế cũ). Catalog mới và thay đổi navigation cần triển khai source mới lên cả FE/BE; URL Render không tự nhận thay đổi local.

| Nội dung | Nguồn Unity | Trạng thái trên web |
| --- | --- | --- |
| Vật phẩm, súng, đạn | `Map01Content.json`, `Map01Loot.json`, `ForestInventory.cs` | Tên HUD, mã, stack/weight nếu nguồn có, loại đạn, damage, range, tốc độ, băng đạn, reload, durability; phân biệt playable và catalog-only. Không tự tạo chỉ số cho dao scripted. |
| Rơi đồ | `Map01Loot.cs`, `Map01Loot.json`, `Map01Logistics.cs` | Tier, weight, lượng min/max, rolls, guaranteed tier 5, xác suất cơ sở mỗi roll; giải thích adaptive boosts, ammo replacement và medkit pity. |
| Ráp/chế tạo | `Map01Content.json`, `Map01Inventory.cs`, `Map01Inventory.FieldCraft.cs` | Inputs/output, thời gian bàn và dã chiến, batch tối đa, có nằm trong whitelist bàn hay không. Không gắn station=field như thể công thức không chạy tại bàn. |
| Trade | `CampTrader.cs`, `Map01M16.cs`, `Map01Loot.json`, `Map01Inventory.Condition.cs` | Stock riêng Map 1/Map 2, súng + đạn kèm, giá điểm hậu cần, nộp nguyên liệu và công thức định giá súng theo condition. |
| Map | TacticalGraphs và container/cache config | Scene, mã telemetry, số node, graph bounds, escape routes, container→loot, field cache X/Z/stage. Không thay thế editor scene/NavMesh. |
| Nhiệm vụ Map 1 | `Map01Quest.StageIds`, `Objectives` | 12 mục tiêu; index save/telemetry giữ nguyên. Stage Complete index 9 hiển thị sau extraction/boarding theo gameplay order. |
| Nhiệm vụ Map 2 | `Resources/Story/Map02Chapter.json` | 43 mục tiêu: tên, purpose, prerequisite, count, phase, site, loại nhiệm vụ và điểm hậu cần nếu có. |

`GameBootstrap.cs` hiện đã tải published bundle/cache/fallback; `PublishedContent.cs` đã áp dụng một số dữ liệu. Vì vậy không dùng kết luận cũ “game chưa có đường tải bundle” cho checkout hiện tại. Tuy nhiên trade stock, tier odds/adaptive/pity, field time/batch, quest flow và scene spawns vẫn là dữ liệu/logic riêng trong game. Các phần này được theo dõi chỉ đọc; chưa có CRUD qua web áp dụng trực tiếp vào gameplay.

Lịch sử trade, inventory và số dư từng người chơi chưa được upload lên server. Catalog hiển thị **cấu hình trade**, không phải ledger giao dịch. Tutorial objectives chưa được export.

## Đánh giá DB

Rà soát `ShadowValeDbContext`, configurations, repositories, bundle builder và consumer Unity cho thấy **23 bảng ứng dụng đều có vai trò trong mô hình hiện tại**. Chưa có bằng chứng đủ để kết luận bảng nào an toàn để DROP. Danh sách từng bảng, quyết định và bằng chứng nằm trong `tools/database-content-audit.json` và tab Database audit.

- Giữ bảng xác thực/lịch sử: `users`, `refresh_tokens`, `content_versions`, `content_publication_history`.
- Giữ catalog và các quan hệ: `items`, `weapons`, `consumables`, `skills`, `loot_tables`, `loot_table_entries`, `maps`, `map_loot_tables`, `enemy_types`, `crafting_recipes`, `crafting_recipe_ingredients`.
- Giữ nhưng đánh dấu khoảng trống tích hợp: `enemy_placements`, `quests`, `quest_rewards`. Có quan hệ/luồng authoring hợp lệ; chưa chứng minh generic data đang điều khiển scene spawn và nhiệm vụ thật.
- Giữ analytics/solver: `players`, `game_sessions`, `telemetry_events`, `solver_configurations`, `coordination_results`. `players` là định danh người chơi, khác tài khoản quản trị `users`.
- Các bảng con nên nằm dưới UI cha. Đây là cải thiện trải nghiệm, không phải lý do xóa quan hệ DB.
- Chưa có bằng chứng đầy đủ cho consumable stamina/cures/extra effects, generic FSM, quest XP/prerequisite và crafting skill/station được áp dụng toàn bộ theo contract web.

Chưa kiểm tra row counts/query history của DB production. File SQL có sẵn trong thư mục database là tài liệu schema, không chứng minh trạng thái DB đang chạy. Dùng `backend/shadowvale_be/docs/database/content-usage-audit.sql` để thu inventory của schema `shadowvale` và `public`, ước lượng số dòng, scan/write counters, FK, view và trigger trong transaction READ ONLY. Bảng ngoài EF, bản cũ trong `public` và migration history cần phân biệt rõ quyền sở hữu. Không xóa chỉ vì estimated_rows=0 hoặc scan=0; counters có thể đã reset.

Trước khi đề xuất xóa một bảng thực tế cần đủ: consumer ngoài code hiện tại, FK/view/trigger/function, dữ liệu cần giữ/di chuyển, backup có kiểm chứng, thời gian quan sát sau khi ngừng ghi và migration rollback cụ thể. Chưa tạo migration DROP khi chưa có các bằng chứng này.

## Đồng bộ snapshot và vận hành

Từ root repo web, chạy bằng Node 24:

```powershell
node tools/sync-unity-catalog.mjs --unity G:/game/Capstone/ShadowVale/Assets
node tools/sync-unity-catalog.mjs --unity G:/game/Capstone/ShadowVale/Assets --check
node --test tools/tests/unity-catalog.test.mjs
```

Exporter đọc source thật và giải quyết constant đang dùng trong trade/bench whitelist. Khi format C# không trích được, export phải fail để cập nhật parser. Snapshot chứa thời gian xuất, Unity HEAD và SHA-256 từng file nguồn; hash nhận diện cả thay đổi chưa commit. `--check` so sánh toàn bộ nội dung, bỏ timestamp/HEAD để chỉ phát hiện thay đổi dữ liệu/nguồn. Không gọi Unity Editor hoặc ghi vào game.

Snapshot được embed vào BLL để không phụ thuộc filesystem Unity trên server. Cần export lại và build/deploy API khi Unity thay đổi. Đây là đồng bộ theo lần build, **không phải realtime polling một bản game đang chạy**. Nút Refresh đọc snapshot của API đang triển khai và so sánh published bundle mới nhất, không chạy exporter trên máy phát triển.

API có JWT/role bảo vệ:

- `GET /api/game-catalog`: snapshot, không cần query DB.
- `GET /api/game-catalog/comparison`: local defaults so với published bundle theo field được xuất. Chỉ đọc phiên bản đã publish, không đọc draft.

Comparison gồm stack/base value, weapon stats/ammo, runtime loot/entries, recipes/ingredients, map scene và container bindings. Không so sánh những field không có nguồn chắc chắn. `published_only` có thể là nội dung thiết kế hợp lệ hoặc legacy definitions; không tự coi là rác. `covered_fields_match` chỉ có nghĩa các field được so sánh khớp.

Luồng authoring `tools/ImportGameContent` vẫn riêng biệt: convert → Draft → review → approve → publish theo quy trình hiện có. Không tự ghi snapshot vào DB hoặc publish đè content của Designer. Công cụ import cũ có một số placeholder/chuẩn hóa (ví dụ dao melee) nên cần review kỹ; catalog mới bảo toàn chỗ thiếu dữ liệu thay vì suy diễn chỉ số.

## Sửa analytics

Funnel trước đây group chỉ theo `payload.index`, gộp cùng index của nhiều map. Đã thêm `mapCode` và `objectiveCode` vào API, group theo map + index + mã mục tiêu. Mã mục tiêu lấy từ `payload.objective` đúng với `TelemetrySession.OnObjective` của Unity. Event cũ không có objective vẫn hiển thị index. Tên nhiệm vụ chỉ ghép theo mã, không đoán theo index của snapshot hiện tại. Denominator vẫn là số phiên theo filter; khi chọn all maps đây là tổng hợp nhiều luồng, không phải một chuỗi nhiệm vụ duy nhất.

Xác suất loot hiển thị là kết quả toán học của hai bước chọn tier rồi entry. Không hiển thị weight dưới dạng phần trăm tuyệt đối. Tier 5 không chiếm xác suất random; một container có thể cho cả guaranteed entries lẫn nhiều roll trùng nhau. Không dùng `1-(1-p)^rolls` để giả định tỉ lệ thực tế khi còn adaptive, quantity, pity và ammo replacement.

## Kiểm chứng và giới hạn môi trường

- 7 Node tests của exporter qua: phân phối tier/weight, fallback tier, guaranteed drops, zero-weight fallback, liên kết trade/loot/recipe/quest, dao scripted và coverage 23 DbSet.
- `--check` xác nhận snapshot khớp nguồn Unity hiện tại.
- 54 frontend tests qua; TypeScript và Vite production build qua. Các file UI/API client thay đổi đã qua ESLint.
- Toàn bộ solution backend, gồm project unit và integration tests, biên dịch thành công với 0 warning/0 error khi tách bước sinh OpenAPI (`-p:OpenApiGenerateDocuments=false`).
- Bước thực thi backend bị **Windows Application Control (0x800711C7)** chặn nạp các DLL vừa biên dịch, kể cả sau khi chạy build/test bằng quyền thực thi được chấp thuận. Unit discovery bị chặn; integration fixture bị chặn trước khi kiểm tra nghiệp vụ. Không báo các tests này là passed. Không thay đổi chính sách bảo vệ Windows.
- OpenAPI đã được cập nhật theo thay đổi controller/DTO và frontend contracts được sync lại. Vì không chạy được generator trên máy này, cần sinh lại OpenAPI và chạy full backend tests trên CI/runner có thể thực thi .NET trước khi merge/deploy; chưa xác nhận kiểm tra byte-for-byte với generator.
- Bản frontend mới chưa được kiểm tra trực quan trên browser: localhost preview từ sandbox không truy cập được. Kiểm tra browser trên Render chỉ áp dụng cho bản cũ đang live.
- Tại thời điểm rà soát chưa push/merge/deploy, chưa import/publish đè version #9 và chưa query/drop DB production. Cần triển khai source mới để catalog xuất hiện trên URL Render; push riêng lên Khoa không tự triển khai theo CD hiện tại.
