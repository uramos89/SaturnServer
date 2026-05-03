param([string]$ACTION="list",[string]$SITE_NAME="",[int]$PORT=80)
Write-Host "🌐 IIS Manager — Action: $ACTION"
switch ($ACTION.ToLower()) {
  "list" { Get-Website | Format-Table Name, PhysicalPath, State, Bindings -AutoSize }
  "status" { Get-WebAppPoolState -Name * | Format-Table -AutoSize }
  "start" { Start-Website -Name $SITE_NAME; Write-Host "✅ $SITE_NAME started" }
  "stop" { Stop-Website -Name $SITE_NAME; Write-Host "⏸️ $SITE_NAME stopped" }
  "restart" { Restart-WebAppPool -Name $SITE_NAME; Write-Host "🔄 $SITE_NAME restarted" }
  "create-site" {
    New-Website -Name $SITE_NAME -Port $PORT -PhysicalPath "C:\inetpub\wwwroot\$SITE_NAME"
    Write-Host "✅ Site $SITE_NAME created on port $PORT"
  }
  default { Write-Host "❌ Unknown action" }
}
Write-Host "✅ IIS Manager complete"
