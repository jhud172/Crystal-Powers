param(
    [switch]$SkipTests,
    [switch]$RunAfterBuild,
    [int]$Port = 8080
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

function Invoke-Step {
    param(
        [string]$Name,
        [scriptblock]$Command
    )

    Write-Host ""
    Write-Host "==> $Name" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) { throw "$Name failed with exit code $LASTEXITCODE." }
}

if (-not (Test-Path -LiteralPath ".\gradlew.bat")) {
    throw "Gradle wrapper not found. Run this script from the project root."
}

if (-not (Test-Path -LiteralPath ".\frontend\package.json")) {
    throw "Frontend package.json not found. Expected .\frontend\package.json."
}

Invoke-Step "Installing frontend dependencies" {
    Push-Location ".\frontend"
    try {
        npm ci
    } finally {
        Pop-Location
    }
}

Invoke-Step "Building frontend" {
    Push-Location ".\frontend"
    try {
        npm run build
    } finally {
        Pop-Location
    }
}

if (-not $SkipTests) {
    Invoke-Step "Running backend tests" {
        $env:SKIP_FRONTEND_BUILD = "true"
        .\gradlew.bat test
    }
} else {
    Write-Host ""
    Write-Host "==> Skipping backend tests" -ForegroundColor Yellow
}

Invoke-Step "Packaging Spring Boot jar" {
    $env:SKIP_FRONTEND_BUILD = "true"
    if ($SkipTests) {
        .\gradlew.bat bootJar -x test
    } else {
        .\gradlew.bat bootJar
    }
}

if ($RunAfterBuild) {
    Invoke-Step "Starting Spring Boot app on port $Port" {
        $env:SKIP_FRONTEND_BUILD = "true"
        $env:BOOTRUN_PORT = "$Port"
        .\gradlew.bat bootRun --args="--spring.profiles.active=local"
    }
} else {
    Write-Host ""
    Write-Host "Build complete. Run '.\build.ps1 -RunAfterBuild' to build and start the app." -ForegroundColor Green
}
