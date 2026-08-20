# PMTiles external tile server (final form; independent of VitalSpan)
param(
  [string]$DataDir = "$env:USERPROFILE\Desktop",
  [string]$PmtilesFile = "planet-z15-20260817.pmtiles",
  [string]$CorsOrigin = "http://localhost:5173",
  [int]$Port = 8080,
  [string]$ServiceId = "planet-z15",
  [string]$ServiceName = "Planet Z15 Global",
  [switch]$SkipRegister
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $repoRoot

$dataPath = (Resolve-Path -LiteralPath $DataDir).Path
$pmtilesPath = Join-Path $dataPath $PmtilesFile
if (-not (Test-Path -LiteralPath $pmtilesPath)) {
  throw "PMTiles file not found: $pmtilesPath"
}

$listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
foreach ($conn in $listeners) {
  $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
  if ($proc) {
    Write-Host "Stopping process on port ${Port}: $($proc.ProcessName) (pid $($proc.Id))"
    Stop-Process -Id $proc.Id -Force
  }
}

$env:PMTILES_DATA_DIR = ($dataPath -replace '\\', '/')
$env:PMTILES_CORS_ORIGIN = $CorsOrigin
$env:PMTILES_TILE_PORT = "$Port"
$env:PMTILES_HEALTH_FILE = $PmtilesFile

Write-Host ""
Write-Host "=== PMTiles external tile server ==="
Write-Host "  data dir : $dataPath"
Write-Host "  archive  : $PmtilesFile"
Write-Host "  port     : $Port"
Write-Host "  cors     : $CorsOrigin"
Write-Host ""

docker compose --profile pmtiles-external up -d pmtiles-tile-server

$verifyScript = Join-Path $repoRoot (Join-Path 'scripts' 'verify-pmtiles-external.ps1')

Write-Host "Waiting for healthcheck..."
$healthy = $false
for ($i = 0; $i -lt 45; $i++) {
  Start-Sleep -Seconds 2
  $status = docker inspect --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}" vitalspan-pmtiles-tile-server 2>$null
  if ($status -eq "healthy") { $healthy = $true; break }
  if ($status -eq "unhealthy" -and $i -gt 5) { break }
}
if (-not $healthy) {
  try {
    & $verifyScript -Port $Port -PmtilesFile $PmtilesFile
    Write-Host "Docker healthcheck pending, but Range probe passed."
    $healthy = $true
  } catch {
    docker logs vitalspan-pmtiles-tile-server --tail 30
    throw "PMTiles external service failed healthcheck"
  }
}

if ($healthy) {
  & $verifyScript -Port $Port -PmtilesFile $PmtilesFile
}
  $registerScript = Join-Path $repoRoot (Join-Path 'scripts' 'register-pmtiles-external.ps1')
  & $registerScript -ServiceId $ServiceId -ServiceName $ServiceName -BaseUrl "http://127.0.0.1:${Port}" -PmtilesPath "/${PmtilesFile}"
}

Write-Host ""
Write-Host "External tile server ready."
Write-Host ("  tile URL : http://127.0.0.1:{0}/{1}" -f $Port, $PmtilesFile)
Write-Host ("  VitalSpan: gis-map -> optional PMTiles -> {0}" -f $ServiceId)
