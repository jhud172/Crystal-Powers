#requires -Version 7.0
[CmdletBinding()]
param(
    [ValidateSet('Pilot', 'Production', 'Candidate')] [string] $Target = 'Pilot',
    [switch] $EmailEnabled,
    [switch] $GoogleEnabled,
    [ValidatePattern('^(0|[1-9][0-9]{0,4})\.(0|[1-9][0-9]{0,4})\.(0|[1-9][0-9]{0,4})\.0$')]
    [string] $Version,
    [ValidatePattern('^[a-fA-F0-9]{64}$')] [string] $Sha256
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if ([bool]$Version -ne [bool]$Sha256) { throw 'Supply the release version and its expected SHA-256 together.' }

$isPilot = $Target -eq 'Pilot'
$origin = switch ($Target) {
    'Pilot' { 'https://crystal-docks-pilot-xpyl.onrender.com/' }
    'Production' { 'https://crystal-powers.com/' }
    'Candidate' { 'http://127.0.0.1:18084/' }
}
$handler = [System.Net.Http.HttpClientHandler]::new()
$handler.AllowAutoRedirect = $false
$handler.UseCookies = $false
$client = [System.Net.Http.HttpClient]::new($handler)
$client.BaseAddress = [uri]$origin
$client.Timeout = if ($isPilot) { [TimeSpan]::FromSeconds(150) } else { [TimeSpan]::FromSeconds(20) }

function Read-Route([string] $Path, [int] $ExpectedStatus) {
    $response = $client.GetAsync($Path).GetAwaiter().GetResult()
    try {
        if ([int]$response.StatusCode -ne $ExpectedStatus) {
            throw "$Path returned $([int]$response.StatusCode); expected $ExpectedStatus."
        }
        $robots = if ($response.Headers.Contains('X-Robots-Tag')) { $response.Headers.GetValues('X-Robots-Tag') -join ',' } else { '' }
        [pscustomobject]@{
            Text = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
            NoIndex = $robots -match '(?i)(^|[ ,])noindex($|[ ,])'
            Location = $response.Headers.Location
        }
    } finally { $response.Dispose() }
}

try {
    $health = (Read-Route 'api/health' 200).Text | ConvertFrom-Json -AsHashtable
    if ($health['status'] -cne 'up') { throw 'The website did not report healthy.' }

    $docksPages = [ordered]@{
        'docks' = 'Crystal Docks for Windows'
        'docks/support' = 'Crystal Docks support'
        'docks/reports' = 'Crystal Docks reports'
    }
    $privatePages = @('docks/reports')
    if (!$isPilot) {
        $docksPages['projects/docks'] = 'Crystal Docks for Windows'
        foreach ($route in 'account/dashboard', 'account/dashboard/docks', 'account/dashboard/hub') {
            $docksPages[$route] = 'Product dashboard'
            $privatePages += $route
        }
    }
    foreach ($route in $docksPages.Keys) {
        $page = Read-Route $route 200
        if (!$page.Text.Contains("<title>$($docksPages[$route]) | Crystal Powers</title>") -or
            ($page.NoIndex -ne ($isPilot -or $route -in $privatePages))) {
            throw "$route returned unexpected page content or indexing rules."
        }
    }
    $null = Read-Route 'api/docks/reports' 401
    if ($Target -eq 'Candidate') {
        foreach ($route in '/', 'about', 'services', 'portfolio', 'support', 'contact', 'accessibility') {
            $existing = Read-Route $route 200
            if ($existing.Text -notmatch '<html\b' -or $existing.NoIndex) {
                throw "$route returned unexpected public page content or indexing rules."
            }
        }
        $product = Read-Route 'docks' 200
        if ($product.Text -notmatch 'src="(/assets/index-[\w-]+\.js)"') {
            throw 'The packaged product page does not reference a built frontend entry.'
        }
        $null = Read-Route $Matches[1] 200
        $null = Read-Route 'docks/unknown-route' 404
    }

    $methods = @{ email = [bool]$EmailEnabled; google = [bool]$GoogleEnabled }
    foreach ($method in $methods.Keys) {
        $availability = (Read-Route "api/docks/auth/$method" 200).Text | ConvertFrom-Json -AsHashtable
        if ($availability['enabled'] -isnot [bool] -or $availability['enabled'] -ne $methods[$method]) {
            throw "$method sign-in availability differed from the expected configuration."
        }
    }

    $feed = 'api/docks/releases/windows-x64'
    $release = (Read-Route $feed 200).Text | ConvertFrom-Json -AsHashtable
    if ($Version) {
        if ($release['version'] -cne $Version -or $release['sha256'] -ne $Sha256) {
            throw 'The download offer differs from the expected signed build.'
        }
        $asset = (Read-Route "$feed/$Version/download" 302).Location
        if (!$asset -or !$asset.IsAbsoluteUri -or $asset.Scheme -ne 'https') {
            throw 'The download does not redirect to an HTTPS asset.'
        }
    } else {
        if ($release.Count -ne 0) { throw 'The website advertises a Windows release.' }
        $null = Read-Route "$feed/0.1.0.0/download" 404
    }

    [pscustomobject]@{ Target = $Target; EmailEnabled = [bool]$EmailEnabled; GoogleEnabled = [bool]$GoogleEnabled
        ListedVersion = $Version; ProtectedReports = $true; PublicPagesVerified = $true }
} finally { $client.Dispose() }
