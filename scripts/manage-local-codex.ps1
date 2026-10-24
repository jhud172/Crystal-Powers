param([Parameter(Mandatory)][ValidateSet('provision', 'remove')][string]$Mode)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $projectRoot
if (Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue) {
    throw 'Stop the local backend before managing its saved H2 account; leave the frontend running.'
}
$package = (Resolve-Path 'build/libs/crystal-power-website-2.0.0.jar').Path
$localRun = Join-Path $projectRoot ('.codex-runtime/local-operator-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $localRun | Out-Null
Copy-Item -LiteralPath '.codex-runtime/data/crystal.mv.db' -Destination (Join-Path $localRun 'crystal-before.mv.db')
$env:CRYSTAL_OPERATOR_JAR = $package
$env:CRYSTAL_OPERATOR_RUN = $localRun
@'
import os, pathlib, zipfile
root = pathlib.Path(os.environ['CRYSTAL_OPERATOR_RUN']).resolve()
with zipfile.ZipFile(os.environ['CRYSTAL_OPERATOR_JAR']) as archive:
    for entry in archive.infolist():
        if entry.is_dir() or not entry.filename.startswith(('BOOT-INF/classes/', 'BOOT-INF/lib/')):
            continue
        target = (root / entry.filename).resolve()
        if not target.is_relative_to(root):
            raise RuntimeError('Invalid packaged path')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(archive.read(entry))
'@ | python -
if ($LASTEXITCODE -ne 0) { throw 'Could not extract the packaged local runtime.' }
$classPath = (Join-Path $localRun 'BOOT-INF/classes') + ';' + (Join-Path $localRun 'BOOT-INF/lib/*')
$operatorClasses = Join-Path $localRun 'operator'
javac -cp $classPath -d $operatorClasses scripts/local/LocalCodexAccount.java
if ($LASTEXITCODE -ne 0) { throw 'Local operator compilation failed.' }
$env:PRISM_AI_ENABLED = 'false'
java -cp ($operatorClasses + ';' + $classPath) LocalCodexAccount $Mode
if ($LASTEXITCODE -ne 0) { throw 'Local account operation failed; review the local runtime log.' }
