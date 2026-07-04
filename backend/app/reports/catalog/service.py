from __future__ import annotations

import uuid
from dataclasses import dataclass

from app.reports.catalog.errors import ReportCatalogError
from app.reports.catalog.schemas import CatalogNodeCreate, CatalogNodeMove, CatalogNodeOut, CatalogNodeUpdate

MAX_CATALOG_DEPTH = 8
_nodes: dict[uuid.UUID, dict] = {}


@dataclass
class _Node:
    id: uuid.UUID
    name: str
    parent_id: uuid.UUID | None
    node_type: str
    template_kind: str | None
    sort_order: int


def _to_out(node: _Node) -> CatalogNodeOut:
    return CatalogNodeOut(
        id=node.id,
        name=node.name,
        parentId=node.parent_id,
        nodeType=node.node_type,
        templateKind=node.template_kind,
        sortOrder=node.sort_order,
    )


def _get(node_id: uuid.UUID) -> _Node:
    raw = _nodes.get(node_id)
    if raw is None:
        raise ReportCatalogError("RPT_CATALOG_NODE_NOT_FOUND", "Catalog node not found", 404)
    return _Node(**raw)


def _depth(node_id: uuid.UUID | None) -> int:
    depth = 0
    current = node_id
    seen: set[uuid.UUID] = set()
    while current is not None:
        if current in seen:
            break
        seen.add(current)
        depth += 1
        if depth > MAX_CATALOG_DEPTH:
            break
        raw = _nodes.get(current)
        if raw is None:
            break
        current = raw["parent_id"]
    return depth


def _subtree_height(node_id: uuid.UUID) -> int:
    height = 0
    frontier = [node_id]
    while frontier:
        height += 1
        if height > MAX_CATALOG_DEPTH:
            break
        next_level: list[uuid.UUID] = []
        for nid in frontier:
            next_level.extend(child_id for child_id, raw in _nodes.items() if raw["parent_id"] == nid)
        frontier = next_level
    return height


def _collect_descendants(node_id: uuid.UUID) -> set[uuid.UUID]:
    out: set[uuid.UUID] = set()
    frontier = [node_id]
    while frontier:
        current = frontier.pop()
        for child_id, raw in _nodes.items():
            if raw["parent_id"] == current and child_id not in out:
                out.add(child_id)
                frontier.append(child_id)
    return out


def _assert_depth(parent_id: uuid.UUID | None, subtree_root: uuid.UUID | None = None) -> None:
    extra = _subtree_height(subtree_root) if subtree_root else 1
    if _depth(parent_id) + extra > MAX_CATALOG_DEPTH:
        raise ReportCatalogError(
            "RPT_CATALOG_MAX_DEPTH",
            f"Catalog tree depth cannot exceed {MAX_CATALOG_DEPTH}",
            422,
        )


def list_nodes(parent_id: uuid.UUID | None = None) -> list[CatalogNodeOut]:
    items = [_get(nid) for nid in _nodes]
    if parent_id is not None:
        items = [n for n in items if n.parent_id == parent_id]
    else:
        items = [n for n in items if n.parent_id is None]
    return [_to_out(n) for n in sorted(items, key=lambda x: (x.sort_order, x.name))]


def create_node(payload: CatalogNodeCreate) -> CatalogNodeOut:
    if payload.parent_id is not None and payload.parent_id not in _nodes:
        raise ReportCatalogError("RPT_CATALOG_PARENT_NOT_FOUND", "Parent node not found", 404)
    _assert_depth(payload.parent_id)
    node_id = uuid.uuid4()
    _nodes[node_id] = {
        "id": node_id,
        "name": payload.name,
        "parent_id": payload.parent_id,
        "node_type": payload.node_type,
        "template_kind": payload.template_kind,
        "sort_order": payload.sort_order,
    }
    return _to_out(_get(node_id))


def get_node(node_id: uuid.UUID) -> CatalogNodeOut:
    return _to_out(_get(node_id))


def update_node(node_id: uuid.UUID, payload: CatalogNodeUpdate) -> CatalogNodeOut:
    _get(node_id)
    if payload.name is not None:
        _nodes[node_id]["name"] = payload.name
    if payload.sort_order is not None:
        _nodes[node_id]["sort_order"] = payload.sort_order
    return _to_out(_get(node_id))


def delete_node(node_id: uuid.UUID) -> None:
    _get(node_id)
    if any(raw["parent_id"] == node_id for raw in _nodes.values()):
        raise ReportCatalogError("RPT_CATALOG_HAS_CHILDREN", "Cannot delete node with children", 409)
    del _nodes[node_id]


def move_node(node_id: uuid.UUID, payload: CatalogNodeMove) -> CatalogNodeOut:
    _get(node_id)
    parent_id = payload.parent_id
    if parent_id == node_id:
        raise ReportCatalogError("RPT_CATALOG_CYCLE", "Cannot move node under itself", 422)
    if parent_id is not None:
        if parent_id in _collect_descendants(node_id):
            raise ReportCatalogError("RPT_CATALOG_CYCLE", "Cannot move node under its descendant", 422)
        if parent_id not in _nodes:
            raise ReportCatalogError("RPT_CATALOG_PARENT_NOT_FOUND", "Parent node not found", 404)
    _assert_depth(parent_id, node_id)
    _nodes[node_id]["parent_id"] = parent_id
    return _to_out(_get(node_id))


def node_exists(node_id: uuid.UUID) -> bool:
    return node_id in _nodes
