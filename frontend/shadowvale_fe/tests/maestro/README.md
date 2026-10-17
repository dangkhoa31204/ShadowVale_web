# Maestro local UI checks

Verification 17 October 2026: all six current scenarios passed across the full run
and focused reruns after fixture/selector fixes. Build, lint and 53 FE tests passed.
Production fixture checks also verified Designer/Admin reload and account switching.

Historical results before the dev UI migration are in the
[UI test report](../../docs/MAESTRO_UI_TEST_REPORT.md). Current flows target the
shadcn UI and the Designer presentation rules; use the latest JUnit results.

These flows exercise the real React UI in API mode against an isolated in-memory
API fixture. They do **not** verify BE/database integration or modify hosted data.
Unknown fixture endpoints return 501 instead of forwarding to BE. Test accounts
are `admin`, `designer`, `analyst`, password `UiTest123!`; these exist only in this
test server. Never use the fixture config to build or deploy the application.

Start the test server from this frontend folder:

```powershell
npm exec vite -- --config vite.maestro.config.mjs
```

Or run the complete Windows workflow (start server, tests, cleanup):

```powershell
npm run test:ui -- -JavaHome 'C:\path\to\java' -MaestroPath 'F:\maestro\maestro\bin\maestro.bat'
```

On this machine `tests/maestro/java-home.local` already points to the verified
portable Java 21 runtime, so `npm run test:ui` works directly. That file is
ignored by Git; other machines must provide Java with the argument above or
`JAVA_HOME`. No global PATH changes are required.

Use `-ScreenSize 390x600` to check a smaller viewport. Artifacts go to a dated
directory under `%TEMP%` unless `-OutputDirectory` is supplied. The runner only
stops the Vite process it started and refuses to use an occupied test port.

Run the flows with Java 17+ and your installed Maestro CLI:

```powershell
& 'F:\maestro\maestro\bin\maestro.bat' test --headless --screen-size=1280x720 --format=JUNIT --output="$env:TEMP\shadowvale-maestro\report.xml" --test-output-dir="$env:TEMP\shadowvale-maestro" tests/maestro/flows
```

Maestro web support is beta and downloads its managed Chromium on first run.
Sources: [Web browsers](https://docs.maestro.dev/get-started/supported-platform/web-browser),
[CLI flags](https://docs.maestro.dev/maestro-cli/maestro-cli-commands-and-options).

## Covered UI behavior

- Invalid login feedback and show/hide password.
- Login redirect into Admin releases, Full content scrolling to the final
  expanded record, fixed dialog header/close button and change password navigation.
- Designer weapon/ammo relations cannot open their option lists, manual numeric input synchronized
  with the slider, and confirmation when discarding unsaved edits.
- Archived submissions are hidden from Admin Review, including an archived deep link.
- Archived releases and their filter option are hidden from Designer Versions.
- Seven content groups retain access to child tables while unsupported settings stay hidden.

The dev branch removed preferences, Profile and change reports; the corresponding
old flows are intentionally absent.

Use IDs/accessibility identifiers where possible. In Maestro 2.11 on Windows,
CSS selectors can be slow or fail; these flows use IDs and user-visible text.
The web hierarchy does not expose the generic `enabled: false` selector, so
relation locks are checked by attempting to open their option lists. Additional
read-only browser diagnostics confirmed the actual `disabled` properties.
Native Windows can also log session heartbeat file-lock warnings; flow outcomes
must be taken from the JUnit report. The modal uses swipes inside its content
region because ordinary web scroll commands target the background window.

## Windows PATH warning

`setx PATH "%PATH%;..."` truncates long PATH values to 1,024 characters. Avoid
running it again. Maestro can be run by its full path without changing PATH.
The exact previous user PATH cannot be reliably reconstructed from a truncated
value alone; retain a terminal opened before the command and back up its process
PATH before any repair. Java for this run is portable and sets `JAVA_HOME` only in
the current process.

## Production reload regression

The development server uses React StrictMode effect replay and can hide the
workspace cache race. Check a production build as well: sign in with a fixture
account, reload `/admin/content` (Designer) or `/admin/reviews` (Admin), and verify
the workspace renders. Repeat after signing out and switching accounts.

Use `vite preview --config vite.maestro.config.mjs --host 127.0.0.1 --port 15175`
after building with `VITE_API_BASE_URL=/api` and `VITE_DEMO_MODE=false`. The preview
middleware uses the same isolated fixture API and never forwards to the real BE.
