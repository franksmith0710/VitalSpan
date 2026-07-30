# VitalSpan docker-compose full logical backup
# Output: data/backups/<YYYYMMDD-HHMMSS>/
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$OutDir = Join-Path $RepoRoot "data\backups\$Timestamp"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$GitCommit = $null
try {
    $GitCommit = git rev-parse HEAD 2>$null
} catch {
    $GitCommit = $null
}

$ManifestFiles = @()
$ManifestWarnings = @()

function Get-ComposeContainer {
    param([string]$Service)
    $name = docker compose ps -q $Service 2>$null
    if (-not $name) { return $null }
    return ($name | Select-Object -First 1).Trim()
}

function Assert-Healthy {
    param([string]$Service)
    $cid = Get-ComposeContainer $Service
    if (-not $cid) {
        throw "Service '$Service' is not running. Run: docker compose up -d"
    }
    $health = docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' $cid
    if ($health -ne "none" -and $health -ne "healthy") {
        throw "Service '$Service' health is '$health', expected healthy"
    }
}

function Add-ManifestEntry {
    param([string]$Path, [string]$Service)
    if (Test-Path $Path) {
        $ManifestFiles += [ordered]@{
            service = $Service
            path    = (Split-Path -Leaf $Path)
            bytes   = (Get-Item $Path).Length
        }
    }
}

Write-Host "Backup directory: $OutDir"

Assert-Healthy "postgres"
$pgMeta = Get-ComposeContainer "postgres"
docker exec $pgMeta pg_dump -U vitalspan -Fc vitalspan | Set-Content -Path (Join-Path $OutDir "meta-postgres.dump") -Encoding Byte
Add-ManifestEntry (Join-Path $OutDir "meta-postgres.dump") "postgres"
Write-Host "OK meta-postgres.dump"

Assert-Healthy "analytics-postgres"
$pgAnalytics = Get-ComposeContainer "analytics-postgres"
docker exec $pgAnalytics pg_dump -U vitalspan -Fc analytics | Set-Content -Path (Join-Path $OutDir "analytics-postgres.dump") -Encoding Byte
Add-ManifestEntry (Join-Path $OutDir "analytics-postgres.dump") "analytics-postgres"
Write-Host "OK analytics-postgres.dump"

Assert-Healthy "meta-mysql"
$mysqlMeta = Get-ComposeContainer "meta-mysql"
docker exec $mysqlMeta mysqldump -uvitalspan -pvitalspan --single-transaction vitalspan |
    Out-File -FilePath (Join-Path $OutDir "meta-mysql.sql") -Encoding utf8
Add-ManifestEntry (Join-Path $OutDir "meta-mysql.sql") "meta-mysql"
Write-Host "OK meta-mysql.sql"

Assert-Healthy "sample-mysql"
$mysqlSample = Get-ComposeContainer "sample-mysql"
docker exec $mysqlSample mysqldump -usample -psample --single-transaction sample_db |
    Out-File -FilePath (Join-Path $OutDir "sample-mysql.sql") -Encoding utf8
Add-ManifestEntry (Join-Path $OutDir "sample-mysql.sql") "sample-mysql"
Write-Host "OK sample-mysql.sql"

Assert-Healthy "sample-mariadb"
$maria = Get-ComposeContainer "sample-mariadb"
docker exec $maria mysqldump -usample -psample --single-transaction sample_db |
    Out-File -FilePath (Join-Path $OutDir "sample-mariadb.sql") -Encoding utf8
Add-ManifestEntry (Join-Path $OutDir "sample-mariadb.sql") "sample-mariadb"
Write-Host "OK sample-mariadb.sql"

Assert-Healthy "sample-timescaledb"
$tsdb = Get-ComposeContainer "sample-timescaledb"
docker exec $tsdb pg_dump -U vitalspan -Fc ops_tsdb | Set-Content -Path (Join-Path $OutDir "sample-timescaledb.dump") -Encoding Byte
Add-ManifestEntry (Join-Path $OutDir "sample-timescaledb.dump") "sample-timescaledb"
Write-Host "OK sample-timescaledb.dump"

$chDir = Join-Path $OutDir "sample-clickhouse"
New-Item -ItemType Directory -Force -Path $chDir | Out-Null
try {
    Assert-Healthy "sample-clickhouse"
    $ch = Get-ComposeContainer "sample-clickhouse"
    $tables = docker exec $ch clickhouse-client --query "SHOW TABLES" 2>$null
    if ($tables) {
        foreach ($t in ($tables -split "`n" | Where-Object { $_ })) {
            $safe = $t.Trim()
            docker exec $ch clickhouse-client --query "SELECT * FROM $safe FORMAT Native" |
                Set-Content -Path (Join-Path $chDir "$safe.native") -Encoding Byte
        }
        Add-ManifestEntry $chDir "sample-clickhouse"
        Write-Host "OK sample-clickhouse/"
    }
} catch {
    $ManifestWarnings += "sample-clickhouse: $($_.Exception.Message)"
    Write-Warning "Skipped sample-clickhouse: $($_.Exception.Message)"
}

$sqlitePath = Join-Path $RepoRoot "data\vitalspan-meta.db"
if (Test-Path $sqlitePath) {
    Copy-Item $sqlitePath (Join-Path $OutDir "vitalspan-meta.db")
    Add-ManifestEntry (Join-Path $OutDir "vitalspan-meta.db") "sqlite-local"
    Write-Host "OK vitalspan-meta.db"
}

@(
    "# Key checklist (do NOT store plaintext secrets in backup dir)",
    "SECRET_KEY",
    "CREDENTIAL_FERNET_KEY",
    "CREDENTIAL_FERNET_KEY_PREVIOUS",
    "CREDENTIAL_SM4_KEY",
    "CREDENTIAL_CRYPTO_PROVIDER",
    "PASSWORD_HASH_ALGORITHM"
) | Out-File -FilePath (Join-Path $OutDir "keys-checklist.txt") -Encoding utf8

$manifestObj = [ordered]@{
    timestamp = $Timestamp
    gitCommit = $GitCommit
    files     = $ManifestFiles
    warnings  = $ManifestWarnings
}
$manifestObj | ConvertTo-Json -Depth 5 | Out-File -FilePath (Join-Path $OutDir "manifest.json") -Encoding utf8

Write-Host ""
Write-Host "Backup complete: $OutDir"
Write-Host "Store keys listed in keys-checklist.txt separately."
