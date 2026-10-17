# Maestro UI test report — 13 October 2026

Result: **4/4 flows passed**, 0 failures, 180.717 seconds.

Follow-up: **1/1 authoring/report flow passed**, 93 seconds. Legacy report URLs now
open the report tab inside Content authoring. The standalone sidebar entry is absent;
tab switching retains edits, local report saving preserves unsaved weapon stats,
the shared leave confirmation protects those stats, and reopening loads the saved report.
This follow-up uses the same isolated local API fixture, not the live backend.

Environment: Maestro 2.11.0, verified Eclipse Temurin Java 21 portable runtime,
Windows 11, managed Chromium, headless viewport 1280 × 720.

The real React application ran in API mode against the isolated local fixture
at `http://127.0.0.1:15174`. This verifies UI behavior, not real BE/database,
production deployment, JWT validation, Unity downloads or Git/CI integration.
Animations, transitions and input carets are disabled only in the test server
to stabilize observations. No application data on the hosted service was changed.

| Flow | Result | Duration | Verified behavior |
| --- | --- | --- | --- |
| Login | Passed | 25.657 s | Invalid credentials feedback, show/hide password |
| Admin | Passed | 81.632 s | Redirect into releases, expand Full content and scroll to the final reward, header/close stays available, profile and separate password form |
| Designer | Passed | 58.125 s | Weapon/ammo option lists remain closed, manual value and slider work, unsaved changes require confirmation before discarding |
| Preferences | Passed | 15.269 s | English/Vietnamese and light/dark switching |

Additional read-only inspection of the Maestro-controlled browser confirmed
`disabled === true` on weapon item and ammo item controls. Build, lint and all
62 existing unit/integration-adapter tests also passed.

## Fixed during testing

Login could redirect to Dashboard after authentication even when a valid
`redirect` parameter specified another permitted page. The authenticated render
branch now uses the same role-checked `safeRedirect` as the submit handler.
The Admin and Designer flows verify both deep links. Stable test identifiers
were added to login controls, content section summaries and relation fields.

## Run again

From the frontend folder:

```powershell
npm run test:ui
```

The local ignored `tests/maestro/java-home.local` file selects the portable Java
runtime on this machine. Other machines must set `JAVA_HOME` or pass `-JavaHome`.
See [setup and flow notes](../tests/maestro/README.md) for flags and limitations.

The final JUnit report is `report.xml` in this run's artifact folder; screenshots
are under the timestamped flow folders. These generated files are kept outside
the repository at the configured `-OutputDirectory`. The test server and browser
were stopped after execution.

## Tool limitations

The Windows web driver does not expose generic disabled-state metadata reliably;
the flows verify interaction behavior and use direct DOM inspection as additional
evidence. CSS selectors were replaced with IDs after substantial delays. Native
Windows session heartbeat file-lock warnings are recorded in Maestro logs but
did not prevent the final flows from passing. API security and full backend
workflows require separate real-API tests with test accounts and data.

The user's earlier `setx PATH` command truncated the user PATH to 1,024 characters.
Existing PATH values were backed up for reference; no global PATH repair was
attempted because the original user PATH cannot be reconstructed exactly from
the truncated value. The runner uses the full Maestro path and process-local Java.
