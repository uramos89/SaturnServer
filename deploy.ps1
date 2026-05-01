# deploy.ps1 - Deploy Saturn to remote server (update from GitHub)
param(
    [string]$TargetHost = "192.168.174.130",
    [string]$TargetUser = "saturno",
    [string]$TargetPassword = "admin1"
)

if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
    Write-Output "Installing Posh-SSH module..."
    Install-PackageProvider -Name NuGet -Force -Scope CurrentUser | Out-Null
    Install-Module -Name Posh-SSH -Force -Scope CurrentUser -AllowClobber
}

Import-Module Posh-SSH -Force

$secpass = ConvertTo-SecureString $TargetPassword -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($TargetUser, $secpass)

function Run-Root($session, $cmd) {
    $fullCmd = "echo '$TargetPassword' | sudo -S bash -c '$cmd' 2>&1"
    return Invoke-SSHCommand -SessionId $session.SessionId -Command $fullCmd -TimeOut 120
}

Write-Output "Connecting to $TargetUser@$TargetHost..."
try {
    $session = New-SSHSession -ComputerName $TargetHost -Credential $cred -AcceptKey -ErrorAction Stop
    Write-Output "Connected!"
    
    # 1. Update code from GitHub
    Write-Output "=== 1. Pulling latest code ==="
    $result = Run-Root $session "cd /opt/saturn && git fetch origin main && git reset --hard origin/main"
    Write-Output $result.Output
    
    # 2. Fix permissions
    Write-Output "=== 2. Fixing permissions ==="
    $result = Run-Root $session "chown -R saturno:saturno /opt/saturn"
    Write-Output $result.Output
    
    # 3. Install dependencies
    Write-Output "=== 3. Installing npm dependencies ==="
    $result = Run-Root $session "cd /opt/saturn && npm install --production=false 2>&1"
    Write-Output $result.Output
    
    # 4. Build frontend
    Write-Output "=== 4. Building frontend ==="
    $result = Run-Root $session "cd /opt/saturn && npm run build 2>&1"
    Write-Output $result.Output
    
    # 5. Restart PM2 with NODE_ENV=production
    Write-Output "=== 5. Restarting Saturn (production mode) ==="
    $result = Run-Root $session "cd /opt/saturn && pm2 delete saturn 2>/dev/null; NODE_ENV=production pm2 start server.ts --interpreter tsx --name saturn --env NODE_ENV=production 2>&1"
    Write-Output $result.Output
    
    # 6. Save PM2 config
    Write-Output "=== 6. Save PM2 config ==="
    $result = Run-Root $session "pm2 save 2>&1"
    Write-Output $result.Output
    
    # 7. Health check
    Start-Sleep -Seconds 5
    Write-Output "=== 7. Health check ==="
    $health = Run-Root $session "curl -s -o /dev/null -w '%{http_code}' http://localhost:80/api/health 2>&1"
    Write-Output "HTTP status: $($health.Output)"
    
    # 8. Verify production mode (no /@react-refresh)
    Write-Output "=== 8. Verify production mode ==="
    $check = Run-Root $session "curl -s http://localhost:80/ | head -5"
    Write-Output $check.Output
    
    Remove-SSHSession -SessionId $session.SessionId
    Write-Output "Deploy completed!"
} catch {
    Write-Output "ERROR: $_"
}
