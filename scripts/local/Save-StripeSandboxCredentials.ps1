# Run interactively yourself. Never paste API keys or webhook secrets into chat.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$taskTarget = Join-Path $taskRoot '.codex-runtime/security/stripe-sandbox.dpapi.json'
$taskAccount = 'acct_1TFxT1FtqSI9Oxmn'
$taskApiSecure = Read-Host 'Selected sandbox TEST API key (hidden)' -AsSecureString
$taskApi = $null
try {
    $taskApi = [Net.NetworkCredential]::new('', $taskApiSecure).Password
    if ($taskApi -notmatch '^(sk|rk)_test_[A-Za-z0-9]+$') {
        throw 'Only a TEST API key is accepted. Nothing was saved.'
    }
    try {
        $taskIdentity = Invoke-RestMethod -Uri 'https://api.stripe.com/v1/account' -Headers @{ Authorization = "Bearer $taskApi" } -TimeoutSec 20
    } catch {
        throw 'Could not verify the selected sandbox account with this key. Nothing was saved; no key is printed.'
    }
    if ($taskIdentity.id -ne $taskAccount) {
        throw 'The key does not belong to the selected Crystal Production LTD sandbox. Nothing was saved.'
    }
    if (Test-Path -LiteralPath $taskTarget) {
        throw 'An encrypted sandbox credential file already exists. Review it deliberately before replacing it.'
    }
    $taskPayload = [ordered]@{
        accountId = $taskAccount
        livemode = $false
        apiKey = ConvertFrom-SecureString $taskApiSecure
        webhookSecret = $null
        protection = 'Windows DPAPI CurrentUser; never a portable credential'
    }
    New-Item -ItemType Directory -Force (Split-Path -Parent $taskTarget) | Out-Null
    [IO.File]::WriteAllText($taskTarget, ($taskPayload | ConvertTo-Json))
    Write-Host 'Sandbox account verified; test API key saved with Windows-user encryption under ignored .codex-runtime/security/.'
    Write-Host 'The local listener signing secret will be added separately; no webhook secret is needed in this prompt.'
    Write-Host 'No production settings, payments, subscriptions, customers or webhook endpoints were changed.'
} finally {
    $taskApi = $null
    $taskApiSecure.Dispose()
}
