# ShadowVale internal frontend

React + TypeScript + Vite. This delivery changes only the frontend and its connection configuration; the backend, database and Unity project are unchanged.

## Run against the existing BE

```sh
npm ci
npm run dev
npm run build
npm run lint
npm test
```

Use Node.js 22.6+ (24 recommended). Development defaults to real API mode:
`VITE_DEMO_MODE=false`, `VITE_API_BASE_URL=/api`. Vite proxies `/api` to
`http://localhost:5079`. Start the existing BE separately and use accounts issued
by that BE. API failures never switch to demo data.

For production, configure the web server to proxy `/api` to the BE, or set
`VITE_API_BASE_URL` to the deployed API URL before building and configure the
BE's existing CORS policy accordingly. Vite environment values are public:
never put JWTs, database credentials or `X-Game-Key` in them.

Optional demo: put `VITE_DEMO_MODE=true` in `.env.local` and restart Vite.
The three demo accounts are `designer@shadowvale.dev`,
`analyst@shadowvale.dev`, `admin@shadowvale.dev`, password `ShadowVale123!`.
Demo reports/workflows/analytics are synthetic and separate from real API mode.

## Roles and interface

The original dark visual system and the current author/review/publish layout
are retained, with the existing MIT-licensed
[TailAdmin adaptation](src/template/tailadmin/README.md).

| Feature | Designer | Analyst | Admin |
| --- | --- | --- | --- |
| Author and submit own content drafts | Yes | No | No |
| Local change reports and images | Yes | No | No |
| Review / approve / reject | No | No | Yes |
| Publish / rollback | No | No | Yes |
| Content version metadata / detail / comparison | Yes | No (BE restriction) | Yes |
| Publication history | No (BE restriction) | No | Yes |
| Game analytics version comparison | Yes | Yes (manual GUID) | Yes |
| Runtime bundle download | Yes | No | Yes |
| Analytics / solver list and detail | Yes | Yes | Yes |
| Solver create / edit / clone / activate / delete | No | Yes | Yes |
| CSV export dialog | No | Yes | Yes |

Admin has four sidebar links: **Dashboard**, **Review content**, **Publish versions** and **Users**.
Open **Account → Profile**, **Account → Change password** or **Account → Analytics**.
Profile and password security are separate pages. Designer and Analyst have
an Analytics navigation link. Language (EN/VI) and light/dark theme can be selected
in the header and Login. Login/Profile use the Unity landscape with the soldier
removed; see [UI handoff](docs/USER_PROFILE_APPEARANCE.md) and [latest dev sync](docs/FINAL_SYNC_2026-10-10.md).

## Content and workflow

All 14 editor tabs remain. Their child records are grouped into seven parent
resources when saving: item weapons/consumables; loot table entries; map enemy
placements/loot references; recipe ingredients; quest rewards. Relations use
codes, resource URLs use GUIDs. Map details are fetched before editing. API DTOs,
enums and numeric limits drive the forms; numbers support sliders and manual
entry. Existing codes and item types are locked.

Save sends only changed parent resources, in dependency order. References must
be removed before deleting the target. A failed sequential save lists committed
and remaining resources and preserves edits for retry. The BE has no atomic bulk save or entity CRUD revision precondition. Metadata and
workflow requests now send the required revision; entity writes still need a
preflight check and cannot provide transaction-level concurrency guarantees.

Validate, submit, approve/reject, publish and rollback use BE endpoints. Editing
rejected content uses BE's automatic transition back to Draft. Admin review shows
added/removed/modified records and BE-provided before/after values, loads changes before
enabling approval and rechecks server revision before deciding. Reject and
rollback require reasons. Publication history and checksums come from the BE.

**JSON** downloads the original response from the BE bundle endpoint. The flat
14-table **editor JSON** import is a staging tool. The latest BE now uses the same
DB schema 1.0 shape for runtime content, but only its validated bundle endpoint
provides the authoritative runtime bytes/checksum. A local review package is a
separate attachment format.

## Reports and missing capabilities

Report text stays in browser localStorage scoped to the account and content
version. Images stay in IndexedDB, up to 2 MB per PNG/JPEG/WebP. The screen labels
them **Local draft — chưa đồng bộ server**. Save and export work locally; server
submission is disabled. Sending the gameplay content for review remains independent.
Admin never sees a local report as a server submission.

Git/CI integration, screenshot uploads and binary model/map/graphics bundles have
no BE APIs yet. The related screens show that limitation rather than report a
successful upload or publication.

## Analytics and solver configurations

The API overview uses BE aggregates for outcomes, mission funnel, weapon usage
and playstyle. Other tabs provide map/event/cell-size heatmaps, AI comparison,
latency by agent count, and two-column content version analytics. Shared filters
include dates, version, manually entered map code, solver/family, and Human/Replay.
CSV supports sessions, events, encounters and coordination-results.

Solver forms switch parameters by algorithm and expose all six QUBO weights
through sliders and manual inputs. Used configurations can only be renamed;
clone them to adjust parameters. New/cloned configurations are inactive.
Human A/B membership is a read-only BE-derived label, not a user-editable flag.

## Contract and verification

`npm run sync:api` regenerates DTO types/schema and the operation inventory from
`../../backend/shadowvale_be/docs/openapi.json`. The current contract has **81**
operations, rather than the 72 counted in the initial plan. The BE was synchronized from dev commit
f2c8b8c. Version routes now use /api/content-versions; publication history is
Admin-only. The generator also reads the current public C# version DTOs because
OpenAPI omits those response schemas, and resolves the WeaponDto naming collision
without modifying BE files.

[Integration coverage, gaps and handover](docs/API_INTEGRATION_GAPS.md)
lists every operation and distinguishes contract tests/fixture UI verification
from testing against a running BE/database.

For isolated developer UI QA, `node scripts/contract-preview.mjs` runs a disposable
in-memory API on 15079 and FE on 15173. It uses explicit test-only accounts;
it never contacts the BE or database and is not a production/demo fallback.
