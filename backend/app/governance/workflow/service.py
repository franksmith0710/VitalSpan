from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.governance.workflow.errors import WorkflowError
from app.governance.workflow.schemas import (
    WorkflowInstanceCreateIn,
    WorkflowInstanceOut,
    WorkflowTemplateOut,
    WorkflowTemplateValidateIn,
)
from app.query.config_store import service as config_store
from app.query.config_store.schemas import ConfigUpsert

_BUILTIN_TEMPLATES: dict[str, WorkflowTemplateOut] = {
    "standard_query_release": WorkflowTemplateOut(
        id="standard_query_release",
        name="标准查询发布流程",
        nodes=[
            {"id": "draft", "role": "requester"},
            {"id": "pending_approval", "role": "approver"},
            {"id": "designing", "role": "designer"},
            {"id": "pending_publish", "role": "publisher"},
            {"id": "published", "role": "publisher"},
        ],
    )
}

_TRANSITIONS: dict[str, dict[str, tuple[str, str]]] = {
    "draft": {"submit": ("pending_approval", "requester")},
    "pending_approval": {
        "approve": ("designing", "approver"),
        "reject": ("draft", "approver"),
    },
    "designing": {"complete_design": ("pending_publish", "designer")},
    "pending_publish": {"publish": ("published", "publisher")},
    "published": {},
}


def list_templates() -> list[WorkflowTemplateOut]:
    return list(_BUILTIN_TEMPLATES.values())


def validate_template(payload: WorkflowTemplateValidateIn) -> WorkflowTemplateOut:
    node_ids = [n.id for n in payload.nodes]
    if len(node_ids) != len(set(node_ids)):
        raise WorkflowError("GOV_WORKFLOW_INVALID_TEMPLATE", "Duplicate node ids", 422)
    if any(not n.role.strip() for n in payload.nodes):
        raise WorkflowError("GOV_WORKFLOW_INVALID_TEMPLATE", "Node role required", 422)
    return WorkflowTemplateOut(id=payload.id, name=payload.name, nodes=payload.nodes)


def _allowed_actions(status: str) -> list[str]:
    return sorted(_TRANSITIONS.get(status, {}).keys())


def _load_instance_payload(session: Session, instance_id: uuid.UUID) -> dict:
    record = config_store.get_config_by_ref(session, "workflow_instance", "workflow", instance_id)
    return record.payload


def create_instance(session: Session, payload: WorkflowInstanceCreateIn) -> WorkflowInstanceOut:
    if payload.template_id not in _BUILTIN_TEMPLATES:
        raise WorkflowError("GOV_WORKFLOW_TEMPLATE_NOT_FOUND", "Template not found", 404)
    instance_id = uuid.uuid4()
    body = {
        "templateId": payload.template_id,
        "refId": str(payload.ref_id),
        "status": "draft",
        "history": [],
    }
    config_store.upsert_config(
        session,
        ConfigUpsert(
            config_type="workflow_instance",
            schema_version="1.0",
            ref_type="workflow",
            ref_id=instance_id,
            payload=body,
        ),
    )
    return WorkflowInstanceOut(
        id=instance_id,
        templateId=payload.template_id,
        refId=payload.ref_id,
        status="draft",
        allowedActions=_allowed_actions("draft"),
    )


def get_instance(session: Session, instance_id: uuid.UUID) -> WorkflowInstanceOut:
    body = _load_instance_payload(session, instance_id)
    return WorkflowInstanceOut(
        id=instance_id,
        templateId=body["templateId"],
        refId=uuid.UUID(body["refId"]),
        status=body["status"],
        allowedActions=_allowed_actions(body["status"]),
    )


def transition_instance(
    session: Session, instance_id: uuid.UUID, action: str, actor_role: str
) -> WorkflowInstanceOut:
    body = _load_instance_payload(session, instance_id)
    status = body["status"]
    rules = _TRANSITIONS.get(status, {})
    if action not in rules:
        raise WorkflowError("GOV_WORKFLOW_INVALID_TRANSITION", f"Cannot {action} from {status}", 400)
    next_status, required_role = rules[action]
    if actor_role != required_role:
        raise WorkflowError("GOV_WORKFLOW_FORBIDDEN_ROLE", f"Role {actor_role} cannot {action}", 403)
    body["status"] = next_status
    body.setdefault("history", []).append({"action": action, "from": status, "to": next_status, "role": actor_role})
    config_store.upsert_config(
        session,
        ConfigUpsert(
            config_type="workflow_instance",
            schema_version="1.0",
            ref_type="workflow",
            ref_id=instance_id,
            payload=body,
        ),
    )
    return WorkflowInstanceOut(
        id=instance_id,
        templateId=body["templateId"],
        refId=uuid.UUID(body["refId"]),
        status=next_status,
        allowedActions=_allowed_actions(next_status),
    )
