# Maestro local UI checks

Latest verified run: **4/4 flows passed**. See the
[13 October 2026 report](../../docs/MAESTRO_UI_TEST_REPORT.md).

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
  expanded record, fixed dialog header/close button, profile and password page.
- Designer weapon/ammo relations cannot open their option lists, manual numeric input synchronized
  with the slider, and confirmation when discarding unsaved edits.
- English/Vietnamese and light/dark preferences.
- Embedded change report: legacy links open Content authoring, switching tabs retains
  pending stats/report edits, saving a local report preserves unsaved stats, and saved
  reports survive leaving and reopening the version (flow `05-authoring-report.yaml`).

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
