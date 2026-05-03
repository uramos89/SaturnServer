<#
.SYNOPSIS
    Windows Firewall Manager — netsh / PowerShell rule management
.DESCRIPTION
    List, allow, deny, and delete Windows Firewall rules via PowerShell cmdlets.
.PARAMETER ACTION
    Action: list, allow, deny, delete, status
.PARAMETER PORT
    Port number for allow/deny actions
.PARAMETER PROTOCOL
    Protocol: TCP or UDP
.PARAMETER DIRECTION
    Rule direction: inbound or outbound
.PARAMETER NAME
    Rule display name
#>

param(
    [string]$ACTION = "list",
    [string]$PORT = "",
    [string]$PROTOCOL = "TCP",
    [string]$DIRECTION = "Inbound",
    [string]$NAME = "Saturn-Managed-Rule"
)

Write-Host "🛡️ Windows Firewall Manager — Action: $ACTION"

switch ($ACTION.ToLower()) {
    "list" {
        Write-Host "📋 Current rules:"
        Get-NetFirewallRule | Where-Object { $_.Enabled -eq $true } | `
            Select-Object DisplayName, Direction, Action, @{N="Ports";E={$_.Profile}} | `
            Format-Table -AutoSize
    }
    "status" {
        $profile = Get-NetFirewallProfile
        foreach ($p in $profile) {
            Write-Host "$($p.Name): $($p.Enabled)"
        }
    }
    "allow" {
        if ([string]::IsNullOrEmpty($PORT)) {
            Write-Host "❌ Port required"
            exit 1
        }
        $ruleName = "$NAME-Port$PORT-$DIRECTION"
        Write-Host "  ✅ Creating rule: $ruleName"
        New-NetFirewallRule -DisplayName $ruleName -Direction $DIRECTION -LocalPort $PORT -Protocol $PROTOCOL -Action Allow
        Write-Host "  ✅ Rule created"
    }
    "deny" {
        if ([string]::IsNullOrEmpty($PORT)) {
            Write-Host "❌ Port required"
            exit 1
        }
        $ruleName = "$NAME-Block$PORT-$DIRECTION"
        Write-Host "  🔒 Creating block rule: $ruleName"
        New-NetFirewallRule -DisplayName $ruleName -Direction $DIRECTION -LocalPort $PORT -Protocol $PROTOCOL -Action Block
        Write-Host "  ✅ Block rule created"
    }
    "delete" {
        if ([string]::IsNullOrEmpty($PORT)) {
            Write-Host "❌ Port required"
            exit 1
        }
        $pattern = "*$NAME*Port$PORT*"
        Write-Host "  🗑️ Removing rules matching: $pattern"
        Get-NetFirewallRule | Where-Object { $_.DisplayName -like $pattern } | Remove-NetFirewallRule
        Write-Host "  ✅ Rules removed"
    }
    default {
        Write-Host "❌ Unknown action: $ACTION"
        Write-Host "Usage: script.ps1 -ACTION {list|allow|deny|delete|status} [-PORT n] [-PROTOCOL TCP|UDP]"
        exit 1
    }
}

Write-Host "✅ Windows Firewall Manager complete"
