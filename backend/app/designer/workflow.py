from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.designer.schemas import DesignerError
from app.governance.publish import service as publish_service
from app.governance.workflow import service as workflow_service
from app.query.config_store import service as config_store
from app.query.config_store.schemas import ConfigError, ConfigUpsert

_CONFIG_TYPE = "designer_workflow_link"
_REF_TYPE = "designer"


class DesignerWorkflowLinkIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    designer_item_id: uuid.UUID = Field(alias="designerItemId")
    workflow_instance_id: uuid.UUID = Field(alias="workflowInstanceId")
    catalog_entry_id: uuid.UUID | None = Field(default=None, alias="catalogEntryId")
    design_type: Literal["chart", "report", "query"] = Field(default="chart", alias="designType")


class DesignerWorkflowLinkValidateOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    valid: bool = True
    publish_ready: bool = Field(alias="publishReady")


class DesignerWorkflowLinkOut(DesignerWorkflowLinkIn):
    publish_ready: bool = Field(default=False, alias="publishReady")


def _workflow_status(session: Session, instance_id: uuid.UUID) -> str:
    try:
        return workflow_service.get_instance(session, instance_id).status
    except Exception as exc:
        raise DesignerError("DESIGN_WORKFLOW_INSTANCE_NOT_FOUND", "Workflow instance not found", 404) from exc


def _compute_publish_ready(session: Session, link: DesignerWorkflowLinkIn) -> bool:
    status = _workflow_status(session, link.workflow_instance_id)
    if status != "published":
        return False
    if link.catalog_entry_id is None:
        return True
    try:
        return publish_service.get_publish_status(session, link.catalog_entry_id).status == "published"
    except Exception:
        return False


def validate_workflow_link(session: Session, link: DesignerWorkflowLinkIn) -> DesignerWorkflowLinkValidateOut:
    if not str(link.designer_item_id):
        raise DesignerError("DESIGN_WORKFLOW_INVALID_ITEM", "designerItemId required", 422)
    _workflow_status(session, link.workflow_instance_id)
    return DesignerWorkflowLinkValidateOut(publishReady=_compute_publish_ready(session, link))


def save_workflow_link(session: Session, link: DesignerWorkflowLinkIn, owner_id: uuid.UUID | None) -> DesignerWorkflowLinkOut:
    validate_workflow_link(session, link)
    config_store.upsert_config(
        session,
        ConfigUpsert(
            config_type=_CONFIG_TYPE,
            schema_version="1.0",
            ref_type=_REF_TYPE,
            ref_id=link.designer_item_id,
            payload=link.model_dump(by_alias=True, mode="json"),
        ),
        owner_id=owner_id,
    )
    return get_workflow_link(session, link.designer_item_id)


def get_workflow_link(session: Session, designer_item_id: uuid.UUID) -> DesignerWorkflowLinkOut:
    try:
        record = config_store.get_config_by_ref(session, _CONFIG_TYPE, _REF_TYPE, designer_item_id)
    except ConfigError as exc:
        raise DesignerError("DESIGN_WORKFLOW_LINK_NOT_FOUND", "Workflow link not found", 404) from exc
    link = DesignerWorkflowLinkIn.model_validate(record.payload)
    return DesignerWorkflowLinkOut(
        **link.model_dump(),
        publishReady=_compute_publish_ready(session, link),
    )
