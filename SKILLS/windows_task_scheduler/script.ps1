param([string]$ACTION="list",[string]$TASK_NAME="",[string]$SCHEDULE="daily",[string]$COMMAND="")
Write-Host "⏰ Windows Task Scheduler — Action: $ACTION"
switch ($ACTION.ToLower()) {
  "list" { Get-ScheduledTask | Where State -ne Disabled | Format-Table TaskName, State -AutoSize }
  "create" {
    $action = New-ScheduledTaskAction -Execute $COMMAND
    $trigger = $SCHEDULE -match "daily" ? (New-ScheduledTaskTrigger -Daily -At 02:00) : (New-ScheduledTaskTrigger -Hourly)
    Register-ScheduledTask -TaskName $TASK_NAME -Action $action -Trigger $trigger -Force
    Write-Host "✅ Task $TASK_NAME created"
  }
  "delete" { Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false; Write-Host "✅ $TASK_NAME deleted" }
  "enable" { Enable-ScheduledTask -TaskName $TASK_NAME; Write-Host "✅ $TASK_NAME enabled" }
  "disable" { Disable-ScheduledTask -TaskName $TASK_NAME; Write-Host "⏸️ $TASK_NAME disabled" }
  "run" { Start-ScheduledTask -TaskName $TASK_NAME; Write-Host "▶️ $TASK_NAME triggered" }
  default { Write-Host "❌ Unknown action" }
}
Write-Host "✅ Task Scheduler complete"
