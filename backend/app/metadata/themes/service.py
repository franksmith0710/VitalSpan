from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.metadata.glossary import service as glossary_service
from app.metadata.themes.models import ThemeNode
from app.metadata.themes.schemas import ThemeCreate, ThemeError, ThemeUpdate


def _collect_descendant_ids(session: Session, node_id: uuid.UUID) -> set[uuid.UUID]:
    descendants: set[uuid.UUID] = set()
    frontier = [node_id]
    while frontier:
        current = frontier.pop()
        children = session.scalars(select(ThemeNode.id).where(ThemeNode.parent_id == current))
        for child_id in children:
            if child_id not in descendants:
                descendants.add(child_id)
                frontier.append(child_id)
    return descendants


def list_theme_nodes(
    session: Session,
    parent_id: uuid.UUID | None | str = None,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[ThemeNode], int]:
    capped = min(max(limit, 1), 500)
    base = select(ThemeNode).order_by(ThemeNode.sort_order, ThemeNode.name)
    count_stmt = select(func.count()).select_from(ThemeNode)
    if parent_id == "null":
        base = base.where(ThemeNode.parent_id.is_(None))
        count_stmt = count_stmt.where(ThemeNode.parent_id.is_(None))
    elif parent_id is not None:
        base = base.where(ThemeNode.parent_id == parent_id)
        count_stmt = count_stmt.where(ThemeNode.parent_id == parent_id)
    total = session.scalar(count_stmt) or 0
    items = list(session.scalars(base.limit(capped).offset(max(offset, 0))))
    return items, total


def create_theme_node(session: Session, payload: ThemeCreate) -> ThemeNode:
    if payload.parent_id is not None and session.get(ThemeNode, payload.parent_id) is None:
        raise ThemeError("META_THEME_PARENT_NOT_FOUND", "Parent node not found", 404)
    if payload.term_id is not None:
        glossary_service.get_term(session, payload.term_id)
    node = ThemeNode(
        name=payload.name,
        code=payload.code,
        parent_id=payload.parent_id,
        term_id=payload.term_id,
        sort_order=payload.sort_order,
    )
    session.add(node)
    session.commit()
    session.refresh(node)
    return node


def get_theme_node(session: Session, node_id: uuid.UUID) -> ThemeNode:
    node = session.get(ThemeNode, node_id)
    if node is None:
        raise ThemeError("META_THEME_NOT_FOUND", "Theme node not found", 404)
    return node


def update_theme_node(session: Session, node_id: uuid.UUID, payload: ThemeUpdate) -> ThemeNode:
    node = get_theme_node(session, node_id)
    if payload.term_id is not None:
        glossary_service.get_term(session, payload.term_id)
    node.name = payload.name
    node.code = payload.code
    node.term_id = payload.term_id
    if payload.sort_order is not None:
        node.sort_order = payload.sort_order
    session.commit()
    session.refresh(node)
    return node


def delete_theme_node(session: Session, node_id: uuid.UUID) -> None:
    node = get_theme_node(session, node_id)
    child_count = session.scalar(
        select(func.count()).select_from(ThemeNode).where(ThemeNode.parent_id == node_id)
    )
    if child_count:
        raise ThemeError("META_THEME_HAS_CHILDREN", "Cannot delete node with children", 409)
    session.delete(node)
    session.commit()


def move_theme_node(
    session: Session,
    node_id: uuid.UUID,
    parent_id: uuid.UUID | None,
    sort_order: int | None = None,
) -> ThemeNode:
    node = get_theme_node(session, node_id)
    if parent_id == node_id:
        raise ThemeError("META_THEME_CYCLE", "Cannot move node under itself", 422)
    if parent_id is not None:
        if parent_id in _collect_descendant_ids(session, node_id):
            raise ThemeError("META_THEME_CYCLE", "Cannot move node under its descendant", 422)
        if session.get(ThemeNode, parent_id) is None:
            raise ThemeError("META_THEME_PARENT_NOT_FOUND", "Parent node not found", 404)
    node.parent_id = parent_id
    if sort_order is not None:
        node.sort_order = sort_order
    session.commit()
    session.refresh(node)
    return node
