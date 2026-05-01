param(
    [string]$TargetHost = "192.168.174.130",
    [string]$TargetUser = "saturno",
    [string]$TargetPassword = "admin1"
)

if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
    Install-PackageProvider -Name NuGet -Force -Scope CurrentUser | Out-Null
    Install-Module -Name Posh-SSH -Force -Scope CurrentUser -AllowClobber
}

Import-Module Posh-SSH -Force

$secpass = ConvertTo-SecureString $TargetPassword -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($TargetUser, $secpass)

function Run-Root($session, $cmd) {
    $fullCmd = "echo '$TargetPassword' | sudo -S bash -c '$cmd' 2>&1"
    return Invoke-SSHCommand -SessionId $session.SessionId -Command $fullCmd -TimeOut 30
}

Write-Output "Connecting..."
$session = New-SSHSession -ComputerName $TargetHost -Credential $cred -AcceptKey -ErrorAction Stop
Write-Output "Connected!"

Write-Output "`n=== PM2 STATUS ==="
$r = Run-Root $session "pm2 status"
Write-Output $r.Output

Write-Output "`n=== CURL HTTP STATUS (localhost:80/) ==="
$r = Run-Root $session "curl -s -o /dev/null -w '%{http_code}' http://localhost:80/ 2>&1"
Write-Output "HTTP: $($r.Output)"

Write-Output "`n=== CURL HTTP STATUS (localhost:80/api/health) ==="
$r = Run-Root $session "curl -s -o /dev/null -w '%{http_code}' http://localhost:80/api/health 2>&1"
Write-Output "HTTP: $($r.Output)"

Write-Output "`n=== PM2 LOGS (last 30 lines) ==="
$r = Run-Root $session "pm2 logs saturn --lines 30 --nostream 2>&1"
Write-Output $r.Output

Write-Output "`n=== CHECK PORT 80 ==="
$r = Run-Root $session "ss -tlnp | grep ':80 '"
Write-Output $r.Output

Write-Output "`n=== CHECK DIST FILES ==="
$r = Run-Root $session "ls -la /opt/saturn/dist/ 2>&1"
Write-Output $r.Output

Remove-SSHSession -SessionId $session.SessionId
Write-Output "`nDone!"
