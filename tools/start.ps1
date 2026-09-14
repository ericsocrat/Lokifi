param([switch]$SetupOnly, [switch]$NoBrowser)
$ErrorActionPreference='Stop'
$repoRoot=Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot
function Checked([string]$program,[string[]]$arguments) {
    & $program @arguments
    if($LASTEXITCODE -ne 0){throw "$program failed; see output above"}
}
New-Item -ItemType Directory -Force '.local/logs' | Out-Null
if(-not(Test-Path 'node_modules/next')){Checked 'npm' @('ci','--ignore-scripts')}
Checked 'uv' @('sync','--project','apps/api','--frozen')
if(-not(Test-Path '.local/postgres/node_modules/embedded-postgres')){
    Checked 'npm' @('install','--prefix','.local/postgres','--no-audit','--no-fund','embedded-postgres@17.6.0-beta.15')
}
if($SetupOnly){exit 0}
function PortOpen([int]$port){
    $tcp=[Net.Sockets.TcpClient]::new()
    try{$tcp.Connect('127.0.0.1',$port);return $true}catch{return $false}finally{$tcp.Dispose()}
}
function Launch([string]$name,[string]$script){
    $pidInfo=Start-Process -FilePath 'node' -ArgumentList $script -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput ".local/logs/$name.log" -RedirectStandardError ".local/logs/$name.error.log"
    return $pidInfo.Id
}
$launched=@{}
if(-not(PortOpen 15439)){$launched.database=Launch 'postgres' 'tools/local-postgres.mjs'}
for($i=0;$i -lt 30 -and -not(PortOpen 15439);$i++){Start-Sleep -Seconds 1}
if(-not(PortOpen 15439)){throw 'Local PostgreSQL did not start. See .local/logs/postgres.error.log'}
$cfg=Get-Content .local/database.json -Raw | ConvertFrom-Json
$env:LOKIFI_DATABASE_URL="postgresql+psycopg://lokifi:$($cfg.password)@127.0.0.1:$($cfg.port)/lokifi_rebuild"
$env:LOKIFI_ENVIRONMENT='local'
$env:LOKIFI_WEB_ORIGIN='http://127.0.0.1:13100'
Checked 'uv' @('run','--directory','apps/api','alembic','upgrade','head')
if(-not(PortOpen 18100)){
    $p=Start-Process -FilePath 'uv' -ArgumentList @('run','--directory','apps/api','uvicorn','lokifi.main:app','--host','127.0.0.1','--port','18100') -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput '.local/logs/api.log' -RedirectStandardError '.local/logs/api.error.log'
    $launched.api=$p.Id
}
if(-not(PortOpen 13100)){
    if(-not(Test-Path 'apps/web/.next/BUILD_ID')){Checked 'npm' @('run','build')}
    $launched.web=Launch 'web' 'tools/web-start.mjs'
}
$launched | ConvertTo-Json | Set-Content '.local/last-launch.json'
for($i=0;$i -lt 30;$i++){
    try{$r=Invoke-WebRequest 'http://127.0.0.1:13100/api/v1/health' -UseBasicParsing;if($r.StatusCode -eq 200){break}}catch{Start-Sleep -Seconds 1}
}
if($i -eq 30){throw 'Lokifi did not become ready. Check .local/logs.'}
if(-not $NoBrowser){Start-Process 'http://127.0.0.1:13100'}
Write-Host 'Lokifi is ready at http://127.0.0.1:13100'
