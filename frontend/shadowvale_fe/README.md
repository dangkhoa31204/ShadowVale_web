# ShadowVale internal frontend

React 19 + TypeScript + Vite web platform for content authoring, review/publish and
telemetry analytics. The backend, database and Unity project are separate.

## Đối chiếu proposal — đọc trước khi sửa (team & AI)

Nguồn sự thật là proposal `ShadowVale_RBL_Capstone_Proposal.docx`: mục 3.1.c
Functional Requirements (Content & Balancing Platform, Telemetry & Analytics Dashboard),
3.1.d Non-functional và 3.2.a stack web. Web FE phải khớp proposal
**không thừa, không thiếu**. Không sửa proposal để hợp thức hoá code.

### Quy tắc phân loại (cố định, áp cho mọi màn, panel, cột, nút, chỉ số)

- **Giữ:** thứ proposal gọi tên, và phương tiện tối thiểu để dùng chúng: đăng nhập; tìm, lọc,
  phân trang danh sách; hộp xác nhận; thông báo lỗi; chọn dữ liệu.
- **Bỏ:** mọi màn, panel, cột, nút, chỉ số mà không câu nào trong proposal yêu cầu, kể cả khi
  "tiện" hay "có ích".
- **BE quy định khác proposal:** FE làm theo BE và ghi vào mục "Lệch do BE" bên dưới.
- Ngoại lệ do nhóm quyết định: ghi ở "Giữ theo quyết định của nhóm".

### Màn hình ↔ yêu cầu proposal

| Màn (route) | Vai trò | Yêu cầu trong proposal |
| --- | --- | --- |
| Login `/login` | Tất cả | Authenticated (JWT) access; role-based access |
| Content authoring `/admin/content` (trang đầu của Designer) | Designer | Authoring maps, enemy archetypes & parameters, loot tables, recipes, quests, weapon stats, with schema validation |
| Review content `/admin/reviews` (trang đầu của Admin) | Admin | Review/approval workflow |
| Versions / Publish versions `/admin/releases` | Designer / Admin | Version history with compare/rollback and one-click publish to a validated JSON bundle |
| Users `/admin/users` | Admin | User/role management (Designer, Analyst, Admin) — role gán trên từng tài khoản |
| Analytics `/admin/analytics` (trang đầu của Analyst) | Tất cả | Tab Gameplay: mission completion funnels, weapon-usage, stealth-vs-combat distributions · Heatmap: difficulty heat maps · AI comparison: capture rate, escape time, coordination score per content version |
| Analytics → Solver configurations | Xem: tất cả · Sửa: Analyst, Admin | Admin "configuration": cấu hình duy nhất BE hỗ trợ là cấu hình solver (classical vs quantum-inspired) |
| Change password `/admin/change-password` | Tất cả | Giữ theo quyết định của nhóm (xem dưới) |

Số màn: Designer 5 (Login, Content authoring, Versions, Analytics, Change password),
Analyst 3 (Login, Analytics, Change password), Admin 6 (Login, Review content, Publish versions,
Users, Analytics, Change password). Admin mở Analytics và Change password từ menu **Account**.

### Đã bỏ vì nằm ngoài proposal (đừng thêm lại)

- Dashboard (Admin), Overview (Designer) và thẻ "Published content" trên sidebar: chỉ lặp lại
  thông tin của Review, Publish và Content.
- Login: ô "Keep me signed in", dải trang trí Author → Review → Publish.
- Content: import editor JSON, nút Delete version.
- Versions: nút Download JSON (bundle do game tải từ BE, không cần tải tay).
- Analytics: tab Scalability (thuộc phần nghiên cứu O4, đo trên benchmark); ở AI comparison các
  cột Sessions, Encounters, p95, Within budget, Fallback; bảng chi tiết weapon và dòng ghi chú
  stealth; ô tổng quan Sessions / Players / Average duration; biểu đồ Session outcomes, Daily
  sessions; tab Version comparison. Demo: các ô KPI và cột Results / p95 / Within budget /
  Fallback. Endpoint BE tương ứng (`/analytics/overview`, `/analytics/versions/compare`,
  `/analytics/ai/scalability`, `/content-versions/{id}/bundle`, `DELETE /content-versions/{id}`)
  giữ nguyên ở BE, FE không gọi.
- Change reports, game delivery (Git/CI, game assets), Profile, song ngữ EN/VI, giao diện sáng,
  xuất CSV/JSON ở Analytics, panel Skill, `player_id` trong telemetry demo.
- Trang Roles và Settings, đăng ký công khai, quên mật khẩu, lệnh demo quản lý user/cấu hình,
  các trang/layout/component template cũ.

### Giữ lại dù proposal không gọi tên (có căn cứ hoặc là phương tiện)

- Bảng Items, Consumables, Skills trong Content: "fully data-driven content", "content fully
  separated from code", Package 5 có skills; weapons/loot/recipes/rewards tham chiếu items.
- Advanced JSON trong Content: cách duy nhất để sửa các trường kiểu JSON (ví dụ objectives).
- Duplicate record, Clone returned version: phương tiện soạn content.
- Bộ lọc Human/Replay: tách dữ liệu "deterministic replay harness" khỏi người chơi thật.
- Hai lớp heat map (player death, player spotted): đều là "difficulty heat map".
- Demo mode: trình diễn khi không có BE.

### Giữ theo quyết định của nhóm

- Trang Change password (tự đổi mật khẩu).
- Cột "Last sign-in" ở Users.

### Lệch do BE (FE không tự sửa được)

- Analyst phải nhập GUID khi lọc theo content version vì BE chỉ cho Admin/Designer đọc danh sách
  version.

### Quyết định đã chốt

- **Stack đúng mục 3.2.a:** Tailwind + shadcn/ui, React Query (TanStack Query), Recharts.
  Không thêm thư viện UI/chart khác.
- **Trình duyệt:** proposal ghi Chrome/Firefox/Edge 100+, Tailwind 4 chính thức hỗ trợ
  Chrome/Edge 111+, Firefox 128+. Nhóm **giữ Tailwind 4 và không sửa proposal**. Trên
  Chrome/Edge 100–110 và Firefox 100–127 một số màu bán trong suốt (ví dụ `bg-success/10`)
  có thể lệch; bố cục và chức năng vẫn chạy. Nếu cần chứng minh 100+: thử trên Chrome 100 /
  Firefox 115 ESR rồi đổi màu bán trong suốt sang token màu đặc — không hạ Tailwind.
- **Analytics dành cho cả ba role:** Designer cân bằng game dựa trên dữ liệu chơi
  ("evidence-based balancing").

### Nhật ký thay đổi (nhánh `feat/fe-align-proposal`, tạo từ `dev`)

1. Bỏ các phần ngoài proposal; admin được so sánh version ở demo mode; nâng `axios` 1.20.0.
2. Tailwind 4 + shadcn/ui (Radix, nova) + TanStack Query; bảng màu olive đặt vào token shadcn,
   chỉ theme tối.
3. Mọi màn dùng shadcn (Card, Field, Table, Tabs, Dialog, AlertDialog thay `window.confirm`,
   DropdownMenu, sonner, icon lucide) và React Query cho dữ liệu server.
4. Analytics vẽ bằng Recharts; demo có funnel nhiệm vụ, stealth vs combat và lớp Detections.
5. Soát toàn bộ chữ/nút/cột/bộ lọc của mọi màn theo quy tắc phân loại ở trên và bỏ phần thừa.
6. Publish một lần bấm: BE cho phép bỏ trống lý do publish (rollback vẫn bắt buộc lý do).

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
  Shared building blocks: `features/shared/ui.tsx` (Icon, PageHeading, Panel, Status, Empty),
  `Modal.tsx` (Dialog), `confirm.tsx` (AlertDialog `useConfirm`).
- **TanStack Query** for server data: workspace (`features/content/WorkspaceProvider.tsx`),
  content editor and enums, comparisons, users, analytics and solver configurations; writes
  are mutations. `src/lib/queryClient.ts` does not retry 4xx and the cache is cleared whenever
  the signed-in user changes.
- **Recharts** through shadcn `chart` (`features/analytics/charts.tsx`): single-series bars in
  `--chart-1`; heat maps use one hue (`--chart-3`) with opacity. Colours were validated for the
  dark card surface (lightness band, chroma, colour-blind separation, 3:1 contrast).
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
| Version history, detail, comparison | Yes | — | Yes |
| Publication history | — (BE restriction) | — | Yes |
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

Validate, submit, approve/reject, publish and rollback use BE endpoints. Two Admin steps,
as in the proposal: **Approve** in Review content (one button; feedback is required only when
returning), then **Publish version** in Publish versions — one click, no dialog (the BE
publish note is optional since this branch). Admin review loads the changes before enabling
approval and rechecks the server revision. Return and rollback require a reason.

## Analytics and solver configurations

Gameplay uses BE aggregates: mission completion funnel, shots per weapon and the
stealth-vs-combat histogram. Heatmap: map, event type (player death / spotted) and cell
size. AI comparison: capture rate, escape time and coordination score per content version
and solver group (configuration or family). Filters: dates, content version, map code,
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
