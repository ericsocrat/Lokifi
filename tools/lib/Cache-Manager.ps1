# Cache-Manager.ps1
# Caching system for tool results to speed up repeated runs

<#
.SYNOPSIS
Manage cache for tool results

.DESCRIPTION
Provides caching functionality to speed up repeated tool runs.
Caches analysis results, test results, security scans, etc.
Uses file hashes to detect changes and invalidate cache.

.EXAMPLE
$cached = Get-CachedResult -Key 'codebase-analysis' -MaxAge 3600
if ($cached) { return $cached }
$result = Invoke-Analysis
Set-CachedResult -Key 'codebase-analysis' -Value $result
#>

function Get-CacheDirectory {
    <#
    .SYNOPSIS
    Get or create the cache storage directory
    #>
    param(
        [string]$Tool = 'global'
    )
    
    $cacheRoot = Join-Path $PSScriptRoot '..\..\..\.tool-cache'
    if (-not (Test-Path $cacheRoot)) {
        New-Item -ItemType Directory -Path $cacheRoot -Force | Out-Null
    }
    
    $toolCache = Join-Path $cacheRoot $Tool
    if (-not (Test-Path $toolCache)) {
        New-Item -ItemType Directory -Path $toolCache -Force | Out-Null
    }
    
    return $toolCache
}

function Get-FileHash-Fast {
    <#
    .SYNOPSIS
    Calculate hash of file or directory contents
    
    .PARAMETER Path
    File or directory path
    #>
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )
    
    if (-not (Test-Path $Path)) {
        return $null
    }
    
    if (Test-Path $Path -PathType Container) {
        # Directory - hash all file paths and timestamps
        $files = Get-ChildItem -Path $Path -Recurse -File | Sort-Object FullName
        $hashInput = $files | ForEach-Object {
            "$($_.FullName):$($_.LastWriteTimeUtc.Ticks)"
        } | Out-String
        
        $md5 = [System.Security.Cryptography.MD5]::Create()
        $hash = $md5.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($hashInput))
        return [BitConverter]::ToString($hash).Replace('-', '')
    } else {
        # Single file
        return (Get-FileHash -Path $Path -Algorithm MD5).Hash
    }
}

function Get-CacheKey {
    <#
    .SYNOPSIS
    Generate cache key from parameters
    
    .PARAMETER Tool
    Tool name
    
    .PARAMETER Operation
    Operation name (e.g., 'analyze', 'test', 'scan')
    
    .PARAMETER Parameters
    Hashtable of parameters that affect the result
    #>
    param(
        [Parameter(Mandatory)]
        [string]$Tool,
        
        [Parameter(Mandatory)]
        [string]$Operation,
        
        [hashtable]$Parameters = @{}
    )
    
    # Sort parameters for consistent key generation
    $sortedParams = $Parameters.GetEnumerator() | 
        Sort-Object Name | 
        ForEach-Object { "$($_.Name)=$($_.Value)" }
    
    $keyString = "$Tool|$Operation|$($sortedParams -join '|')"
    
    # Hash the key string for shorter filenames
    $md5 = [System.Security.Cryptography.MD5]::Create()
    $hash = $md5.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($keyString))
    return [BitConverter]::ToString($hash).Replace('-', '').ToLower()
}

function Get-CachedResult {
    <#
    .SYNOPSIS
    Retrieve cached result if valid
    
    .PARAMETER Tool
    Tool name
    
    .PARAMETER Operation
    Operation name
    
    .PARAMETER Parameters
    Parameters that affect the result
    
    .PARAMETER MaxAge
    Maximum age in seconds (default: 3600 = 1 hour)
    
    .PARAMETER DependsOn
    Files/directories to check for changes. Cache invalidated if any changed.
    #>
    param(
        [Parameter(Mandatory)]
        [string]$Tool,
        
        [Parameter(Mandatory)]
        [string]$Operation,
        
        [hashtable]$Parameters = @{},
        
        [int]$MaxAge = 3600,
        
        [string[]]$DependsOn = @()
    )
    
    $cacheDir = Get-CacheDirectory -Tool $Tool
    $cacheKey = Get-CacheKey -Tool $Tool -Operation $Operation -Parameters $Parameters
    $cacheFile = Join-Path $cacheDir "$cacheKey.json"
    $metaFile = Join-Path $cacheDir "$cacheKey.meta.json"
    
    # Check if cache files exist
    if (-not (Test-Path $cacheFile) -or -not (Test-Path $metaFile)) {
        return $null
    }
    
    # Load metadata
    try {
        $meta = Get-Content -Path $metaFile -Raw | ConvertFrom-Json
    } catch {
        Write-Verbose "Failed to load cache metadata: $_"
        return $null
    }
    
    # Check age
    $age = (Get-Date).Subtract([datetime]$meta.cached_at).TotalSeconds
    if ($age -gt $MaxAge) {
        Write-Verbose "Cache expired (age: ${age}s, max: ${MaxAge}s)"
        return $null
    }
    
    # Check dependencies (file/directory hashes)
    if ($DependsOn.Count -gt 0) {
        foreach ($dep in $DependsOn) {
            if (-not (Test-Path $dep)) {
                Write-Verbose "Dependency not found: $dep"
                return $null
            }
            
            $currentHash = Get-FileHash-Fast -Path $dep
            $cachedHash = $meta.dependencies[$dep]
            
            if ($currentHash -ne $cachedHash) {
                Write-Verbose "Dependency changed: $dep"
                return $null
            }
        }
    }
    
    # Load and return cached result
    try {
        $cached = Get-Content -Path $cacheFile -Raw | ConvertFrom-Json
        Write-Verbose "Cache HIT: $cacheKey (age: ${age}s)"
        return $cached.result
    } catch {
        Write-Verbose "Failed to load cached result: $_"
        return $null
    }
}

function Set-CachedResult {
    <#
    .SYNOPSIS
    Store result in cache
    
    .PARAMETER Tool
    Tool name
    
    .PARAMETER Operation
    Operation name
    
    .PARAMETER Parameters
    Parameters that affect the result
    
    .PARAMETER Result
    Result to cache
    
    .PARAMETER DependsOn
    Files/directories this result depends on
    #>
    param(
        [Parameter(Mandatory)]
        [string]$Tool,
        
        [Parameter(Mandatory)]
        [string]$Operation,
        
        [hashtable]$Parameters = @{},
        
        [Parameter(Mandatory)]
        [object]$Result,
        
        [string[]]$DependsOn = @()
    )
    
    $cacheDir = Get-CacheDirectory -Tool $Tool
    $cacheKey = Get-CacheKey -Tool $Tool -Operation $Operation -Parameters $Parameters
    $cacheFile = Join-Path $cacheDir "$cacheKey.json"
    $metaFile = Join-Path $cacheDir "$cacheKey.meta.json"
    
    # Calculate dependency hashes
    $depHashes = @{}
    foreach ($dep in $DependsOn) {
        if (Test-Path $dep) {
            $depHashes[$dep] = Get-FileHash-Fast -Path $dep
        }
    }
    
    # Store result
    $cacheData = @{
        tool       = $Tool
        operation  = $Operation
        parameters = $Parameters
        result     = $Result
    }
    
    $cacheData | ConvertTo-Json -Depth 20 | Out-File -FilePath $cacheFile -Encoding UTF8
    
    # Store metadata
    $meta = @{
        cache_key    = $cacheKey
        cached_at    = (Get-Date -Format 'o')
        dependencies = $depHashes
        git          = @{
            branch = (git rev-parse --abbrev-ref HEAD 2>$null)
            commit = (git rev-parse --short HEAD 2>$null)
        }
    }
    
    $meta | ConvertTo-Json -Depth 10 | Out-File -FilePath $metaFile -Encoding UTF8
    
    Write-Verbose "Cached result: $cacheKey"
    
    return @{
        cache_key  = $cacheKey
        cache_file = $cacheFile
        meta_file  = $metaFile
    }
}

function Clear-Cache {
    <#
    .SYNOPSIS
    Clear cached results
    
    .PARAMETER Tool
    Tool name (or 'all' for all tools)
    
    .PARAMETER OlderThan
    Only clear cache older than this many seconds
    #>
    param(
        [string]$Tool = 'all',
        
        [int]$OlderThan = 0
    )
    
    $cacheRoot = Join-Path $PSScriptRoot '..\..\..\.tool-cache'
    
    if (-not (Test-Path $cacheRoot)) {
        Write-Host "No cache directory found" -ForegroundColor Gray
        return
    }
    
    $tools = if ($Tool -eq 'all') {
        Get-ChildItem -Path $cacheRoot -Directory | Select-Object -ExpandProperty Name
    } else {
        @($Tool)
    }
    
    $totalCleared = 0
    $totalSize = 0
    
    foreach ($toolName in $tools) {
        $toolCache = Join-Path $cacheRoot $toolName
        if (-not (Test-Path $toolCache)) {
            continue
        }
        
        $files = Get-ChildItem -Path $toolCache -File
        
        foreach ($file in $files) {
            if ($OlderThan -gt 0) {
                $age = (Get-Date).Subtract($file.LastWriteTime).TotalSeconds
                if ($age -lt $OlderThan) {
                    continue
                }
            }
            
            $totalSize += $file.Length
            Remove-Item -Path $file.FullName -Force
            $totalCleared++
        }
    }
    
    $sizeMB = [math]::Round($totalSize / 1MB, 2)
    Write-Host "✅ Cleared $totalCleared cache files ($sizeMB MB)" -ForegroundColor Green
}

function Get-CacheStats {
    <#
    .SYNOPSIS
    Get cache statistics
    
    .PARAMETER Tool
    Tool name (or 'all' for all tools)
    #>
    param(
        [string]$Tool = 'all'
    )
    
    $cacheRoot = Join-Path $PSScriptRoot '..\..\..\.tool-cache'
    
    if (-not (Test-Path $cacheRoot)) {
        return @{
            exists      = $false
            total_files = 0
            total_size  = 0
        }
    }
    
    $tools = if ($Tool -eq 'all') {
        Get-ChildItem -Path $cacheRoot -Directory
    } else {
        @(Get-Item -Path (Join-Path $cacheRoot $Tool) -ErrorAction SilentlyContinue)
    }
    
    $stats = @{
        exists      = $true
        total_files = 0
        total_size  = 0
        by_tool     = @{}
    }
    
    foreach ($toolDir in $tools) {
        if (-not $toolDir) { continue }
        
        $files = Get-ChildItem -Path $toolDir.FullName -File
        $toolSize = ($files | Measure-Object -Property Length -Sum).Sum
        
        $stats.by_tool[$toolDir.Name] = @{
            files = $files.Count
            size  = $toolSize
        }
        
        $stats.total_files += $files.Count
        $stats.total_size += $toolSize
    }
    
    return $stats
}

# Export functions (only when loaded as a module)
if ($MyInvocation.MyCommand.CommandType -eq 'ExternalScript') {
    # Script is being dot-sourced, functions are already available
} else {
    Export-ModuleMember -Function @(
        'Get-CachedResult',
        'Set-CachedResult',
        'Clear-Cache',
        'Get-CacheStats'
    )
}
