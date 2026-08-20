# 在 VitalSpan 元库登记 PMTiles 外部服务（幂等）
param(
  [Parameter(Mandatory = $true)][string]$ServiceId,
  [Parameter(Mandatory = $true)][string]$ServiceName,
  [Parameter(Mandatory = $true)][string]$BaseUrl,
  [Parameter(Mandatory = $true)][string]$PmtilesPath
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location "$repoRoot\backend"

$py = @"
from app.datasources.models import get_meta_session
from app.viz.tile_services import service as tile_service
from app.viz.tile_services.schemas import TileServiceCreate, TileServicePatch

db = get_meta_session()
try:
    try:
        tile_service.create_tile_service(
            db,
            TileServiceCreate(
                id="$ServiceId",
                name="$ServiceName",
                baseUrl="$BaseUrl".rstrip("/"),
                pmtilesPath="$PmtilesPath",
                enabled=True,
                description="PMTiles external tile server",
            ),
            updated_by=None,
        )
        db.commit()
        print("registered:$ServiceId")
    except tile_service.TileServiceError as exc:
        if exc.code != "TILE_SERVICE_EXISTS":
            raise
        tile_service.patch_tile_service(
            db,
            "$ServiceId",
            TileServicePatch(
                name="$ServiceName",
                baseUrl="$BaseUrl".rstrip("/"),
                pmtilesPath="$PmtilesPath",
                enabled=True,
            ),
            updated_by=None,
        )
        db.commit()
        print("updated:$ServiceId")
    resolved = tile_service.resolve_tile_service(db, "$ServiceId")
    print("pmtilesUrl=" + resolved.pmtiles_url)
finally:
    db.close()
"@

python -c $py
