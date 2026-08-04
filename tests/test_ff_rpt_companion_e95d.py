"""F-F RPT companion track C — e95d (RPT-001/002/003/005/007)."""
from __future__ import annotations

import os
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.auth.deps import UserContext, get_current_user
from app.core.config import get_settings
from app.main import app as fastapi_app
from app.reports.batch import export_jobs as batch_export_jobs
from app.reports.scheduler.delivery_adapter import deliver_artifact
from jwt_auth import AUTH, jwt_auth_headers

_SQLITE = "sqlite+pysqlite:///file:ff_rpt_e95d?mode=memory&cache=shared&uri=true"
_TEMPLATE_BODY = {
    "templateKey": "sales_summary",
    "format": "word",
    "displayName": "销售汇总",
    "blocks": [{"blockType": "table", "tableRef": "sales_fact"}],
}


@pytest.fixture(scope="module", autouse=True)
def _sqlite():
    prev = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _SQLITE
    get_settings.cache_clear()
    from app.auth.models import Base as AuthBase, get_meta_engine as auth_engine
    from app.datasources.models import Base, get_meta_engine
    from app.query.models import Base as QueryBase
    import app.auth.models  # noqa: F401
    import app.dashboard.models  # noqa: F401

    get_meta_engine.cache_clear()
    auth_engine.cache_clear()
    engine = get_meta_engine()
    Base.metadata.create_all(engine)
    AuthBase.metadata.create_all(engine)
    QueryBase.metadata.create_all(engine)
    yield
    os.environ["DATABASE_URL"] = prev if prev else os.environ.pop("DATABASE_URL", None)
    get_settings.cache_clear()
    get_meta_engine.cache_clear()
    auth_engine.cache_clear()
    fastapi_app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _reset_stores():
    from app.reports.persistence.store import reset_metadata_for_tests

    reset_metadata_for_tests()
    jobs_snapshot = dict(batch_export_jobs._jobs)
    batch_export_jobs._jobs.clear()
    yield
    reset_metadata_for_tests()
    batch_export_jobs._jobs.clear()
    batch_export_jobs._jobs.update(jobs_snapshot)
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(fastapi_app)


def _put_template(client: TestClient, key: str = "sales_summary") -> str:
    body = {**_TEMPLATE_BODY, "templateKey": key}
    resp = client.put(f"/api/v1/reports/templates/{key}", headers=AUTH, json=body)
    assert resp.status_code == 200, resp.text
    nid = client.post(
        "/api/v1/reports/catalog/nodes",
        headers=AUTH,
        json={"name": "Run", "nodeType": "template", "templateKind": "word", "templateKey": key},
    ).json()["id"]
    client.put(
        f"/api/v1/reports/catalog/nodes/{nid}/extension",
        headers=AUTH,
        json={"catalogNodeId": nid, "metrics": [], "filters": [], "changeNote": "init"},
    )
    return nid


def test_rpt001_export_chain_catalog_template(client: TestClient):
    """RPT-001: catalog template → exportHook wired + download bytes."""
    node_id = _put_template(client)
    run = client.post(
        f"/api/v1/reports/templates/{node_id}/run",
        headers=AUTH,
        json={"format": "word"},
    )
    assert run.status_code == 200, run.text
    hook = run.json()["exportHook"]
    assert hook["placeholder"] is False
    export = client.get(
        f"/api/v1/reports/export?templateId={node_id}&format=word",
        headers=AUTH,
    )
    assert export.status_code == 200, export.text
    body = export.json()
    assert body["status"] == "ready"
    assert body["downloadUrl"]
    dl = client.get(body["downloadUrl"], headers=AUTH)
    assert dl.status_code == 200
    assert len(dl.content) > 0


def test_rpt001_pdf_export_bytes(client: TestClient):
    """RPT-001: real PDF bytes through export chain (no mock://)."""
    key = "pdf_tpl"
    client.put(
        f"/api/v1/reports/templates/{key}",
        headers=AUTH,
        json={
            "templateKey": key,
            "format": "pdf",
            "displayName": "PDF",
            "blocks": [{"blockType": "sql", "queryRef": "SELECT 1"}],
        },
    )
    nid = client.post(
        "/api/v1/reports/catalog/nodes",
        headers=AUTH,
        json={"name": "P", "nodeType": "template", "templateKind": "pdf", "templateKey": key},
    ).json()["id"]
    client.put(
        f"/api/v1/reports/catalog/nodes/{nid}/extension",
        headers=AUTH,
        json={"catalogNodeId": nid, "metrics": [], "filters": [], "changeNote": "init"},
    )
    export = client.get(f"/api/v1/reports/export?templateId={nid}&format=pdf", headers=AUTH)
    assert export.status_code == 200
    assert export.json()["downloadUrl"]
    assert "mock://" not in (export.json().get("downloadUrl") or "")
    dl = client.get(export.json()["downloadUrl"], headers=AUTH)
    assert dl.content.startswith(b"%PDF")
    assert b"mock" not in dl.content.lower()


def test_rpt002_prefab_binding_put(client: TestClient):
    """RPT-002: Admin PUT prefab binding."""
    payload = {
        "bindingKey": "prefab-custom",
        "entityTypeCode": "equipment",
        "analysisType": "lifecycle",
        "dimensionCodes": ["status"],
        "displayName": "自定义预制",
        "allowedRoles": ["analyst"],
    }
    resp = client.put("/api/v1/reports/prefab/bindings/prefab-custom", headers=AUTH, json=payload)
    assert resp.status_code == 200, resp.text
    got = client.get("/api/v1/reports/prefab/bindings/prefab-custom", headers=AUTH)
    assert got.status_code == 200
    assert got.json()["displayName"] == "自定义预制"


def test_rpt003_template_blocks_reorder(client: TestClient):
    """RPT-003: PUT template blocks with reorder + SQL."""
    body = {
        "templateKey": "block_edit",
        "format": "word",
        "displayName": "块编辑",
        "blocks": [
            {"blockType": "sql", "queryRef": "SELECT a"},
            {"blockType": "table", "tableRef": "t1"},
        ],
    }
    assert client.put("/api/v1/reports/templates/block_edit", headers=AUTH, json=body).status_code == 200
    reordered = {
        **body,
        "blocks": [
            {"blockType": "table", "tableRef": "t1"},
            {"blockType": "sql", "queryRef": "SELECT b FROM facts"},
        ],
    }
    resp = client.put("/api/v1/reports/templates/block_edit", headers=AUTH, json=reordered)
    assert resp.status_code == 200
    blocks = resp.json()["blocks"]
    assert blocks[0]["blockType"] == "table"
    assert blocks[1]["queryRef"] == "SELECT b FROM facts"


def test_rpt005_delivery_smtp_without_header(client: TestClient):
    """RPT-005: 无 mock header 时固定走 SMTP 适配器。"""
    settings = get_settings()
    result = deliver_artifact("semi://x", ["email"], None, settings)
    assert result["deliveryMode"] == "smtp"
    assert result["deliverySteps"][0]["mode"] == "smtp"


def test_rpt005_delivery_mock_mode_requires_header(client: TestClient):
    """RPT-005: explicit X-Rpt-Delivery-Mock success → mock delivered."""
    settings = get_settings()
    result = deliver_artifact("semi://x", ["email"], "success", settings)
    assert result["deliveryMode"] == "mock"
    assert result["status"] == "delivered"


def test_rpt005_delivery_smtp_mode(client: TestClient):
    """RPT-005: smtp adapter attempts send (mock SMTP)."""
    settings = get_settings()
    with patch(
        "app.reports.scheduler.delivery_adapter.smtplib.SMTP",
    ) as smtp_cls:
        smtp_cls.return_value.__enter__.return_value.send_message.return_value = None
        result = deliver_artifact("semi://reports/x/y", ["email"], None, settings)
    assert result["deliveryMode"] == "smtp"
    assert result["deliverySteps"][0]["mode"] == "smtp"


def test_rpt005_delivery_smtp_includes_pdf_attachment(client: TestClient):
    """RPT-005: visual_snapshot 投递应附带 PDF MIME 附件。"""
    settings = get_settings()
    pdf_bytes = b"%PDF-1.4 attachment test\n" + b"x" * 64
    with patch("app.reports.scheduler.delivery_adapter.smtplib.SMTP") as smtp_cls:
        smtp_instance = smtp_cls.return_value.__enter__.return_value
        result = deliver_artifact(
            "/api/v1/dashboards/export-jobs/00000000-0000-4000-8000-000000000001/download",
            ["email"],
            None,
            settings,
            artifact_kind="visual_snapshot",
            attachment_bytes=pdf_bytes,
            attachment_filename="dashboard-test.pdf",
            attachment_mime="application/pdf",
        )
        assert result["deliveryMode"] == "smtp"
        assert result["status"] == "delivered"
        msg = smtp_instance.send_message.call_args[0][0]
        attachments = list(msg.iter_attachments())
        assert len(attachments) == 1
        assert attachments[0].get_content() == pdf_bytes


def test_rpt005_delivery_smtp_connection_refused_surfaces_error():
    """RPT-005: SMTP 连接失败时返回可读中文错误并写入顶层 error。"""
    settings = get_settings()
    with patch(
        "app.reports.scheduler.delivery_adapter.smtplib.SMTP",
        side_effect=ConnectionRefusedError(111, "Connection refused"),
    ):
        result = deliver_artifact("semi://reports/x/y", ["email"], None, settings)
    assert result["status"] == "degraded"
    assert result["deliverySteps"][0]["status"] == "failed"
    assert "邮件投递失败" in (result.get("error") or "")
    assert "MailHog" in (result.get("error") or "")


def test_rpt007_batch_export_job_poll(client: TestClient):
    """RPT-007: async batch export job pending → ready + download."""
    node_id = _put_template(client)
    submit = client.post(
        "/api/v1/reports/batch/export",
        headers=AUTH,
        json={"nodeIds": [node_id], "format": "word"},
    )
    assert submit.status_code == 202, submit.text
    job_id = submit.json()["jobId"]
    first = client.get(f"/api/v1/reports/jobs/{job_id}", headers=AUTH)
    assert first.status_code == 200
    assert first.json()["status"] in {"pending", "processing"}
    second = client.get(f"/api/v1/reports/jobs/{job_id}", headers=AUTH)
    assert second.json()["status"] == "ready"
    assert second.json()["downloadUrl"]
    dl = client.get(second.json()["downloadUrl"], headers=AUTH)
    assert dl.status_code == 200
    assert b"batch-export" in dl.content


VIEWER_USER_ID = "00000000-0000-4000-8000-000000000099"


def test_rpt007_job_forbidden_for_other_user(client: TestClient):
    """RPT-007: non-owner viewer cannot poll job."""
    node_id = _put_template(client)
    submit = client.post(
        "/api/v1/reports/batch/export",
        headers=AUTH,
        json={"nodeIds": [node_id], "format": "pdf"},
    )
    job_id = submit.json()["jobId"]

    async def _viewer() -> UserContext:
        return UserContext(id=VIEWER_USER_ID, username="viewer", roles=["viewer"])

    fastapi_app.dependency_overrides[get_current_user] = _viewer
    resp = client.get(
        f"/api/v1/reports/jobs/{job_id}",
        headers=jwt_auth_headers(user_id=VIEWER_USER_ID, username="viewer"),
    )
    fastapi_app.dependency_overrides.clear()
    assert resp.status_code == 403
    assert resp.json()["code"] in {"RPT_BATCH_EXPORT_JOB_FORBIDDEN", "PERMISSION_DENIED"}
