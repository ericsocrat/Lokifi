# Dependency Protection PowerShell Integration
# Adds protection commands to the dev.ps1 script

# Colors for output
$Colors = @{
    Green  = "`e[92m"
    Red    = "`e[91m"
    Yellow = "`e[93m"
    Blue   = "`e[94m"
    Cyan   = "`e[96m"
    White  = "`e[97m"
    Bold   = "`e[1m"
    End    = "`e[0m"
}

function Write-ProtectionMessage {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    switch ($Type) {
        "Success" { Write-Host "$($Colors.Green)✅ [$timestamp] $Message$($Colors.End)" }
        "Error" { Write-Host "$($Colors.Red)❌ [$timestamp] $Message$($Colors.End)" }
        "Warning" { Write-Host "$($Colors.Yellow)⚠️  [$timestamp] $Message$($Colors.End)" }
        "Info" { Write-Host "$($Colors.Blue)ℹ️  [$timestamp] $Message$($Colors.End)" }
        default { Write-Host "[$timestamp] $Message" }
    }
}

function Start-DependencyProtection {
    Write-Host "$($Colors.Cyan)$($Colors.Bold)🛡️  Starting Dependency Protection System$($Colors.End)"
    
    try {
        Set-Location "$PSScriptRoot\backend"
        $result = & python dependency_protector.py
        
        if ($LASTEXITCODE -eq 0) {
            Write-ProtectionMessage "Dependency protection system activated successfully" "Success"
            return $true
        }
        else {
            Write-ProtectionMessage "Dependency protection system setup failed" "Error"
            return $false
        }
    }
    catch {
        Write-ProtectionMessage "Error starting protection system: $($_.Exception.Message)" "Error"
        return $false
    }
    finally {
        Set-Location $PSScriptRoot
    }
}

function Test-ProtectedInstall {
    param(
        [string]$PackageManager,
        [string]$Package,
        [string]$Version = ""
    )
    
    Write-ProtectionMessage "Testing protected installation: $PackageManager $Package $Version" "Info"
    
    # Save current state
    Start-DependencySnapshot
    
    switch ($PackageManager.ToLower()) {
        "pip" {
            if ($Version) {
                $command = "pip install $Package==$Version"
            }
            else {
                $command = "pip install $Package"
            }
            
            Write-ProtectionMessage "Executing: $command" "Info"
            Invoke-Expression $command
        }
        "npm" {
            Set-Location "$PSScriptRoot\frontend"
            try {
                if ($Version) {
                    $command = "npm install $Package@$Version"
                }
                else {
                    $command = "npm install $Package"
                }
                
                Write-ProtectionMessage "Executing: $command" "Info"
                Invoke-Expression $command
            }
            finally {
                Set-Location $PSScriptRoot
            }
        }
        default {
            Write-ProtectionMessage "Unknown package manager: $PackageManager" "Error"
            return $false
        }
    }
    
    # Check for downgrades after installation
    Test-DowngradeDetection
}

function Start-DependencySnapshot {
    Write-ProtectionMessage "Creating dependency snapshot..." "Info"
    
    try {
        Set-Location "$PSScriptRoot\backend"
        $result = & python -c "from dependency_protector import DependencyProtector; DependencyProtector().save_version_snapshot()"
        
        if ($LASTEXITCODE -eq 0) {
            Write-ProtectionMessage "Dependency snapshot created successfully" "Success"
            return $true
        }
        else {
            Write-ProtectionMessage "Failed to create dependency snapshot" "Error"
            return $false
        }
    }
    catch {
        Write-ProtectionMessage "Error creating snapshot: $($_.Exception.Message)" "Error"
        return $false
    }
    finally {
        Set-Location $PSScriptRoot
    }
}

function Test-DowngradeDetection {
    Write-ProtectionMessage "Running downgrade detection..." "Info"
    
    try {
        Set-Location "$PSScriptRoot\backend"
        $result = & python -c "from dependency_protector import DependencyProtector; protector = DependencyProtector(); report = protector.generate_protection_report(); print('Downgrades detected:', len(report.get('python_packages', {}).get('potential_downgrades', [])) + len(report.get('nodejs_packages', {}).get('potential_downgrades', [])))"
        
        if ($LASTEXITCODE -eq 0) {
            Write-ProtectionMessage "Downgrade detection completed" "Success"
            return $true
        }
        else {
            Write-ProtectionMessage "Downgrade detection failed" "Error"
            return $false
        }
    }
    catch {
        Write-ProtectionMessage "Error in downgrade detection: $($_.Exception.Message)" "Error"
        return $false
    }
    finally {
        Set-Location $PSScriptRoot
    }
}

function Show-ProtectionStatus {
    Write-Host "$($Colors.Cyan)$($Colors.Bold)🛡️  Dependency Protection Status$($Colors.End)"
    
    $protectionDir = "$PSScriptRoot\dependency_protection"
    
    if (Test-Path $protectionDir) {
        Write-ProtectionMessage "Protection system: ACTIVE" "Success"
        
        $pythonVersions = "$protectionDir\python_versions.json"
        $nodejsVersions = "$protectionDir\nodejs_versions.json"
        $logs = "$protectionDir\logs"
        
        if (Test-Path $pythonVersions) {
            $pythonCount = (Get-Content $pythonVersions | ConvertFrom-Json).PSObject.Properties.Count
            Write-ProtectionMessage "Python packages protected: $pythonCount" "Info"
        }
        
        if (Test-Path $nodejsVersions) {
            $nodejsCount = (Get-Content $nodejsVersions | ConvertFrom-Json).PSObject.Properties.Count
            Write-ProtectionMessage "Node.js packages protected: $nodejsCount" "Info"
        }
        
        if (Test-Path $logs) {
            $logCount = (Get-ChildItem $logs -Filter "*.log").Count
            Write-ProtectionMessage "Protection log files: $logCount" "Info"
        }
        
        # Show recent protection activity
        $recentLog = Get-ChildItem "$logs\protection_*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($recentLog) {
            Write-ProtectionMessage "Last activity: $($recentLog.LastWriteTime)" "Info"
            $lastLines = Get-Content $recentLog.FullName | Select-Object -Last 3
            foreach ($line in $lastLines) {
                Write-Host "  $line" -ForegroundColor Gray
            }
        }
    }
    else {
        Write-ProtectionMessage "Protection system: NOT ACTIVE" "Warning"
        Write-ProtectionMessage "Run 'Start-DependencyProtection' to activate" "Info"
    }
}

function Install-ProtectedPackage {
    param(
        [string]$PackageManager,
        [string]$Package,
        [string]$Version = "",
        [switch]$Force
    )
    
    Write-Host "$($Colors.Cyan)$($Colors.Bold)🛡️  Protected Package Installation$($Colors.End)"
    Write-ProtectionMessage "Package: $Package" "Info"
    Write-ProtectionMessage "Manager: $PackageManager" "Info"
    if ($Version) { Write-ProtectionMessage "Version: $Version" "Info" }
    
    # Create snapshot before installation
    Write-ProtectionMessage "Creating pre-installation snapshot..." "Info"
    Start-DependencySnapshot
    
    # Check for potential downgrades
    if (!$Force) {
        Write-ProtectionMessage "Checking for potential downgrades..." "Info"
        
        try {
            Set-Location "$PSScriptRoot\backend"
            
            if ($PackageManager.ToLower() -eq "pip") {
                $checkScript = "from dependency_protector import DependencyProtector; result = DependencyProtector().check_python_downgrade_risk('$Package', '$Version'); print('Safe:', result['safe']); [print('DOWNGRADE:', d) for d in result['downgrades']]"
            }
            else {
                $checkScript = "from dependency_protector import DependencyProtector; result = DependencyProtector().check_nodejs_downgrade_risk('$Package', '$Version'); print('Safe:', result['safe']); [print('DOWNGRADE:', d) for d in result['downgrades']]"
            }
            
            $checkResult = & python -c $checkScript
            
            if ($checkResult -like "*Safe: False*") {
                Write-ProtectionMessage "POTENTIAL DOWNGRADE DETECTED!" "Error"
                Write-Host $checkResult -ForegroundColor Red
                
                if (!$Force) {
                    Write-ProtectionMessage "Installation blocked. Use -Force to override." "Warning"
                    return $false
                }
            }
            else {
                Write-ProtectionMessage "No downgrades detected. Proceeding with installation." "Success"
            }
        }
        catch {
            Write-ProtectionMessage "Error during downgrade check: $($_.Exception.Message)" "Warning"
        }
        finally {
            Set-Location $PSScriptRoot
        }
    }
    
    # Proceed with installation
    Test-ProtectedInstall -PackageManager $PackageManager -Package $Package -Version $Version
    
    # Post-installation verification
    Write-ProtectionMessage "Running post-installation verification..." "Info"
    Test-DowngradeDetection
    
    Write-ProtectionMessage "Protected installation completed" "Success"
}

# Auto-initialize if protection system exists
if (Test-Path "$PSScriptRoot\dependency_protection") {
    Write-ProtectionMessage "Dependency protection system detected" "Info"
}
else {
    Write-ProtectionMessage "Run 'Start-DependencyProtection' to initialize protection system" "Info"
}