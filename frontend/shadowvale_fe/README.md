# ShadowVale internal frontend

React 19 + TypeScript + Vite web platform for content authoring, review/publish and
telemetry analytics. The backend, database and Unity project are separate.

## Đối chiếu proposal — đọc trước khi sửa (team & AI)

Nguồn sự thật là proposal `ShadowVale_RBL_Capstone_Proposal.docx`: mục 3.1.c
Functional Requirements (Content & Balancing Platform, Telemetry & Analytics Dashboard),
3.1.d Non-functional và 3.2.a stack web. Web FE phải khớp proposal
**không thừa, không thiếu**:

- Không thêm màn/chức năng proposal không yêu cầu. Thấy thừa thì bỏ.
- Thiếu thì làm đúng câu chữ proposal, không tự mở rộng.
- Không sửa proposal để hợp thức hoá code; code đi theo proposal.
- Chức năng phục vụ trực tiếp một yêu cầu thì được giữ (ví dụ import editor JSON khi
  soạn content, tải JSON đã validate của một version — phục vụ "publish to a validated
  JSON bundle"; demo mode để trình diễn khi không có BE).

### Màn hình ↔ yêu cầu proposal

| Màn (route) | Vai trò | Yêu cầu trong proposal |
| --- | --- | --- |
| Login `/login`, Change password `/admin/change-password` | Tất cả | Authenticated (JWT) access; JWT sessions and role-based access |
| Overview / Dashboard `/admin/dashboard` | Designer, Admin | Trang chính của workspace: version đang chạy, hàng chờ, hoạt động publish |
| Content authoring `/admin/content` | Designer | Authoring maps, enemy archetypes & parameters, loot tables, recipes, quests, weapon stats, with schema validation |
| Review content `/admin/reviews` | Admin | Review/approval workflow |
| Versions / Publish versions `/admin/releases` | Designer / Admin | Version history with compare/rollback and one-click publish to a validated JSON bundle |
| Users `/admin/users` | Admin | User/role management (Designer, Analyst, Admin) — role gán trên từng tài khoản |
| Analytics `/admin/analytics` | Tất cả | Difficulty heat maps, mission completion funnels, weapon-usage and stealth-vs-combat distributions; AI-variant comparison (capture rate, escape time, coordination score) per content version |
| Analytics → Solver configurations | Xem: tất cả · Sửa: Analyst, Admin | Admin "configuration": cấu hình duy nhất BE hỗ trợ là cấu hình solver (classical vs quantum-inspired) |

Admin mở Analytics và Change password từ menu **Account**. Analyst chỉ có Analytics (và Change
password): proposal đặt Analyst ở Telemetry & Analytics Dashboard, version history ở phần
Designer/Admin.

### Đã bỏ vì nằm ngoài proposal (đừng thêm lại)

- Change reports (báo cáo + ảnh lưu local) ở Content, Reviews và Releases.
- Game delivery (Git/CI build, game assets, nút "Git changes"/"Game assets", `source=game`).
- Profile; song ngữ EN/VI và giao diện sáng (portal chỉ có theme tối, tiếng Anh).
- Xuất CSV / JSON ở Analytics (endpoint CSV ở BE giữ nguyên, FE không gọi), panel Skill.
- Thông tin Analytics proposal không nêu: ô tổng quan Sessions / Players / Average duration,
  biểu đồ Session outcomes và Daily sessions, tab Version comparison (yêu cầu "per content
  version" đã có bộ lọc Content version và cột Version ở AI comparison), khối Scalability
  lặp lại trong tab AI comparison. Endpoint `/analytics/overview` và `/analytics/versions/compare`
  ở BE giữ nguyên, FE không gọi.
- Overview và Versions của Analyst (BE không cho Analyst đọc version nên hai trang chỉ hiện thông
  báo hạn chế), thẻ "Published content" trên sidebar của Analyst.
- Panel "Publication activity" ở Overview của Designer (lịch sử publish chỉ Admin đọc được nên luôn
  trống) và dải "Review → Approve → Publish" chỉ để trang trí ở Dashboard của Admin.
- Bảng "Published content" (số bản ghi từng bảng của version đang chạy) và ô "Content resources" /
  "Published records" ở Overview.
- `player_id` trong telemetry demo (proposal yêu cầu telemetry ẩn danh).
- Trang Roles và Settings (không có route; Settings không có API BE), đăng ký công khai,
  quên mật khẩu, lệnh demo quản lý user/cấu hình, các trang/layout/component template cũ.

### Quyết định đã chốt

- **Stack đúng mục 3.2.a:** Tailwind + shadcn/ui, React Query (TanStack Query),
  Recharts. Không thêm thư viện UI/chart khác.
- **Trình duyệt:** proposal ghi Chrome/Firefox/Edge 100+, Tailwind 4 chính thức hỗ trợ
  Chrome/Edge 111+, Firefox 128+. Nhóm **giữ Tailwind 4 và không sửa proposal**. Trên
  Chrome/Edge 100–110 và Firefox 100–127 một số màu bán trong suốt (ví dụ `bg-success/10`)
  có thể lệch; bố cục và chức năng vẫn chạy. Nếu cần chứng minh 100+: thử trên Chrome 100 /
  Firefox 115 ESR rồi đổi màu bán trong suốt sang token màu đặc — không hạ Tailwind.
- **Analytics dành cho cả ba role:** Designer cân bằng game dựa trên dữ liệu chơi.

### Nhật ký thay đổi (nhánh `feat/fe-align-proposal`, tạo từ `dev`)

1. Bỏ các phần ngoài proposal liệt kê ở trên; admin được so sánh version ở demo mode;
   nâng `axios` 1.20.0 (vá lỗ hổng).
2. Tailwind 4 + shadcn/ui (Radix, nova) + TanStack Query; bảng màu olive quân đội đặt vào
   token shadcn, chỉ theme tối.
3. Mọi màn dùng shadcn (Card, Field, Table, Tabs, Dialog, AlertDialog thay `window.confirm`,
   DropdownMenu, sonner thay Toast tự viết, icon lucide thay Material Symbols) và React Query
   cho dữ liệu server.
4. Analytics vẽ bằng Recharts; demo có thêm funnel nhiệm vụ, stealth vs combat và lớp
   Detections cho heat map (kèm unit test).
5. Dọn CSS cũ không còn dùng; mock API cho UI test có dữ liệu analytics/solver.
6. Bỏ thông tin Analytics proposal không nêu, các trang rỗng của Analyst và panel luôn trống
   (xem "Đã bỏ").

### Thông tin giữ lại dù proposal không gọi tên trực tiếp (có căn cứ)

- Bảng Items, Consumables, Skills trong Content: "fully data-driven content", "content fully
  separated from code", Package 5 có skills; weapons/loot/recipes/rewards tham chiếu items.
- Cột p95 latency, within budget, fallback ở AI comparison: phần đánh giá "latency
  percentiles, success rate" và yêu cầu "bounded latency budget".
- Tab Scalability: O4 "latency and scalability, identify the viable real-time regime".
- Bộ lọc Human/Replay: "deterministic replay harness" và "A/B study".
- Demo: ô Encounter capture rate và Within time budget (chỉ số so sánh AI).

### Còn thiếu một phần (do BE)

Analyst phải nhập GUID khi lọc theo content version vì BE chỉ cho Admin/Designer đọc danh
sách version. Cần BE cho Analyst đọc danh sách version (số và nhãn).

## Run

Use Node.js 22.6+ (24 recommended).

```sh
npm ci
npm run dev
npm run build
npm run lint
npm test
```

Development defaults to API mode (`VITE_DEMO_MODE=false`, `VITE_API_BASE_URL=/api`).
Vite proxies `/api` to the .NET API at `http://localhost:5079`. Start the BE separately
and sign in with accounts it issues. API failures never switch to demo data.

For production, proxy `/api` to the BE or set `VITE_API_BASE_URL` to the deployed API URL
before building, and list the FE origin in the BE CORS policy. Vite environment values
are public: never put JWTs, database credentials or `X-Game-Key` in them.

Optional demo: put `VITE_DEMO_MODE=true` in `.env.local` and restart Vite. The login
screen fills three demo accounts (`designer@shadowvale.dev`, `analyst@shadowvale.dev`,
`admin@shadowvale.dev`, password `ShadowVale123!`). Demo workflows and analytics are
synthetic, stored in the browser, and separate from API mode.

## Stack

- **Tailwind CSS 4** via `@tailwindcss/vite`. Theme tokens (shadcn variables, chart colours)
  live in `src/index.css`; there is no `tailwind.config`.
- **shadcn/ui** (Radix base, `components.json`) in `src/components/ui`. Add components with
  `npx shadcn@4.21.4 add <name>`; the `@/` alias is declared in `tsconfig.json` for the CLI.
  Shared building blocks: `features/shared/ui.tsx` (Icon, PageHeading, Panel, StatCard,
  Status, Empty, ActivityList), `Modal.tsx` (Dialog), `confirm.tsx` (AlertDialog `useConfirm`).
- **TanStack Query** for server data: workspace (`features/content/WorkspaceProvider.tsx`),
  content editor and enums, comparisons, users, dashboards, analytics and solver
  configurations; writes are mutations. `src/lib/queryClient.ts` does not retry 4xx and the
  cache is cleared whenever the signed-in user changes.
- **Recharts** through shadcn `chart` (`features/analytics/charts.tsx`). Series colours
  `--chart-1…6` are a fixed order validated for the dark card surface (lightness band,
  chroma, colour-blind and normal-vision separation, 3:1 contrast). One series uses
  `--chart-1`; more than six series fold into the table.
- Legacy portal layout CSS (`internal.css`, `original-theme.css`,
  `template/tailadmin/tailadmin-theme.css`, `editor.css`, `military-theme.css`) is imported
  in the `components` layer so shadcn utilities win. Follow-up: fold the three overlapping
  theme files into one (most of their colours are overridden by `military-theme.css`).

## Roles

| Capability | Designer | Analyst | Admin |
| --- | :---: | :---: | :---: |
| Author and submit own content drafts | Yes | — | — |
| Review / approve / reject | — | — | Yes |
| Publish / rollback | — | — | Yes |
| Overview and version history, detail, comparison | Yes | — | Yes |
| Publication history | — (BE restriction) | — | Yes |
| Validated JSON bundle download | Yes | — | Yes |
| Analytics (manual version GUID for Analyst) | Yes | Yes | Yes |
| Solver configurations: view | Yes | Yes | Yes |
| Solver configurations: create / edit / clone / activate / delete | — | Yes | Yes |
| Users and roles | — | — | Yes |

## Content and workflow

All 14 editor tables remain. Child records are saved through seven parent resources
(item weapons/consumables; loot table entries; map enemy placements/loot references;
recipe ingredients; quest rewards). Relations use codes, resource URLs use GUIDs. API DTOs,
enums and numeric limits drive the forms; numbers support sliders and manual entry.
Existing records lock primary/composite keys, foreign keys and item types; Advanced JSON
enforces the same locks.

Save sends only changed parent resources in dependency order. A failed sequential save
lists committed and remaining resources and keeps edits for retry. Metadata and workflow
requests send the revision; entity writes have no transaction-level concurrency guarantee
in the BE.

Validate, submit, approve/reject, publish and rollback use BE endpoints. Admin review
loads the changes before enabling approval and rechecks the server revision. Reject and
rollback require reasons. **JSON** downloads the BE's validated bundle; editor JSON import
is a staging tool.

## Analytics and solver configurations

Gameplay uses BE aggregates: mission completion funnel, weapon usage and the
stealth-vs-combat histogram. Other tabs: difficulty heat map (map/event/cell size),
AI comparison (capture rate, escape time, coordination score, latency, budget, fallback)
and scalability (p95 latency by agent count). Filters: dates, content version, map code,
solver family/configuration, Human/Replay.

Solver forms switch parameters by algorithm and expose all six QUBO weights. Used
configurations can only be renamed; clone them to tune. New and cloned configurations
start inactive. Human A/B membership is a read-only BE-derived label.

## Contract and verification

`npm run sync:api` regenerates DTO types from `../../backend/shadowvale_be/docs/openapi.json`.
[Integration coverage and gaps](docs/API_INTEGRATION_GAPS.md) lists every operation.

- `npm test`: workflow, numeric controls, analytics maths and API integration (no network).
- `npm run test:ui`: Maestro flows in `tests/maestro/flows` against a local mock API
  (`vite.maestro.config.mjs`, port 15174, accounts `admin`/`designer`/`analyst`, password in
  `tests/maestro/mock-api.mjs`). Needs Maestro and Java 17+. The mock never contacts the BE
  or database.
- `node scripts/contract-preview.mjs`: disposable in-memory API (15079) + FE (15173).

Never run the BE against the shared Supabase database for UI testing.

The login background is the Unity menu artwork (`Assets/_Project/Map01/Resources/Menu/Background.png`)
with the soldier removed: `public/images/shadowvale-menu-landscape.png`.
