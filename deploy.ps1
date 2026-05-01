# deploy.ps1 - Deploy Saturn to remote server
param(
    [string]$TargetHost = "192.168.174.130",
    [string]$TargetUser = "saturno",
    [string]$TargetPassword = "admin1"
)

# Install Posh-SSH if not present
if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
    Write-Output "Installing Posh-SSH module..."
    Install-PackageProvider -Name NuGet -Force -Scope CurrentUser | Out-Null
    Install-Module -Name Posh-SSH -Force -Scope CurrentUser -AllowClobber
}

Import-Module Posh-SSH -Force

$secpass = ConvertTo-SecureString $TargetPassword -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($TargetUser, $secpass)

Write-Output "Connecting to $TargetUser@$TargetHost..."
try {
    $session = New-SSHSession -ComputerName $TargetHost -Credential $cred -AcceptKey -ErrorAction Stop
    Write-Output "Connected!"
    
    # Remove old .env so install.sh creates a fresh one
    Invoke-SSHCommand -SessionId $session.SessionId -Command "sudo rm -f /opt/saturn/.env" | Out-Null
    
    # Upload local install.sh via SCP
    Write-Output "Uploading install.sh..."
    Set-SCPFile -SessionId $session.SessionId -LocalFile "c:\Users\uramo\Documents\I+D\saturn\install.sh" -RemotePath "/tmp/install.sh" | Out-Null
    
    # Run the uploaded script
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "echo 'admin1' | sudo -S bash /tmp/install.sh" -TimeOut 300
    
    Write-Output "STDOUT:"
    Write-Output $result.Output
    Write-Output "STDERR:"
    Write-Output $result.Error
    Write-Output "ExitCode: $($result.ExitCode)"
    
    Remove-SSHSession -SessionId $session.SessionId
} catch {
    Write-Output "ERROR: $_"
}
