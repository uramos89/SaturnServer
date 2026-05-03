param([string]$SOURCE="",[string]$DESTINATION="",[bool]$MIRROR=$false,[int]$THREADS=8)
Write-Host "💾 Robocopy Backup"
if ([string]::IsNullOrEmpty($SOURCE)) { Write-Host "❌ Source required"; exit 1 }
if ([string]::IsNullOrEmpty($DESTINATION)) { Write-Host "❌ Destination required"; exit 1 }
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = Join-Path $DESTINATION "backup_$timestamp"
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
$roboArgs = @($SOURCE, $backupPath, "/E", "/R:3", "/W:5", "/MT:$THREADS", "/NP", "/NDL")
if ($MIRROR) { $roboArgs += "/MIR" }
Write-Host "  Source: $SOURCE"
Write-Host "  Destination: $backupPath"
Write-Host "  Threads: $THREADS"
Write-Host "  Mirror: $MIRROR"
$result = robocopy @roboArgs
if ($LASTEXITCODE -ge 8) { Write-Host "❌ Backup failed (exit: $LASTEXITCODE)" }
else { Write-Host "✅ Backup complete (exit: $LASTEXITCODE)" }
Get-ChildItem $backupPath | Measure-Object | ForEach-Object { Write-Host "  Files: $($_.Count)" }
