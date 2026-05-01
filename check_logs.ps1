# Check Saturn status on remote server
$TargetHost = "192.168.174.130"
$TargetUser = "saturno"
$TargetPassword = "admin1"

Import-Module Posh-SSH -Force

$secpass = ConvertTo-SecureString $TargetPassword -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($TargetUser, $secpass)

$session = New-SSHSession -ComputerName $TargetHost -Credential $cred -AcceptKey -ErrorAction Stop

Write-Output "=== PM2 Status ==="
$r = Invoke-SSHCommand -SessionId $session.SessionId -Command "pm2 status" -TimeOut 10
Write-Output $r.Output

Write-Output "=== Health Check ==="
$r = Invoke-SSHCommand -SessionId $session.SessionId -Command "curl -s http://localhost:80/api/health" -TimeOut 10
Write-Output $r.Output

Write-Output "=== Frontend HTTP Status ==="
$r = Invoke-SSHCommand -SessionId $session.SessionId -Command "curl -s -o /dev/null -w '%{http_code}' http://localhost:80/" -TimeOut 10
Write-Output $r.Output

Write-Output "=== Frontend HTML (first 20 lines) ==="
$r = Invoke-SSHCommand -SessionId $session.SessionId -Command "curl -s http://localhost:80/ | head -20" -TimeOut 10
Write-Output $r.Output

Write-Output "=== AI Providers API ==="
$r = Invoke-SSHCommand -SessionId $session.SessionId -Command "curl -s http://localhost:80/api/ai/providers | python3 -m json.tool 2>/dev/null | head -30" -TimeOut 10
Write-Output $r.Output

Remove-SSHSession -SessionId $session.SessionId
