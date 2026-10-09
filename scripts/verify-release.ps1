param(
    [string]$JavaHome = $env:JAVA_HOME,
    [string]$JavaSocketTempDirectory
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$environmentNames = @('JAVA_HOME', 'JAVA_TOOL_OPTIONS', 'TEMP', 'TMP', 'SKIP_FRONTEND_BUILD')
$savedEnvironment = @{}
foreach ($name in $environmentNames) {
    $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}

function Assert-ExitCode([string]$step) {
    if ($LASTEXITCODE -ne 0) { throw "$step failed with exit code $LASTEXITCODE." }
}

Push-Location $projectRoot
try {
    if ($JavaHome) {
        if (-not (Test-Path -LiteralPath (Join-Path $JavaHome 'bin/java.exe')) -or
            -not (Test-Path -LiteralPath (Join-Path $JavaHome 'bin/javac.exe'))) {
            throw 'JavaHome must contain an installed Windows JDK.'
        }
        $env:JAVA_HOME = $JavaHome
    }
    if ($JavaSocketTempDirectory) {
        if ($JavaSocketTempDirectory -notmatch '^[A-Za-z]:[\\/]' -or
            $JavaSocketTempDirectory -match '[\s"\x00-\x1f]' -or
            $JavaSocketTempDirectory.Length -gt 70) {
            throw 'Use a short absolute Java socket temporary path without spaces or quotes.'
        }
        # On this device Java cannot connect its selector wake-up socket in the
        # profile temporary directory. A separate short path works; scope it to
        # verification and restore the calling process environment afterwards.
        New-Item -ItemType Directory -Path $JavaSocketTempDirectory -Force | Out-Null
        $env:TEMP = $JavaSocketTempDirectory
        $env:TMP = $JavaSocketTempDirectory
        $env:JAVA_TOOL_OPTIONS = "$($env:JAVA_TOOL_OPTIONS) -Djava.io.tmpdir=$JavaSocketTempDirectory -Djdk.net.unixdomain.tmpdir=$JavaSocketTempDirectory".Trim()
    }
    if (-not (Test-Path -LiteralPath 'frontend/node_modules')) {
        throw 'Restore the locked frontend dependencies with authorised npm ci before verification.'
    }

    & npm.cmd --prefix frontend run build
    Assert-ExitCode 'Frontend production build'
    & node frontend/scripts/verify-animation-contract.mjs
    Assert-ExitCode 'Animation contracts'
    & python assets/blender/prepare_web_assets.py
    Assert-ExitCode 'Blender web asset contracts'

    $env:SKIP_FRONTEND_BUILD = '1'
    & .\gradlew.bat test bootJar --no-daemon --rerun-tasks
    Assert-ExitCode 'Backend tests and packaged application'
    & git diff --check
    Assert-ExitCode 'Whitespace validation'
    Write-Host 'Release build and automated checks passed. Hosted boot and provider checks remain separate.'
} finally {
    foreach ($name in $environmentNames) {
        [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name], 'Process')
    }
    Pop-Location
}
