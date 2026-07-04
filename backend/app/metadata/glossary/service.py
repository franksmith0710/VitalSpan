from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.metadata.glossary.models import GlossaryTerm
from app.metadata.glossary.schemas import GlossaryError, TermCreate, TermUpdate


def list_terms(
    session: Session,
    code_prefix: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[GlossaryTerm], int]:
    capped = min(max(limit, 1), 500)
    base = select(GlossaryTerm).order_by(GlossaryTerm.code)
    count_stmt = select(func.count()).select_from(GlossaryTerm)
    if code_prefix:
        base = base.where(GlossaryTerm.code.startswith(code_prefix))
        count_stmt = count_stmt.where(GlossaryTerm.code.startswith(code_prefix))
    total = session.scalar(count_stmt) or 0
    items = list(session.scalars(base.limit(capped).offset(max(offset, 0))))
    return items, total


def create_term(session: Session, payload: TermCreate) -> GlossaryTerm:
    term = GlossaryTerm(
        code=payload.code,
        name=payload.name,
        definition=payload.definition,
        description=payload.description,
    )
    session.add(term)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise GlossaryError("META_TERM_CODE_CONFLICT", "Term code already exists", 409) from exc
    session.refresh(term)
    return term


def get_term(session: Session, term_id: uuid.UUID) -> GlossaryTerm:
    term = session.get(GlossaryTerm, term_id)
    if term is None:
        raise GlossaryError("META_TERM_NOT_FOUND", "Term not found", 404)
    return term


def update_term(session: Session, term_id: uuid.UUID, payload: TermUpdate) -> GlossaryTerm:
    term = get_term(session, term_id)
    term.name = payload.name
    term.definition = payload.definition
    term.description = payload.description
    session.commit()
    session.refresh(term)
    return term


def delete_term(session: Session, term_id: uuid.UUID) -> None:
    from app.metadata.themes.models import ThemeNode

    term = get_term(session, term_id)
    in_use = session.scalar(
        select(func.count()).select_from(ThemeNode).where(ThemeNode.term_id == term_id)
    )
    if in_use:
        raise GlossaryError("META_TERM_IN_USE", "Term is referenced by theme nodes", 409)
    session.delete(term)
    session.commit()
