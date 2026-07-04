from __future__ import annotations

import uuid

from app.auth.deps import UserContext
from app.governance.catalog.classification.errors import (
    CAT_CLASS_FORBIDDEN,
    CAT_CLASS_NOT_FOUND,
    ClassificationError,
)
from app.governance.catalog.classification.schemas import (
    MAX_CLASS_DEPTH,
    ClassificationNodeCreate,
    ClassificationNodeListResponse,
    ClassificationNodeMove,
    ClassificationNodeOut,
)

_nodes: dict[uuid.UUID, dict] = {}
_codes: set[str] = set()
_USER_CLASS_SCOPE: dict[str, str] = {}


def set_user_class_scope(user_id: str, code_prefix: str) -> None:
    _USER_CLASS_SCOPE[user_id] = code_prefix


def _assert_classification_write_access(user: UserContext, code: str) -> None:
    roles = set(user.roles)
    if roles.intersection({"admin", "analyst"}):
        return
    if "viewer" in roles and not roles.intersection({"editor", "analyst", "admin"}):
        raise ClassificationError(CAT_CLASS_FORBIDDEN, "viewer cannot modify classification nodes", 403)
    if "enterprise" in roles:
        prefix = _USER_CLASS_SCOPE.get(user.id, "CAT")
        if not code.startswith(prefix):
            raise ClassificationError(CAT_CLASS_FORBIDDEN, "enterprise user out of classification scope", 403)


def _to_out(record: dict) -> ClassificationNodeOut:
    return ClassificationNodeOut.model_validate(record)


def _children(parent_id: uuid.UUID | None) -> list[dict]:
    return [n for n in _nodes.values() if n["parentId"] == parent_id]


def _node_depth(node_id: uuid.UUID | None) -> int:
    depth = 0
    current = node_id
    seen: set[uuid.UUID] = set()
    while current is not None:
        if current in seen:
            break
        seen.add(current)
        depth += 1
        if depth > MAX_CLASS_DEPTH:
            break
        record = _nodes.get(current)
        if record is None:
            break
        current = record.get("parentId")
    return depth


def _subtree_height(root_id: uuid.UUID) -> int:
    max_h = 0
    level = [root_id]
    while level:
        max_h += 1
        if max_h > MAX_CLASS_DEPTH:
            break
        next_level = []
        for nid in level:
            next_level.extend(c["nodeId"] for c in _children(nid))
        level = next_level
    return max_h


def _collect_descendants(node_id: uuid.UUID) -> set[uuid.UUID]:
    out: set[uuid.UUID] = set()
    frontier = [node_id]
    while frontier:
        current = frontier.pop()
        for child in _children(current):
            cid = child["nodeId"]
            if cid not in out:
                out.add(cid)
                frontier.append(cid)
    return out


def _assert_depth(parent_id: uuid.UUID | None, subtree_root: uuid.UUID | None = None) -> None:
    parent_depth = _node_depth(parent_id)
    extra = _subtree_height(subtree_root) if subtree_root else 1
    if parent_depth + extra > MAX_CLASS_DEPTH:
        raise ClassificationError(
            "CAT_CLASS_MAX_DEPTH",
            f"Classification tree depth cannot exceed {MAX_CLASS_DEPTH}",
            422,
            fields=[{"field": "parentId", "message": f"max depth is {MAX_CLASS_DEPTH}"}],
        )


def list_nodes(parent_id: uuid.UUID | None = None, limit: int = 100, offset: int = 0) -> ClassificationNodeListResponse:
    items = sorted(_children(parent_id), key=lambda n: (n["sortOrder"], n["name"]))
    capped = min(max(limit, 1), 500)
    sliced = items[max(offset, 0) : max(offset, 0) + capped]
    return ClassificationNodeListResponse(items=[_to_out(n) for n in sliced], total=len(items))


def create_node(payload: ClassificationNodeCreate, user: UserContext) -> ClassificationNodeOut:
    _assert_classification_write_access(user, payload.code)
    if payload.code in _codes:
        raise ClassificationError("CAT_CLASS_CODE_CONFLICT", "Classification code already exists", 409)
    if payload.parent_id is not None and payload.parent_id not in _nodes:
        raise ClassificationError("CAT_CLASS_PARENT_NOT_FOUND", "Parent node not found", 404)
    _assert_depth(payload.parent_id)
    node_id = uuid.uuid4()
    record = {
        "nodeId": node_id,
        "code": payload.code,
        "name": payload.name,
        "parentId": payload.parent_id,
        "kind": payload.kind,
        "sortOrder": payload.sort_order,
    }
    _nodes[node_id] = record
    _codes.add(payload.code)
    return _to_out(record)


def move_node(node_id: uuid.UUID, payload: ClassificationNodeMove, user: UserContext) -> ClassificationNodeOut:
    record = _nodes.get(node_id)
    if record is None:
        raise ClassificationError(CAT_CLASS_NOT_FOUND, "Node not found", 404)
    _assert_classification_write_access(user, record["code"])
    parent_id = payload.parent_id
    if parent_id == node_id:
        raise ClassificationError("CAT_CLASS_CYCLE", "Cannot move node under itself", 422)
    if parent_id is not None:
        if parent_id in _collect_descendants(node_id):
            raise ClassificationError("CAT_CLASS_CYCLE", "Cannot move node under its descendant", 422)
        if parent_id not in _nodes:
            raise ClassificationError("CAT_CLASS_PARENT_NOT_FOUND", "Parent node not found", 404)
    _assert_depth(parent_id, node_id)
    record["parentId"] = parent_id
    if payload.sort_order is not None:
        record["sortOrder"] = payload.sort_order
    return _to_out(record)


def delete_node(node_id: uuid.UUID, user: UserContext) -> None:
    if node_id not in _nodes:
        raise ClassificationError(CAT_CLASS_NOT_FOUND, "Node not found", 404)
    _assert_classification_write_access(user, _nodes[node_id]["code"])
    if _children(node_id):
        raise ClassificationError("CAT_CLASS_HAS_CHILDREN", "Cannot delete node with children", 409)
    code = _nodes[node_id]["code"]
    del _nodes[node_id]
    _codes.discard(code)
