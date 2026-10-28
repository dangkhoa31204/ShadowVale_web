# Tích hợp Unity ↔ Backend

Tài liệu này mô tả hợp đồng giữa game Unity và backend. Endpoint, mã lỗi và giới hạn chi tiết nằm ở mục
**Game** của [README](../README.md) và ở [api-errors.md](api-errors.md). BE là nguồn chuẩn: khi game và BE khác nhau
thì game sửa theo BE.

Dữ liệu chỉ đi một chiều cho mỗi loại:

- **Content:** Web → BE → Game. Game chỉ đọc bundle đã publish, không bao giờ ghi content.
- **Telemetry:** Game → BE → Web. BE không gửi lệnh nào xuống game, ngoài solver được giao lúc bắt đầu phiên.
- **Solver sidecar:** chỉ nói chuyện với game qua `127.0.0.1`, không bao giờ gọi BE.

## 1. Kết nối

| | Giá trị |
|---|---|
| Base URL (máy dev) | `http://localhost:5079` (profile `http`; profile `https` sẽ redirect sang 7116 có cert tự ký) |
| Base URL (demo) | `https://shadowvale-web.onrender.com` (Render free tier ngủ, request đầu có thể mất vài chục giây) |
| Auth | Header `X-Game-Key` = một trong các `Game:ApiKeys`; không có endpoint game nào public |
| JSON | Bundle: snake_case (nguyên văn đã publish). Session/telemetry: camelCase, thời gian ISO 8601 có offset |

Key nằm trong bản build nên chỉ dùng để chặn spam, không phải bí mật. Không đưa key vào web FE và không commit key
vào repo game: game đọc từ biến môi trường hoặc từ file config đã gitignore.

## 2. Kéo content bundle

```
mở game ──► GET /api/game/content/manifest   (timeout ngắn, ~5 s)
              │ checksum == bản đã cache?  ──có──► dùng cache
              │ không
              ▼
            GET /api/game/content/bundle  + If-None-Match: "<checksum cache>"
              │ 304 ──► dùng cache
              │ 200 ──► SHA-256(bytes) == ETag == manifest.checksum ? validate schema 1.0 ? ──► lưu cache, dùng
              ▼
lỗi mạng / 5xx / quá giờ ──► cache gần nhất ──► (chưa có cache) bundle đóng gói sẵn trong game
```

- **Mất mạng không bao giờ chặn việc chơi.** Game chờ tối đa vài giây lúc khởi động, sau đó chạy bằng cache hoặc
  bundle đóng gói sẵn.
- **Bundle khoá theo phiên.** Bản mới tải ngầm chỉ được dùng từ lần vào màn tiếp theo hoặc lần mở game sau, không đổi
  giữa màn.
- `checksum` và `publishedAt` lấy từ manifest hoặc ETag; bundle không chứa hai trường này.
- `contentVersionId` gửi kèm telemetry là `manifest.versionId`. Bundle đóng gói sẵn gửi `null`.
- Replay harness dùng `GET /api/game/content/versions/{id}/bundle` để chạy lại đúng một version cũ.

## 3. Quy ước dữ liệu của bundle (schema 1.0)

Schema: `ShadowVale.BLL/Schemas/content-bundle-1.0.schema.json`. Mẫu hợp lệ: `ShadowVale.BLL/Seeding/demo_bundle.json`.

### Mã định danh

- `code` của mọi bản ghi (`^[a-z][a-z0-9_]*$`) là id mà game tra cứu, ví dụ `rifle_standard`, `pistol_k54`,
  `rifle_mosin`, `grunt`. Đổi `code` trên web thì game không còn tìm thấy bản ghi đó.
- Map code là id game gửi trong telemetry: `map00_tutorial`, `map01`, `map02`. Heatmap lọc theo đúng chuỗi này.
- `maps[].scene_key` là tên scene Unity: `Map00_Tutorial`, `Map 1`, `Map 2`.
- Key trong `stats.shotsByWeapon` và `stats.killsByWeapon` là `item_code` của vũ khí trong bundle.

### Object tự do (schema không kiểm tra bên trong, game đọc theo quy ước)

| Trường | Nội dung |
|---|---|
| `maps[].nav_graph` | `{ nodes: [{ id, x, y, z, is_cover, cover_facing, neighbors: [id] }], escape_routes: [id] }` (`escape_routes` = các node lối thoát), toạ độ world (mét); xuất từ `TacticalGraphBaker` của game |
| `maps[].layout` | `{ player_start_node: id }` |
| `enemy_types[].fsm_params` | `{ alert_decay_seconds, retreat_hp_threshold, boss? }` |
| `enemy_types[].fsm_params.boss` | Chỉ khi `is_boss = true`. Các trường snake_case của `BossProfile` trong game; thiếu trường nào thì game dùng mặc định |
| `quests[].objectives` | `[{ id, type: "reach_node" \| "escape_map" \| …, target_id, count }]`; thứ tự mảng là `index` của funnel |
| `skills[].xp_curve`, `skills[].effects` | Ngưỡng XP theo level và hệ số theo level của `SkillBalance` trong game |

Các trường của `fsm_params.boss`, giống `BossProfile.cs` ở dạng snake_case:

- **Hệ số:** `health_multiplier`, `damage_multiplier`, `vision_multiplier`
- **Đổi chỗ:** `relocate_interval_seconds`, `relocate_damage_fraction`, `relocate_min_distance`, `relocate_max_distance`, `relocate_min_player_distance`
- **Lựu đạn:** `grenade_camp_seconds`, `grenade_camp_radius`, `grenade_cooldown_seconds`, `grenade_range`, `grenade_radius`, `grenade_damage`, `grenade_fuse_seconds`, `grenade_noise_radius`, `grenade_flush_offset`, `grenade_sheltered_share`
- **Gọi viện binh:** `reinforce_hp_threshold` (proposal: dưới 50% HP), `reinforce_count`, `reinforce_radius`
- **Né và đọc vị người chơi:** `known_hide_camp_factor`, `reads_player`, `aim_duck_seconds`, `duck_seconds`, `aim_dodge_seconds`, `aim_forget_seconds`, `dodge_cooldown_seconds`, `push_cooldown_seconds`
- **Bắn:** `peek_from_cover`, `peek_out_seconds`, `peek_hide_seconds`, `peek_side_offset`, `burst_rounds`, `burst_gap_seconds`

Chỉ số của người chơi (HP, stamina, tốc độ di chuyển) không có trong proposal, nên vẫn nằm trong game
(`Map01Balance.json`) và không đi qua bundle.

### Thiết lập AI

Bundle không chứa `ai_settings`. Solver mà một phiên dùng do BE giao qua `POST /api/game/sessions`, gồm `variant`,
`params`, `quboWeights` và `timeBudgetMs` của solver configuration. Khi offline, hoặc khi BE trả `solver: null`,
game dùng mặc định của mình: `greedy`, không cần sidecar.

Variant hợp lệ: `greedy`, `ga`, `sa`, `tabu` (Classical), `sqa`, `qiea`, `qaoa` (QuantumInspired) và `qpu`
(QuantumHardware, chưa chạy được). Variant `ls` của game không có ở BE nên không được dùng.

## 4. Đẩy telemetry

```
vào màn ──► POST /api/game/sessions { sessionId, installId, source, mapCode, contentVersionId, … }
              │ 2xx ──► áp solver được giao
              │ lỗi  ──► chạy solver mặc định offline; KHÔNG gửi bù POST sau
              ▼
chơi ──► gom event trong RAM, checkpoint ra đĩa định kỳ
              ▼
hết màn ──► ghi pending/<sessionId>.json ──► PUT /api/game/sessions/{sessionId}
              2xx / 409 ──► xoá khỏi hàng đợi
              400 / 413 ──► chuyển sang rejected/, không gửi lại
              khác (mất mạng, 429, 5xx…) ──► giữ lại, thử lại với back-off; lần mở game sau gửi tiếp
```

- **Ẩn danh.** `installId` là GUID ngẫu nhiên lưu trên máy, không gắn với người thật. Payload chỉ chứa dữ liệu
  gameplay. BE không lưu IP.
- **Gửi lại thoải mái.** Event được chống trùng theo `clientEventId`, kết quả re-plan theo `id`.
- **Phiên offline vẫn có giá trị.** Phiên không có `POST` thành công vẫn được lưu và vẫn tính vào heatmap, funnel,
  weapons và playstyle. Nó chỉ bị loại khỏi so sánh AI, vì không có solver do BE giao. Gửi bù `POST` sau sẽ làm BE giao
  một nhánh A/B khác với solver mà phiên đó đã thực sự chạy.
- **Crash.** Checkpoint còn sót lại được gửi ở lần mở game sau với `outcome: "Crashed"`.

### Dữ liệu mà từng dashboard cần

| Dashboard | Game phải gửi |
|---|---|
| Overview | `startedAt`, `endedAt`, `outcome` |
| Heatmap | Event có `posX` = world X, `posY` = world Z (mét) và `mapCode`; mặc định đọc `player_death`, `player_spotted` |
| Funnel | `objective_completed` với `payload.index` là số nguyên (từ 0); `mission_result` với `payload.result = "completed"` khi thắng |
| Weapons | `stats.shotsByWeapon`, `stats.killsByWeapon` (key = weapon `item_code`) |
| Stealth vs combat | `stats.takedowns`, `stats.weaponKills`, `stats.timesDetected` |
| So sánh version | `contentVersionId` = `manifest.versionId` |
| So sánh AI | `POST sessions` thành công; `stats.encounters[]` (`PlayerCaptured` / `PlayerEscaped` / `SquadEliminated` / `Aborted`, kèm `startedAt` / `endedAt`) và `coordinationResults[]` cho mỗi lần re-plan |
| Scalability | `coordinationResults[].numAgents`, `numNodes`, `solveLatencyMs`, `objectiveValue`, `withinBudget` |

Event type hợp lệ (loại khác bị từ chối): `player_spotted`, `enemy_state_changed`, `noise_emitted`, `shot_fired`,
`takedown`, `enemy_killed`, `player_death`, `player_position`, `objective_completed`, `mission_result`, `squad_alert`,
`coordination_replan`, `solver_timeout`, `solver_fallback`, `plan_discarded`, `solver_changed`, `sidecar_status`,
`boss_relocated`, `grenade_thrown`, `grenade_exploded`, `boss_reinforcements`.

`coordinationScore` do game tính; server không tính lại.

## 5. Replay harness

Gọi `POST /api/game/sessions` với `source: "replay"` và `requestedVariant` = `code` của solver configuration (không
cần đang bật). Dữ liệu replay không bao giờ trộn với người chơi thật. Xem bằng `ai/comparison?source=replay` và
`ai/scalability`.

## 6. Nạp content hiện có của game (một lần)

`tools/ImportGameContent` chuyển dữ liệu game đang dùng (`Map01Content.json`, `Map01Loot.json`, `Map01Balance.json`,
`SkillBalance.json`, các `nav_graph.json` và stage của `Map01Quest`) thành bundle schema 1.0, kiểm bằng chính
`ContentBundleValidator`, và in ra mọi giá trị game không có mà tool phải tự điền. Bản đã sinh:
`tools/ImportGameContent/game-content-v1.json`.

```
dotnet run --project tools/ImportGameContent -- convert --unity "<repo game>/Assets" --out tools/ImportGameContent/game-content-v1.json
SVL_TOKEN=<access token của Designer/Admin> dotnet run --project tools/ImportGameContent -- push --bundle tools/ImportGameContent/game-content-v1.json --api http://localhost:5079
```

`push` tạo một Draft qua các endpoint soạn content rồi validate. Submit, approve và publish vẫn làm trên web, để bản này
đi qua quy trình review như mọi version khác.
