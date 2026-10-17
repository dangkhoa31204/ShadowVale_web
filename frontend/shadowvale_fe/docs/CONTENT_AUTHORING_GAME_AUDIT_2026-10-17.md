# Content authoring đối chiếu Unity — 17/10/2026

## Phạm vi và kết luận

- Web local: nhánh `Khoa`, commit `fe6f1df`.
- Unity local: `G:\game\ShadowVale`, nhánh `dev`, commit `9c31c93` (17/10/2026).
- Đối chiếu source FE, builder JSON BE, loader, scene binding và consumer gameplay Unity. Không chạy Play Mode, không kiểm tra dữ liệu trên host, không fetch/merge Git.
- Đây là báo cáo rà soát; không thay đổi UI, BE, Unity hoặc dữ liệu content.

Web có **14 nhóm dữ liệu**, tương ứng **7 resource cha + 7 nhóm con** của BE. Không phải cả 14 đều là chức năng độc lập cần hiện thành tab. Đồng thời, một số trường chưa có consumer trong gameplay hiện tại. Cần phân biệt ba tình huống: dữ liệu con cần gộp UI; thông số có cơ chế game nhưng chưa nối nguồn; tính năng chưa được gameplay triển khai.

**Điểm chặn chính:** publish ở web chưa có đường truyền dữ liệu hoàn chỉnh tới game hiện tại. Không thể kết luận chỉnh một thông số trên web đã thay đổi game.

## Nguồn dữ liệu game thực sự đọc

| Luồng | Nguồn hiện tại | Bằng chứng |
| --- | --- | --- |
| Map 1: bundle và balance | `Assets/_Project/Map01/Generated/Map01Content.json` và `Map01Balance.json` | Scene chính `Assets/_Project/Scenes/Maps/Map 1.unity:442269–442270` gắn TextAsset; GUID content `5862fa00dbe2b2a4eadc375f2d0870c6` khớp meta của Generated/Map01Content. `Map01Mission.cs:98–108` parse `ForestBundle`, chọn `rifle_standard` và `grunt`. |
| Loot, định giá vật phẩm, sửa/rã súng, tiếp tế | `Resources/Loot/Map01Loot.json` | `Map01Loot.cs:97–103`, `Map01Logistics.cs:62`, `:120–121`, `:169–219`. |
| Kỹ năng | `Assets/Resources/Skills/SkillBalance.json` | `PlayerSkills.cs:100–115` đọc Resources và gọi Configure. Không tìm thấy adapter production lấy `skills` từ BE để Configure. |
| Vũ khí người chơi, băng đạn/nạp đạn | Component/prefab `Weapon`, `PlayerCombat`, `WeaponTuning` | `Weapon.cs:14–28`, `PlayerCombat.cs:184`, `:328–329`; không có binding từ ContentService tới các thông số này. |
| Nhiệm vụ Map 1 | C# `Map01Quest`, `Map01Story`, các component operation/layout | `Map01Quest.cs:12–35` chứa stage/objective; luồng chuyển stage xử lý bằng code. |
| Nhiệm vụ Map 2 | `Map02WorldState`, `Map02Mission`, `Map02QuestLayout` và catalog hội thoại | `Map02Mission.cs:32`, `:69–72`, `:106`; `Map02QuestLayout.cs:5–10`. |
| ContentService dùng chung | Chỉ fallback local | `GameBootstrap.cs:31–35` còn TODO BundleFetcher/BundleCache và chỉ đăng ký FallbackBundleProvider. DTO có Quest/Map không đồng nghĩa gameplay đã dùng chúng. |

Các đường dẫn `.cs` ở bảng trên nằm dưới `Assets/_Project/Map01/Runtime` hoặc `Assets/_Project/Scripts` trong repo Unity.

## Đối chiếu toàn bộ 14 nhóm trên Designer

| Nhóm web | Game hiện tại | Đánh giá và xử lý UI đề xuất |
| --- | --- | --- |
| Items | Có inventory, stack, vật phẩm nhiệm vụ và giá tiếp tế. Stack đọc ForestBundle; tên/mô tả ở ForestInventory; model/icon có catalog local; giá ở Map01Loot. | Giữ. Không coi Name/Description/Icon key là dữ liệu đã đồng bộ vào HUD. Chưa thấy hệ thống trang bị Armor trong runtime đã rà soát. |
| Weapons | Có combat. ForestBundle cung cấp damage của rifle cho sát thương lính, noise và durability; nhiều thông số combat người chơi vẫn ở prefab/component. | Giữ dưới item loại Weapon. Không gắn nhãn toàn bộ thông số là đã áp dụng runtime. |
| Consumables | Có medkit, đá, bom khói, lựu đạn; UseItem nhận diện ID cố định. Medkit đọc `Settings.medkitHeal`, không đọc `heal_hp` từ BE. | Gộp vào item. `restore_stamina`, `cures` và `extra_effects` chưa có consumer tương ứng với contract BE; nên ẩn/vô hiệu hóa hoặc ghi chưa hỗ trợ. `heal_hp`/`use_time_s` là cơ chế có thật nhưng chưa nối nguồn, không nên xóa chỉ vì chưa nối. |
| Skills | Có Shooting/Stealth/Engineering, XP, recoil/reload/takedown/repair; đọc SkillBalance local. | Giữ. Web `xp_curve`/`effects` chưa có adapter sang các mảng của SkillBalance. Game chấp nhận 2–5 mốc, tức level tối đa 1–4; slider Max level tới 100 không phản ánh giới hạn runtime hiện tại. |
| Loot tables | Có bảng loot và rollsMin/rollsMax trong Map01Loot. | Giữ. Có cơ chế tiêu thụ nhưng chưa lấy dữ liệu web. |
| Loot entries | Có entries/tier/weight/min/max; roller dùng chúng thật. | Không thừa dữ liệu. Gộp bảng entries vào Loot table thay vì một tab ngang độc lập. |
| Maps | Scene/layout/NavMesh và cấu hình operation nằm trong Unity. Runtime Map 2 được kích hoạt theo tên scene cố định. | Giữ metadata phù hợp. `nav_graph`, `layout`, `is_safe_camp`, `sort_order` của BE chưa có đường áp dụng vào gameplay hiện tại. Không trình bày JSON layout như công cụ xây/thay scene, model hoặc NavMesh. |
| Map loot | Có container tag → loot table trong Map01Loot. | Không thừa dữ liệu. Gộp vào Map, sau khi thống nhất mapping tới container tag thực tế. |
| Enemy types | Có enemy controller và loại loot theo enemy. `GuardData` được parse/chọn nhưng chưa thấy truy cập các thông số của nó trong gameplay; controller dùng serialized fields/layout và Map01Balance. | Giữ khái niệm. `accuracy`, `fsm_params` chưa có consumer theo BE contract. HP/speed/vision/hearing là cơ chế có thật nhưng hiện chưa nối từ web; không xóa cả nhóm. |
| Enemy placements | Có vị trí lính, đường tuần tra, squad/operation trong scene và layout riêng; không đọc collection `enemy_placements` của BE. | Là tính năng game có thật nhưng chưa nối. Gộp vào Map; ghi chưa áp dụng từ web. Không nên để Designer hiểu đổi pos/patrol trên web sẽ đổi ngay bản game. |
| Crafting recipes | Có recipe lookup, output, số lượng, thời gian và queue. Danh sách hiện trên bàn giới hạn bởi `BenchRecipes`. | Giữ. Recipe mới trên web chưa tự xuất hiện trên bàn. `required_skill_code`, `required_skill_level`, `station` chưa được kiểm tra trong TryCraft hiện tại. |
| Recipe ingredients | Có input.item_id/count; HasInputs và TryCraft kiểm tra/trừ nguyên liệu. | Không thừa dữ liệu. Gộp vào recipe. |
| Quests | Game có nhiệm vụ, nhưng không tạo/chạy chuỗi nhiệm vụ từ list `quests` của BE. | Giữ khi phạm vi hệ thống cần quản lý quest; trước khi có adapter nên ghi chưa nối hoặc chỉ cho xem metadata. `reward_xp`, `prerequisites`, `is_main`, `sort_order` chưa có consumer runtime tương ứng được tìm thấy. |
| Quest rewards | Có DTO generic QuestReward, nhưng không thấy gameplay đi qua GetQuest rồi cấp thưởng từ collection này. | Không xóa quan hệ DB. Gộp vào Quest và ghi chưa nối; không báo phần thưởng đã áp dụng vào nhiệm vụ đang chơi. |

## Phần thực sự chưa có consumer hoặc đang dư trong form hiện tại

1. Consumable: Restore stamina, Cures, Extra effects. Có trường BE không đủ chứng minh game đang hỗ trợ chúng.
2. Crafting: Required skill, Required skill level, Station. TryCraft hiện kiểm tra vị trí gần workbench và nguyên liệu; không kiểm tra level skill hay station từ recipe.
3. Quest: Reward XP và cấu hình prerequisite/order/main-quest theo contract BE. Luồng quest production chưa được điều khiển bởi các trường này.
4. Enemy: Accuracy, FSM parameters theo contract BE; không tìm thấy code deserialize/apply chúng vào controller.
5. Item type Armor: chưa thấy luồng trang bị/giảm sát thương của armor; không nên đưa vào lựa chọn mặc định như một chức năng đang hoạt động.

Đây là kết quả tìm consumer trong source production, không phải khẳng định các trường này phải bị xóa khỏi database. Nếu team giữ cho giai đoạn sau, có thể ẩn khỏi form mặc định và ghi rõ trạng thái hỗ trợ.

`item_type`/`ammo_type` phụ trong schema editor không được tính là trường UI dư nếu `apiFields()` đã lọc chúng. Các ID/code/FK vẫn cần cho liên kết và phải tiếp tục tuân thủ khóa trường hiện có.

## Phần nên gộp về cha, không xóa dữ liệu

| Tab con hiện tại | Vị trí hợp lý |
| --- | --- |
| Weapons | Item → Weapon stats |
| Consumables | Item → Consumable settings |
| Loot entries | Loot table → Entries |
| Map loot | Map → Containers / Loot |
| Enemy placements | Map → Enemy placements |
| Recipe ingredients | Crafting recipe → Ingredients |
| Quest rewards | Quest → Rewards |

Như vậy còn 7 nhóm chính: Items, Skills, Loot tables, Maps, Enemy types, Crafting recipes, Quests. Giữ adapter BE đang gom dữ liệu con vào request cha trong `apiModel.ts`; thay bố cục không cần bỏ collection khỏi editor model hoặc runtime snapshot.

Change report tiếp tục nằm trong Content authoring theo version, tùy chọn khi có thay đổi code/asset. Đây là chứng cứ phục vụ review; không phải cấu hình gameplay hoặc asset bundle Unity và không tự trở thành dữ liệu server.

## Lệch hợp đồng bundle — không thể sửa bằng việc bớt tab

| BE/web đang xuất | Unity đang đọc |
| --- | --- |
| `version_no`, schema_version lấy từ ContentVersion.SchemaVersion | `bundle_version`, `schema_version` integer ở ContentBundle generic |
| item `code`, `name`, `item_type`, `max_stack` | `id`, `display_name`, `category`, `stack_max` |
| weapon `item_code`, `effective_range`, `max_durability`, `durability_per_use` | `id`, `range`, `durability_max`, `durability_per_shot` |
| `enemy_types` | `enemy_archetypes` |
| `crafting_recipes` + `crafting_recipe_ingredients` | `craft_recipes` với `inputs` lồng |
| Loot entries, map assignments, quest rewards là list phẳng riêng | Các DTO generic dùng quan hệ lồng; Map01Loot lại có schema local riêng |

Bằng chứng BE: `backend/shadowvale_be/ShadowVale.BLL/Services/ContentBundleBuilder.cs:31–89`. Bằng chứng game: `Scripts/Data/Content/ContentBundle.cs`, `Map01/Runtime/ForestSettings.cs`, Generated/Map01Content.json và Map01Loot.cs.

FE cần giữ nguyên JSON/checksum do endpoint bundle trả. Chuyển đổi tại trình duyệt để làm JSON trông tương thích sẽ không hoàn thiện được loader, cache hoặc các consumer gameplay còn thiếu. Team BE/Unity cần thống nhất contract và đường áp dụng trước khi có thể nghiệm thu publish → game cập nhật.

## Game có thông số nhưng web chưa có form rõ ràng

- Player/companion balance: HP, walk/sprint/crouch, stamina drain/recovery, đá ném, phát hiện/ẩn nấp, Hùng HP trong Map01Balance.
- Skills: reload/recoil multipliers, takedown multipliers, repair bonus và field repair cap theo level. `effects` JSON có thể chứa dữ liệu sau khi thống nhất cấu trúc; hiện không có mapping chung.
- Loot/repair: tierOdds, adaptive low-ammo/low-health boosts, medkit pity; field/bench repair, salvage yields, condition range của súng nhặt được và operation credit.
- Mission/layout mới, hình học map, model, animation, âm thanh vẫn thuộc Unity/Git/build; mô tả/ảnh trong report chỉ giúp Admin review thay đổi.

Không nên thêm toàn bộ các mục này thành các ô JSON tự do chỉ để đủ trường. Ưu tiên thống nhất cái nào thuộc live content, mapping cụ thể và consumer, rồi mới thêm control FE phù hợp.

## Thứ tự xử lý đề xuất

1. Gộp 7 tab con về cha để Content authoring bớt dàn trải, giữ nguyên payload/API.
2. Ẩn hoặc đánh dấu chưa hỗ trợ các trường đã nêu; phân biệt với trường có cơ chế nhưng chưa kết nối.
3. Thống nhất bundle schema/ID và adapter Unity cho các nhóm đang dùng thật: items, weapon durability, crafting, loot và skill balance.
4. Nghiệm thu từng field bằng thay đổi giá trị → publish → game tải → gameplay thể hiện đúng; bổ sung mission/map authoring sau khi có consumer phù hợp.

Không có thay đổi source runtime nên không chạy lại build/tests để thay cho kiểm chứng game. Các kết luận về consumer là rà soát tĩnh tại các commit nêu trên.
