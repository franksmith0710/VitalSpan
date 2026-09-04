"""Tests for Feishu post-bind capability probe."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from app.auth.im_oauth.feishu_capability import probe_feishu_user_delivery
from app.reports.scheduler.channels.im_sdk.feishu_common import (
    FEISHU_PUSH_SCOPES,
    normalize_feishu_push_scopes,
)


def _mock_client(get_json=None):
    client = MagicMock()
    get_resp = MagicMock()
    get_resp.json.return_value = get_json or {"code": 0, "data": {"user_id": "u1", "open_id": "ou_x"}}
    get_resp.status_code = 200
    client.get.return_value = get_resp
    client.__enter__ = MagicMock(return_value=client)
    client.__exit__ = MagicMock(return_value=False)
    return client


def test_normalize_feishu_push_scopes_always_includes_full_bundle():
    merged = normalize_feishu_push_scopes("im:resource")
    assert "offline_access" in merged
    assert "im:message" in merged
    assert "im:message.send_as_user" in merged
    assert "im:resource" in merged


def test_probe_ready_when_text_upload_and_file_send_ok():
    with patch(
        "app.auth.im_oauth.feishu_capability.httpx.Client",
        return_value=_mock_client(),
    ):
        with patch(
            "app.auth.im_oauth.feishu_capability.send_feishu_text_http",
        ) as send_text:
            with patch(
                "app.auth.im_oauth.feishu_capability.upload_feishu_file_http",
                return_value="fk_probe",
            ):
                with patch(
                    "app.auth.im_oauth.feishu_capability.send_feishu_file_http",
                ) as send_file:
                    probe = probe_feishu_user_delivery(
                        access_token="tok",
                        account_id="u1",
                        app_id="cli_app",
                    )
    send_text.assert_called_once()
    send_file.assert_called_once()
    assert probe.ready is True


def test_probe_ready_with_open_id_only_account():
    open_id_json = {"code": 0, "data": {"open_id": "ou_abc"}}
    with patch(
        "app.auth.im_oauth.feishu_capability.httpx.Client",
        return_value=_mock_client(get_json=open_id_json),
    ):
        with patch("app.auth.im_oauth.feishu_capability.send_feishu_text_http") as send_text:
            with patch(
                "app.auth.im_oauth.feishu_capability.upload_feishu_file_http",
                return_value="fk_probe",
            ):
                with patch("app.auth.im_oauth.feishu_capability.send_feishu_file_http"):
                    probe = probe_feishu_user_delivery(
                        access_token="tok",
                        account_id="ou_abc",
                        app_id="cli_app",
                    )
    send_text.assert_called_once_with(
        access_token="tok",
        account_id="ou_abc",
        text="VitalSpan 连通性探测（可忽略）。若收到 PDF 附件，仅用于权限自检，可放心删除。",
    )
    assert probe.ready is True
    assert probe.needs_admin is False


def test_probe_needs_admin_for_employee_id():
    info_json = {
        "code": 99991679,
        "msg": "Unauthorized. contact:user.employee_id:readonly",
    }
    with patch(
        "app.auth.im_oauth.feishu_capability.httpx.Client",
        return_value=_mock_client(get_json=info_json),
    ):
        probe = probe_feishu_user_delivery(access_token="tok", account_id="ou_abc", app_id="cli_app")
    assert probe.ready is False
    assert probe.needs_admin is True
    assert probe.admin_portal_url == "https://open.feishu.cn/app/cli_app/auth"


def test_probe_pdf_bytes_are_valid_minimal_pdf():
    from app.auth.im_oauth.feishu_capability import _MIN_PROBE_PDF

    assert _MIN_PROBE_PDF.startswith(b"%PDF-")
    assert _MIN_PROBE_PDF.rstrip().endswith(b"%%EOF")
    assert b"xref" in _MIN_PROBE_PDF
    assert b"/Type/Page" in _MIN_PROBE_PDF

    with patch(
        "app.auth.im_oauth.feishu_capability.httpx.Client",
        return_value=_mock_client(),
    ):
        with patch(
            "app.auth.im_oauth.feishu_capability.send_feishu_text_http",
        ):
            with patch(
                "app.auth.im_oauth.feishu_capability.upload_feishu_file_http",
                side_effect=RuntimeError("Unauthorized. privileges: ['im:resource']"),
            ):
                probe = probe_feishu_user_delivery(
                    access_token="tok",
                    account_id="u1",
                    app_id="cli_app",
                )
    assert probe.ready is False
    assert probe.suggested_scope == FEISHU_PUSH_SCOPES
    assert "im:message" in (probe.suggested_scope or "")
