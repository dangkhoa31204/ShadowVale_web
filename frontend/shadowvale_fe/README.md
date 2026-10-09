# ShadowVale internal frontend

React + TypeScript + Vite for Designer, Analyst and Admin. This change is frontend
only: forms, labels, validation, local demo state and API adapters. It does not
change the database, backend, Git/CI pipeline or Unity project.

## Run

Use Node.js 22.6+ (Node.js 24 recommended).

```sh
npm ci
npm run dev
npm run build
npm run lint
npm test
```

Development enables demo mode through `.env.development`. The login screen fills
three sample accounts: `designer@shadowvale.dev`, `analyst@shadowvale.dev`,
`admin@shadowvale.dev`, all using `ShadowVale123!`. These credentials and the
`demo:` token are local examples, not production credentials or JWTs.

Demo content persists under `shadowvale_internal_workspace_db_v3`; game delivery
uses `shadowvale_game_delivery_demo_v3`. The new keys isolate the new DB-shaped
sample data from earlier Unity-shaped samples. Demo analytics are synthetic.
Production defaults to API mode. Set `VITE_API_BASE_URL` and keep
`VITE_DEMO_MODE=false` to connect a real backend. Vite environment variables are
public configuration; do not include secrets.

## Design source

The admin visual system adapts the actual MIT-licensed
[TailAdmin React template](https://github.com/TailAdmin/free-react-tailwind-admin-dashboard):
Outfit typography, dark palette, sidebar navigation, cards, forms and tables.
The Badge and Table primitives are copied and adapted from its source.
[License and attribution](src/template/tailadmin/README.md) are retained locally.
The existing role routes and author/review/publish layout remain in place.
The project keeps Tailwind 3; the template's Tailwind 4 stylesheet is reference
material, and `tailadmin-theme.css` provides the compatible adaptation.

## Role access

| Capability | Designer | Analyst | Admin |
| --- | :---: | :---: | :---: |
| Overview | Yes | Yes | — |
| Content version history / JSON | Yes | Yes | Yes |
| Edit own drafts and submit | Yes | — | — |
| Review / approve / reject | — | — | Yes |
| Publish / rollback | — | — | Yes |
| Telemetry and solver comparison | — | Yes | — |

Admin opens at `/admin/reviews` with only Review content and Publish versions.
Admin does not inherit Designer or Analyst access. User/configuration pages
remain unmounted. Client permission checks support UX; a real backend must
independently enforce access.

## DB v3 forms

The pasted PostgreSQL schema is the source for field names, enums, relations,
precision and nullability. Content authoring exposes all 14 versioned tables:

- `items`, `weapons`, `consumables`, `skills`
- `loot_tables`, `loot_table_entries`, `maps`, `map_loot_tables`
- `enemy_types`, `enemy_placements`
- `crafting_recipes`, `crafting_recipe_ingredients`, `quests`, `quest_rewards`

`schemaFields.ts` defines labels, controls and reference filters. Enum fields use
selects; FK fields choose records from the current content version. Numbers use
synchronized sliders and typed inputs. Sliders show a practical range, while
manual entry supports the wider DB bounds and expands the slider as needed.
Invalid, empty required or over-precision values remain visible for correction
and block saving/submission; they do not silently overwrite a valid value.
Nullable numeric fields can be cleared. Read-only versions disable both controls.
Nested JSON is available in the collapsed Advanced JSON editor.

New records work even when a collection is empty. Duplicate records get unique
codes/UUIDs or unused relation keys; composite identities match the DB. Adding a
relation requires the relevant parent records. Removing referenced rows reports
validation errors until their references are updated.

Content versions use `version_no` (read-only number), `label`, `changelog`,
`parent_version_id`, `revision` and `schema_version` (`"1.0"`). Backend-managed
bundle/checksum/timestamps are not editable fields. Compatibility aliases in the
UI types keep existing auth/adapters working; adapters should map them to DB
columns when integrating the backend.

## Review and publication

The UI workflow follows `draft → in_review → approved → published`. Rejection
sets `rejected`; the author explicitly resumes it as `draft`. Previous published
versions become `archived`. Revision changes on content edits and guards stale
commands. Review compares against `parent_version_id`, displays field changes and
all content sections. View changes expands the selected version in its table.

Publish and rollback require a nonempty reason. Publication history shows
`action`, target/previous content version, reason, actor and occurrence time.
Demo state maintains one published version. Historical snapshots are immutable.
This is an FE demonstration; actual transactions and bundle generation belong
to the backend.

`contracts/content.schema.json` validates this FE's DB-shaped data with AJV
(draft-07). Additional FE checks cover PK/FK relations, fixed item types,
quantity bounds and exactly one Safe Camp. The seed is synthetic DB v3 data,
not a copy of the old Unity fallback bundle. Published demo checksum uses 64
lowercase hex characters matching `bundle_checksum`; its canonical JSON rule is
only a demo convention. Use the backend's authoritative bundle and checksum in
production. Existing Unity classes may require a separate agreed adapter.

## Analytics

The FE model uses `game_sessions`, `telemetry_events`, `solver_configurations`
and `coordination_results`. Outcomes, algorithms, solver families and tasks
follow the provided enums. Map filtering joins map-bearing events/results to
sessions. Weapon use derives from event payloads; skill progress likewise needs
an agreed telemetry payload because no persisted skill-level column was given.
Telemetry is not included in content versions or exposed as authoring CRUD.

## API adapter placeholders

These are proposed FE integration paths relative to `VITE_API_BASE_URL`, not
implemented endpoints added by this change:

| Endpoint | Contract |
| --- | --- |
| `POST /auth/login` | `{ email, password }` → `{ token, user }` |
| `GET /auth/me` | Verified session → `User` |
| `GET /internal/workspace` | Role-scoped `Workspace` |
| `POST /internal/commands` | `Command` → updated `Workspace` |
| `GET /telemetry/analytics?content_version_id=…` | DB-shaped analytics collections |

Exact DTOs are in `features/content/types.ts` and
`features/analytics/analyticsService.ts`. HTTP 401 clears the session. Server
integration must handle permissions, stale revisions, validation and atomic
publication. The browser's localStorage is not a Unity content endpoint.

[Game delivery UI contract](src/features/gameDelivery/README.md) covers the
existing Local Git / CI build previews and game asset bundle screen. Those are
FE demos/API placeholders; the supplied DB has no build/artifact tables. There
is no actual Git sync, binary upload or Unity client update in this change.

## Verification

`npm test` covers DB-shaped validation, references, workflow, revisions,
permissions, checksum, publication/rollback, numeric input rules and the existing
game delivery demo. Build, lint and browser interaction checks verify the FE.
