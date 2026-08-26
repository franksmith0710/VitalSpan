"""Artifact reference guard for delete."""

from __future__ import annotations

import uuid
from unittest.mock import MagicMock

import pytest

from app.ai_viz.errors import AiVizError
from app.ai_viz.service import delete_artifact, find_artifact_references
from app.auth.deps import UserContext


def _actor(user_id: uuid.UUID | None = None) -> UserContext:
    return UserContext(
        id=str(user_id or uuid.uuid4()),
        username="tester",
        roles=[],
        permissions=set(),
    )


def test_find_artifact_references_from_layout_json() -> None:
    aid = uuid.uuid4()
    dash_id = uuid.uuid4()
    row = MagicMock()
    row.id = dash_id
    row.name = "测试大屏"
    row.layout_json = {
        "widgets": [
            {
                "id": "w1",
                "customVizConfig": {"artifactId": str(aid)},
            }
        ]
    }
    db = MagicMock()
    db.scalars.return_value.all.return_value = [row]
    refs = find_artifact_references(db, aid)
    assert len(refs) == 1
    assert refs[0].dashboard_id == dash_id
    assert refs[0].widget_id == "w1"


def test_delete_artifact_blocks_when_referenced() -> None:
    owner = uuid.uuid4()
    aid = uuid.uuid4()
    row = MagicMock()
    row.owner_user_id = owner
    dash = MagicMock()
    dash.id = uuid.uuid4()
    dash.name = "screen"
    dash.layout_json = {"widgets": [{"id": "w9", "customVizConfig": {"artifactId": str(aid)}}]}
    db = MagicMock()
    db.get.return_value = row
    db.scalars.return_value.all.return_value = [dash]
    with pytest.raises(AiVizError) as exc:
        delete_artifact(db, aid, _actor(owner))
    assert exc.value.code == "AIVIZ_IN_USE"
    assert exc.value.status == 409
    db.delete.assert_not_called()
