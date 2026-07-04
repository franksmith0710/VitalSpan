from __future__ import annotations

import uuid

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.dashboard import service as dash_service
from app.dashboard.theme.errors import ThemeAnalysisError
from app.dashboard.theme.schemas import EntityThemeConfig
from app.query.config_store import service as config_store
from app.query.config_store.schemas import ConfigUpsert


def _map_validation(exc: ValidationError) -> ThemeAnalysisError:
    for err in exc.errors():
        loc = ".".join(str(x) for x in err["loc"])
        if "geo_binding" in loc or "geoBinding" in loc:
            return ThemeAnalysisError("DASH_THEME_INVALID_GEO", "geoBinding requires latField and lngField", 422)
        if "time_granularity" in loc or "timeGranularity" in loc:
            return ThemeAnalysisError("DASH_THEME_INVALID_GRANULARITY", "Invalid time granularity", 422)
        if "dimensions" in loc:
            return ThemeAnalysisError("DASH_THEME_EMPTY_DIMENSIONS", "At least one dimension required", 422)
    return ThemeAnalysisError("DASH_THEME_INVALID", "Invalid theme config", 422)


def validate_theme_config(payload: dict) -> EntityThemeConfig:
    try:
        config = EntityThemeConfig.model_validate(payload)
    except ValidationError as exc:
        raise _map_validation(exc) from exc
    if not config.dimensions:
        raise ThemeAnalysisError("DASH_THEME_EMPTY_DIMENSIONS", "At least one dimension required", 422)
    if config.geo_binding is not None:
        if not config.geo_binding.lat_field or not config.geo_binding.lng_field:
            raise ThemeAnalysisError("DASH_THEME_INVALID_GEO", "geoBinding requires latField and lngField", 422)
    return config


def _assert_ref_exists(db: Session, config: EntityThemeConfig) -> None:
    if config.ref_type == "dashboard":
        try:
            dash_service.get_dashboard(db, config.ref_id)
        except dash_service.DashboardError as exc:
            if exc.code == "DASH_NOT_FOUND":
                raise ThemeAnalysisError("DASH_NOT_FOUND", exc.message, 404) from exc
            raise


def save_theme_config(db: Session, payload: dict, owner_id: uuid.UUID | None) -> EntityThemeConfig:
    config = validate_theme_config(payload)
    _assert_ref_exists(db, config)
    config_store.upsert_config(
        db,
        ConfigUpsert(
            config_type="entity_theme",
            schema_version=config.schema_version,
            ref_type=config.ref_type,
            ref_id=config.ref_id,
            payload=config.model_dump(mode="json", by_alias=True),
        ),
        owner_id=owner_id,
    )
    return config


def get_theme_config(db: Session, ref_type: str, ref_id: uuid.UUID) -> EntityThemeConfig:
    record = config_store.get_config_by_ref(db, "entity_theme", ref_type, ref_id)
    return validate_theme_config(record.payload)
