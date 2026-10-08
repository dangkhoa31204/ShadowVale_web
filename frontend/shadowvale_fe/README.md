# ShadowVale internal frontend

React + TypeScript + Vite portal for the game team. The active application starts at
`/login` and uses the Designer, Analyst and Admin roles. Player gameplay stays in Unity.

## Run

Use Node.js 22.6+ (Node.js 24 recommended).

```sh
npm ci
npm run dev
npm run build
npm run lint
npm test
```

Development explicitly enables the frontend demo through `.env.development`.
The login screen can fill the three fixed demo accounts:

| Email | Role |
| --- | --- |
| designer@shadowvale.dev | Designer |
| analyst@shadowvale.dev | Analyst |
| admin@shadowvale.dev | Admin |

All three use `ShadowVale123!`. These are local demonstration credentials.
The demo token deliberately uses a `demo:` prefix and is **not a JWT**.
No simulated account can authenticate against the production API.

Demo content and account changes persist in browser localStorage under
`shadowvale_internal_workspace_v1`. Remove only that key through browser devtools
to reset sample data. New demo accounts update the directory but do not gain
login credentials; deactivation and role changes apply to existing demo accounts
on subsequent login. Demo analytics are explicitly synthetic.

Production builds default to API mode. Set `VITE_API_BASE_URL` to your backend's
API prefix, e.g. `https://api.yourgame.com/api/v1`; keep `VITE_DEMO_MODE=false`.
For a production build you intend only to demo, explicitly set
`VITE_DEMO_MODE=true`. Vite environment variables are public build configuration,
so do not put credentials or signing keys in them.

## Structure

```text
src/
  config/                 environment and demo settings
  contexts/               session provider and context
  features/
    auth/                 sign in, roles, permissions, access pages
    dashboard/            content overview and audit activity
    content/
      contracts/          Unity schema v1 and adapted demonstration data
      types.ts            bundle, workspace and command types
      validation.ts       JSON Schema, references, checksum and comparison
      workflow.ts         pure command transitions with permission checks
      workspaceService.ts demo persistence / API adapter
      ContentPage.tsx     authoring and bundle import
    releases/             review, publish, restore and compare
    analytics/            version/map filters and solver comparison
    administration/       retained account/configuration components (unmounted)
    shared/               UI primitives and formatting
  layouts/InternalLayout.tsx
  internal.css            current layout and responsive behavior
  original-theme.css      original repo colors, fonts and component styling
  routes/                 protected, lazy-loaded internal routes
  services/               HTTP, auth and session storage
tests/workflow.test.ts      domain regression tests
```

Older pages, layouts and marketing route definitions remain in the repository
for reference. The active router does not mount them or provide public
registration, blogs, marketing management or a player portal. Existing
`/admin/assets` and `/admin/entity-editor` links redirect to authoring.

## Role access

| Capability | Designer | Analyst | Admin |
| --- | :---: | :---: | :---: |
| Overview | Yes | Yes | — |
| Version history / JSON export | Yes | Yes | Yes |
| Author own drafts and submit for review | Yes | — | — |
| Review and approve / request changes | — | — | Yes |
| Publish and restore | — | — | Yes |
| Telemetry and AI comparison | — | Yes | — |

The shared policy in `features/auth/access.ts` controls navigation and routes.
Demo commands also enforce permissions and current directory access.
These client checks are for UX; the backend must enforce authorization.

Admin opens at `/admin/reviews` and has exactly two navigation entries:
Review content and Publish versions. Admin does not inherit Designer or Analyst
access. User/role/configuration pages are not mounted in the active router.
Review shows field-level before/after changes, category filters and the full
read-only submission. Approved, returned and published submissions remain
inspectable. Published versions also provide View changes and Full content.
Version details expand directly beneath the selected table row. The visual theme
uses the original repository's Tailwind palette and typography; role routes and
the current author/review/publish layout remain unchanged.

## Content workflow

1. Create a draft from the active release.
2. Edit weapons, enemies, loot tables, recipes, quests, maps, items and AI settings.
   Scalar values have forms; nested arrays and objects use the JSON editor.
   Duplicate an existing record to add content, or import a complete valid bundle.
3. Save the draft, including unfinished data. Schema/reference issues are visible.
4. Submit only a valid draft. Submitted content is locked.
5. Admin approves a validated snapshot or returns it with required feedback.
6. Admin publishes an approved snapshot with a unique version. Publishing
   revalidates the bundle, records an audit event and selects the active release.
7. Export JSON or compare releases. Restore selects a previous validated release
   and records the change without modifying historical bundles.

Edits use revision numbers to reject stale saves. Changing returned content
clears old review metadata. Unsaved edits are guarded during page navigation
and browser unload.

## Unity contract

The checked-in schema is copied from:
`G:/game/ShadowVale/Assets/StreamingAssets/Content/content.schema.json`.
The frontend uses snake_case fields matching the Unity ContentBundle classes.
The adapted demo seed omits the two `items` with category `weapon` in the game's
fallback file: those entries conflict with its current item-category enum.
The game repository has not been changed. Resolve that contract discrepancy
in the shared backend schema before importing the unmodified fallback bundle.

Schema validation uses AJV's draft-07 support. Additional checks enforce unique
content IDs, ammunition categories, references, loot quantity bounds, node
indices and quest targets. Published JSON includes `bundle_version`,
`schema_version`, `published_at` and `checksum`.

Demo checksum format: `sha256:<lowercase hex>`, computed from UTF-8 canonical JSON
with recursively sorted object keys and the `checksum` field omitted, after
adding `published_at`. Arrays preserve order. The production backend must agree
on its checksum convention; the API's returned bundle remains authoritative.

Unity currently requests:
- `GET /api/v1/content/bundles/active`
- `GET /api/v1/content/bundles/{version}`
- `POST /api/v1/telemetry/sessions`

Exporting JSON in demo does not upload a bundle to a backend or connect the game
to this browser's localStorage.

## Backend integration contract

The backend in this repository currently has no implemented API. The following
is the frontend adapter contract to implement, not a claim of deployed endpoints.
Game build review/publishing screens use frontend demo data in demo mode and API
adapters in API mode. See [Game delivery UI contract](src/features/gameDelivery/README.md).
All paths below are relative to `VITE_API_BASE_URL`.

| Endpoint | Request / response |
| --- | --- |
| `POST /auth/login` | `{ email, password }` → `{ token, user }` |
| `GET /auth/me` | Verified JWT → current `User` |
| `GET /internal/workspace` | Role-scoped `Workspace` |
| `POST /internal/commands` | `Command` → updated role-scoped `Workspace` |
| `GET /telemetry/analytics/sessions?days=7&content_version=1.0.0` | Anonymized `TelemetrySession[]` |

See `types/user.ts`, `features/content/types.ts` and
`features/analytics/analyticsService.ts` for exact TypeScript data shapes.
Session requests send `Authorization: Bearer <token>`; HTTP 401 clears auth
storage and the React session. Session restoration calls `/auth/me` instead
of trusting a locally stored role. Remember-me chooses localStorage; other
sessions use sessionStorage, and previous storage is cleared when logging in.

Commands must be processed atomically against server data and current roles:
reject stale revisions (409), forbidden actions (403), invalid schema/references
(422), duplicate versions, invalid state transitions and self-removal. Preserve
at least one active admin. Return friendly error messages for the client.
Server review and publishing checks must not rely on client validation.
Workspace responses should omit user administration data and other users'
drafts for roles without access. Publish/restore must change the Unity active
bundle endpoint atomically and maintain an authoritative audit log.

Telemetry responses should contain anonymous IDs only. AI comparisons show
descriptive cohort metrics: capture rate, mean escape time for uncaptured
sessions, coordination score and p95 solver latency. Match seeds and compute
budgets in the experimental pipeline before drawing research conclusions.

## Validation

`npm test` covers schema/reference errors, role permissions, safe redirects,
draft transitions, snapshot locks, stale revisions, duplicate versions,
publication/checksum, restore, account safeguards and content diffs.

The frontend can be hosted at `admin.yourgame.com`. Configure DNS/HTTPS, the
backend's CORS policy and SPA fallback to `index.html` in your hosting setup.
This refactor does not deploy the app or configure a domain.
