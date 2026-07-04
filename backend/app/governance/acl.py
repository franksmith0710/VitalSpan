from __future__ import annotations

import uuid
from typing import Literal

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.auth.rls.hooks import get_query_rls_fragment
from app.auth.rls.predicate import resolve_user_org_node_ids


class GovAclError(Exception):
    def __init__(self, code: str, message: str, status: int = 403) -> None:
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


def _actor_uuid(actor_id: str) -> uuid.UUID | None:
    try:
        return uuid.UUID(actor_id)
    except ValueError:
        return None


def assert_query_design_action(
    session: Session,
    actor: UserContext,
    action: Literal["save", "publish"],
    *,
    owner_id: uuid.UUID | None,
    status: str,
) -> None:
    if "admin" in actor.roles:
        if status == "pending_publish":
            _assert_rls_binding(session, actor)
        return
    if action == "save" and status == "draft":
        actor_uuid = _actor_uuid(actor.id)
        if owner_id is not None and actor_uuid is not None and owner_id != actor_uuid:
            raise GovAclError("GOV_ACL_FORBIDDEN", "Only owner or admin may save draft", 403)
        return
    if action == "save" and status == "pending_publish":
        if "designer" not in actor.roles:
            raise GovAclError("GOV_ACL_FORBIDDEN", "pending_publish requires designer or admin", 403)
        _assert_rls_binding(session, actor)
        return
    if action == "publish":
        raise GovAclError("GOV_ACL_FORBIDDEN", "publish requires admin", 403)


def _assert_rls_binding(session: Session, actor: UserContext) -> None:
    actor_uuid = _actor_uuid(actor.id)
    if actor_uuid is None:
        return
    org_ids = resolve_user_org_node_ids(session, actor_uuid)
    if not org_ids:
        raise GovAclError("GOV_RLS_BINDING_REQUIRED", "User has no organization binding", 403)
    get_query_rls_fragment(session, actor)
