param(
    [string]$JavaHome = $env:JAVA_HOME,
    [string]$MaestroPath = 'F:\maestro\maestro\bin\maestro.bat',
    [string]$ScreenSize = '1280x720',
    [string]$Flow = 'tests/maestro/flows',
    [string]$OutputDirectory = (Join-Path $env:TEMP ('shadowvale-maestro-' + (Get-Date -Format 'yyyyMMdd-HHmmss')))
)
$ErrorActionPreference = 'Stop'
$frontend = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$localJava = Join-Path $PSScriptRoot 'java-home.local'
if (!$JavaHome -and (Test-Path -LiteralPath $localJava)) { $JavaHome = (Get-Content -LiteralPath $localJava -Raw).Trim() }
if (!(Test-Path -LiteralPath $MaestroPath)) { throw 'Maestro not found. Pass -MaestroPath with your installed CLI path.' }
if (!$JavaHome -or !(Test-Path -LiteralPath (Join-Path $JavaHome 'bin\java.exe'))) { throw 'Java 17+ required. Pass -JavaHome or set JAVA_HOME in this terminal.' }
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$originalJavaHome = $env:JAVA_HOME
$originalAnalytics = $env:MAESTRO_CLI_NO_ANALYTICS
$originalNotification = $env:MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED
$server = $null
$exitStatus = 1
try {
    $env:JAVA_HOME = $JavaHome
    $env:MAESTRO_CLI_NO_ANALYTICS = 'true'
    $env:MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED = 'true'
    # Prevent accidentally testing another process or a real API on this port.
    if (Get-NetTCPConnection -State Listen -LocalPort 15174 -ErrorAction SilentlyContinue) { throw 'Port 15174 is occupied. Stop the previous UI test server first.' }
    $node = (Get-Command node -ErrorAction Stop).Source
    $server = Start-Process -FilePath $node -ArgumentList @('node_modules/vite/bin/vite.js', '--config', 'vite.maestro.config.mjs') -WorkingDirectory $frontend -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $OutputDirectory 'server.log') -RedirectStandardError (Join-Path $OutputDirectory 'server-error.log')
    $ready = $false
    $deadline = (Get-Date).AddSeconds(60)
    while ((Get-Date) -lt $deadline -and !$server.HasExited) {
        try { $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:15174/login' -TimeoutSec 2; $ready = $response.StatusCode -eq 200 } catch { }
        if ($ready) { break }
        Start-Sleep -Milliseconds 500
    }
    if (!$ready) { throw ('UI test server failed to start. See ' + $OutputDirectory) }
    Push-Location $frontend
    try {
        & $MaestroPath test --headless "--screen-size=$ScreenSize" --format=JUNIT "--output=$(Join-Path $OutputDirectory 'report.xml')" "--debug-output=$OutputDirectory" "--test-output-dir=$OutputDirectory" $Flow
        $exitStatus = $LASTEXITCODE
    } finally { Pop-Location }
} finally {
    if ($server -and !$server.HasExited) { Stop-Process -Id $server.Id -ErrorAction SilentlyContinue }
    $env:JAVA_HOME = $originalJavaHome
    $env:MAESTRO_CLI_NO_ANALYTICS = $originalAnalytics
    $env:MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED = $originalNotification
    Write-Host "UI test artifacts: $OutputDirectory"
}
exit $exitStatus
