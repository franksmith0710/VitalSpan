import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.auth.models import Base, get_meta_engine
from app.core.config import get_settings

_AUTH_RBAC_SQLITE_URL = "sqlite+pysqlite:///file:auth_rbac_test?mode=memory&cache=shared&uri=true"


@pytest.fixture(scope="module", autouse=True)
def auth_rbac_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _AUTH_RBAC_SQLITE_URL
    get_settings.cache_clear()
    get_meta_engine.cache_clear()
    yield
    if previous is None:
        os.environ.pop("DATABASE_URL", None)
    else:
        os.environ["DATABASE_URL"] = previous
    get_settings.cache_clear()
    get_meta_engine.cache_clear()


from app.main import app

get_settings.cache_clear()
get_meta_engine.cache_clear()


@pytest.fixture(scope="module", autouse=True)
def ensure_auth_tables():
    engine = get_meta_engine()
    Base.metadata.create_all(engine)
    yield
    with engine.begin() as conn:
        for table in (
            "auth_user_roles",
            "auth_resource_grants",
            "auth_dimension_types",
            "auth_org_nodes",
            "auth_users",
            "auth_roles",
        ):
            conn.execute(text(f"DELETE FROM {table}"))


@pytest.fixture(autouse=True)
def clean_auth_tables_between_tests():
    yield
    engine = get_meta_engine()
    with engine.begin() as conn:
        for table in (
            "auth_user_roles",
            "auth_resource_grants",
            "auth_dimension_types",
            "auth_org_nodes",
            "auth_users",
            "auth_roles",
        ):
            conn.execute(text(f"DELETE FROM {table}"))


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer dev"}


def test_auth_rbac_infra_tables_exist():
    """T-AUTH-INFRA: auth 六表 create_all 成功。"""
    engine = get_meta_engine()
    tables = set(Base.metadata.tables.keys())
    for name in (
        "auth_roles",
        "auth_org_nodes",
        "auth_users",
        "auth_user_roles",
        "auth_resource_grants",
        "auth_dimension_types",
    ):
        assert name in tables
    assert engine is not None


def test_role_create_list_roundtrip(client, auth_headers):
    """T-AUTH-R01: POST 创建角色 roundtrip。"""
    payload = {"code": "analyst", "name": "Analyst", "description": "read only"}
    created = client.post("/api/v1/roles", json=payload, headers=auth_headers)
    assert created.status_code == 201
    body = created.json()
    assert body["code"] == "analyst"
    assert body["name"] == "Analyst"

    listed = client.get("/api/v1/roles", headers=auth_headers)
    assert listed.status_code == 200
    ids = [item["id"] for item in listed.json()["items"]]
    assert body["id"] in ids


def test_role_duplicate_code_conflict(client, auth_headers):
    """T-AUTH-R02: 重复 code → 409 ROLE_CODE_CONFLICT。"""
    payload = {"code": "viewer", "name": "Viewer"}
    assert client.post("/api/v1/roles", json=payload, headers=auth_headers).status_code == 201
    dup = client.post("/api/v1/roles", json=payload, headers=auth_headers)
    assert dup.status_code == 409
    assert dup.json()["code"] == "ROLE_CODE_CONFLICT"


def test_role_invalid_code_422(client, auth_headers):
    """T-AUTH-R03: 非法 code → 422。"""
    resp = client.post("/api/v1/roles", json={"code": "BAD", "name": "x"}, headers=auth_headers)
    assert resp.status_code == 422


def test_role_update_name(client, auth_headers):
    """T-AUTH-R04: PUT 更新 name；code 不变。"""
    created = client.post(
        "/api/v1/roles", json={"code": "editor", "name": "Editor"}, headers=auth_headers
    ).json()
    updated = client.put(
        f"/api/v1/roles/{created['id']}",
        json={"name": "Content Editor", "description": "d"},
        headers=auth_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Content Editor"
    assert updated.json()["code"] == "editor"


def test_role_delete_idle(client, auth_headers):
    """T-AUTH-R05: DELETE 空闲角色 → 204；GET → 404。"""
    created = client.post(
        "/api/v1/roles", json={"code": "temp_role", "name": "Temp"}, headers=auth_headers
    ).json()
    deleted = client.delete(f"/api/v1/roles/{created['id']}", headers=auth_headers)
    assert deleted.status_code == 204
    assert client.get(f"/api/v1/roles/{created['id']}", headers=auth_headers).status_code == 404


def test_openapi_contains_roles_paths(client):
    """T-AUTH-R06: OpenAPI 含 /api/v1/roles CRUD。"""
    spec = client.get("/openapi.json").json()
    paths = spec["paths"]
    assert "/api/v1/roles" in paths
    assert "/api/v1/roles/{role_id}" in paths


def test_org_root_and_child_paths(client, auth_headers):
    """T-AUTH-O01: 根 level=0 path=/{id}；子 level=1。"""
    root = client.post("/api/v1/orgs", json={"name": "HQ"}, headers=auth_headers).json()
    assert root["level"] == 0
    assert root["path"] == f"/{root['id']}"

    child = client.post(
        "/api/v1/orgs",
        json={"name": "Branch", "parent_id": root["id"]},
        headers=auth_headers,
    ).json()
    assert child["level"] == 1
    assert child["path"].startswith(root["path"] + "/")


def test_org_invalid_parent_404(client, auth_headers):
    """T-AUTH-O02: 非法 parent_id → 404 ORG_PARENT_NOT_FOUND。"""
    import uuid

    resp = client.post(
        "/api/v1/orgs",
        json={"name": "x", "parent_id": str(uuid.uuid4())},
        headers=auth_headers,
    )
    assert resp.status_code == 404
    assert resp.json()["code"] == "ORG_PARENT_NOT_FOUND"


def test_org_move_cycle_409(client, auth_headers):
    """T-AUTH-O03: 移节点成环 → 409 ORG_CYCLE。"""
    root = client.post("/api/v1/orgs", json={"name": "R"}, headers=auth_headers).json()
    child = client.post(
        "/api/v1/orgs", json={"name": "C", "parent_id": root["id"]}, headers=auth_headers
    ).json()
    resp = client.put(
        f"/api/v1/orgs/{root['id']}",
        json={"parent_id": child["id"]},
        headers=auth_headers,
    )
    assert resp.status_code == 409
    assert resp.json()["code"] == "ORG_CYCLE"


def test_org_delete_with_children_409(client, auth_headers):
    """T-AUTH-O04: 删除有子节点 → 409 ORG_HAS_CHILDREN。"""
    root = client.post("/api/v1/orgs", json={"name": "R"}, headers=auth_headers).json()
    client.post("/api/v1/orgs", json={"name": "C", "parent_id": root["id"]}, headers=auth_headers)
    resp = client.delete(f"/api/v1/orgs/{root['id']}", headers=auth_headers)
    assert resp.status_code == 409
    assert resp.json()["code"] == "ORG_HAS_CHILDREN"


def test_org_move_updates_subtree_paths(client, auth_headers):
    """T-AUTH-O05: 移中间节点后子孙 path 前缀正确。"""
    a = client.post("/api/v1/orgs", json={"name": "A"}, headers=auth_headers).json()
    b = client.post("/api/v1/orgs", json={"name": "B", "parent_id": a["id"]}, headers=auth_headers).json()
    c = client.post("/api/v1/orgs", json={"name": "C", "parent_id": b["id"]}, headers=auth_headers).json()
    d = client.post("/api/v1/orgs", json={"name": "D"}, headers=auth_headers).json()
    client.put(f"/api/v1/orgs/{b['id']}", json={"parent_id": d["id"]}, headers=auth_headers)
    items = {item["id"]: item for item in client.get("/api/v1/orgs", headers=auth_headers).json()["items"]}
    assert items[c["id"]]["path"].startswith(items[b["id"]]["path"] + "/")


def test_org_list_fields(client, auth_headers):
    """T-AUTH-O06: GET 列表含 parent_id/path/level。"""
    client.post("/api/v1/orgs", json={"name": "L"}, headers=auth_headers)
    item = client.get("/api/v1/orgs", headers=auth_headers).json()["items"][0]
    assert {"parent_id", "path", "level", "name", "id"} <= set(item.keys())


def test_user_bind_roles_roundtrip(client, auth_headers):
    """T-AUTH-U01: 创建用户 + 绑定角色。"""
    role = client.post("/api/v1/roles", json={"code": "bind_r1", "name": "R1"}, headers=auth_headers).json()
    user = client.post("/api/v1/users", json={"username": "u_bind_1"}, headers=auth_headers).json()
    bind = client.post(f"/api/v1/users/{user['id']}/roles/{role['id']}", headers=auth_headers)
    assert bind.status_code == 200
    roles = client.get(f"/api/v1/users/{user['id']}/roles", headers=auth_headers).json()["items"]
    assert any(r["code"] == "bind_r1" for r in roles)


def test_user_bind_idempotent(client, auth_headers):
    """T-AUTH-U02: 重复 POST bind → 200；仅一行。"""
    role = client.post("/api/v1/roles", json={"code": "bind_r2", "name": "R2"}, headers=auth_headers).json()
    user = client.post("/api/v1/users", json={"username": "u_bind_2"}, headers=auth_headers).json()
    url = f"/api/v1/users/{user['id']}/roles/{role['id']}"
    assert client.post(url, headers=auth_headers).status_code == 200
    assert client.post(url, headers=auth_headers).status_code == 200
    assert len(client.get(f"/api/v1/users/{user['id']}/roles", headers=auth_headers).json()["items"]) == 1


def test_user_bind_invalid_role_404(client, auth_headers):
    """T-AUTH-U03: 非法 roleId → 404。"""
    import uuid

    user = client.post("/api/v1/users", json={"username": "u_bind_3"}, headers=auth_headers).json()
    resp = client.post(f"/api/v1/users/{user['id']}/roles/{uuid.uuid4()}", headers=auth_headers)
    assert resp.status_code == 404


def test_user_unbind_not_found_404(client, auth_headers):
    """T-AUTH-U04: 解绑不存在 → 404 BINDING_NOT_FOUND。"""
    import uuid

    user = client.post("/api/v1/users", json={"username": "u_bind_4"}, headers=auth_headers).json()
    resp = client.delete(f"/api/v1/users/{user['id']}/roles/{uuid.uuid4()}", headers=auth_headers)
    assert resp.status_code == 404
    assert resp.json()["code"] == "BINDING_NOT_FOUND"


def test_user_replace_roles(client, auth_headers):
    """T-AUTH-U05: PUT 全量替换 role_ids。"""
    r1 = client.post("/api/v1/roles", json={"code": "rep_r1", "name": "A"}, headers=auth_headers).json()
    r2 = client.post("/api/v1/roles", json={"code": "rep_r2", "name": "B"}, headers=auth_headers).json()
    user = client.post("/api/v1/users", json={"username": "u_rep"}, headers=auth_headers).json()
    client.post(f"/api/v1/users/{user['id']}/roles/{r1['id']}", headers=auth_headers)
    client.put(
        f"/api/v1/users/{user['id']}/roles",
        json={"role_ids": [r2["id"]]},
        headers=auth_headers,
    )
    codes = [r["code"] for r in client.get(f"/api/v1/users/{user['id']}/roles", headers=auth_headers).json()["items"]]
    assert codes == ["rep_r2"]


def test_me_roles_from_db_dev_user(client, auth_headers):
    """T-AUTH-U06: dev 用户绑定 viewer 后 GET /me roles 含 viewer。"""
    from sqlalchemy import delete, select

    from app.auth.models import AuthUser, AuthUserRole, get_meta_session

    role = client.post("/api/v1/roles", json={"code": "viewer", "name": "Viewer"}, headers=auth_headers).json()
    user = client.post("/api/v1/users", json={"username": "dev"}, headers=auth_headers).json()
    client.post(f"/api/v1/users/{user['id']}/roles/{role['id']}", headers=auth_headers)
    me = client.get("/api/v1/me", headers=auth_headers)
    assert me.status_code == 200
    assert "viewer" in me.json()["roles"]
    session = get_meta_session()
    try:
        dev = session.scalar(select(AuthUser).where(AuthUser.username == "dev"))
        if dev is not None:
            session.execute(delete(AuthUserRole).where(AuthUserRole.user_id == dev.id))
            session.execute(delete(AuthUser).where(AuthUser.id == dev.id))
            session.commit()
    finally:
        session.close()


import uuid as uuid_mod

from app.auth.models import get_meta_session
from app.auth.resources.service import check_resource_access


def test_resource_grant_create_list(client, auth_headers):
    """T-AUTH-G01: POST 授权 datasource。"""
    role = client.post("/api/v1/roles", json={"code": "grant_r1", "name": "G"}, headers=auth_headers).json()
    rid = str(uuid_mod.uuid4())
    created = client.post(
        "/api/v1/resource-grants",
        json={"role_id": role["id"], "resource_type": "datasource", "resource_id": rid},
        headers=auth_headers,
    )
    assert created.status_code == 201
    items = client.get("/api/v1/resource-grants", headers=auth_headers).json()["items"]
    assert any(i["resource_id"] == rid for i in items)


def test_resource_grant_duplicate_409(client, auth_headers):
    """T-AUTH-G02: 重复授权 → 409 GRANT_ALREADY_EXISTS。"""
    role = client.post("/api/v1/roles", json={"code": "grant_r2", "name": "G"}, headers=auth_headers).json()
    rid = str(uuid_mod.uuid4())
    payload = {"role_id": role["id"], "resource_type": "datasource", "resource_id": rid}
    assert client.post("/api/v1/resource-grants", json=payload, headers=auth_headers).status_code == 201
    dup = client.post("/api/v1/resource-grants", json=payload, headers=auth_headers)
    assert dup.status_code == 409
    assert dup.json()["code"] == "GRANT_ALREADY_EXISTS"


def test_resource_grant_invalid_role_404(client, auth_headers):
    """T-AUTH-G03: 非法 role_id → 404。"""
    resp = client.post(
        "/api/v1/resource-grants",
        json={"role_id": str(uuid_mod.uuid4()), "resource_type": "dashboard", "resource_id": str(uuid_mod.uuid4())},
        headers=auth_headers,
    )
    assert resp.status_code == 404


def test_check_resource_access_positive(client, auth_headers):
    """T-AUTH-G04: 授权角色 → check_resource_access True。"""
    role = client.post("/api/v1/roles", json={"code": "grant_r4", "name": "G"}, headers=auth_headers).json()
    rid = uuid_mod.uuid4()
    client.post(
        "/api/v1/resource-grants",
        json={"role_id": role["id"], "resource_type": "datasource", "resource_id": str(rid)},
        headers=auth_headers,
    )
    session = get_meta_session()
    try:
        assert check_resource_access(session, ["grant_r4"], "datasource", rid) is True
    finally:
        session.close()


def test_check_resource_access_negative(client, auth_headers):
    """T-AUTH-G05: 未授权角色 → False。"""
    session = get_meta_session()
    try:
        assert check_resource_access(session, ["unknown"], "datasource", uuid_mod.uuid4()) is False
    finally:
        session.close()


def test_dimension_type_create(client, auth_headers):
    """T-AUTH-D01: POST 注册维度类型。"""
    resp = client.post(
        "/api/v1/rls/dimensions",
        json={"code": "region", "name": "Region", "value_type": "string"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["code"] == "region"
    assert body["value_type"] == "string"


def test_dimension_type_duplicate_409(client, auth_headers):
    """T-AUTH-D02: 重复 code → 409。"""
    payload = {"code": "dup_dim", "name": "D", "value_type": "number"}
    assert client.post("/api/v1/rls/dimensions", json=payload, headers=auth_headers).status_code == 201
    assert client.post("/api/v1/rls/dimensions", json=payload, headers=auth_headers).status_code == 409


def test_dimension_type_org_ref_sets_flag(client, auth_headers):
    """T-AUTH-D03: value_type=org_ref → org_dimension=true。"""
    client.post("/api/v1/orgs", json={"name": "OrgRoot"}, headers=auth_headers)
    resp = client.post(
        "/api/v1/rls/dimensions",
        json={"code": "organization", "name": "Organization", "value_type": "org_ref"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["org_dimension"] is True


def test_dimension_type_update_name(client, auth_headers):
    """T-AUTH-D04: PUT 更新 name。"""
    created = client.post(
        "/api/v1/rls/dimensions",
        json={"code": "dim_upd", "name": "Old", "value_type": "boolean"},
        headers=auth_headers,
    ).json()
    updated = client.put(
        f"/api/v1/rls/dimensions/{created['id']}",
        json={"name": "New"},
        headers=auth_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "New"


def test_dimension_type_delete_idle(client, auth_headers):
    """T-AUTH-D05: DELETE 空闲类型 → 204。"""
    created = client.post(
        "/api/v1/rls/dimensions",
        json={"code": "dim_del", "name": "Del", "value_type": "string"},
        headers=auth_headers,
    ).json()
    assert client.delete(f"/api/v1/rls/dimensions/{created['id']}", headers=auth_headers).status_code == 204


from app.auth.resources.service import (
    VisibilityError,
    ensure_resource_visible,
    list_visible_resource_ids,
)


def test_grant_revoke_visibility(client, auth_headers):
    """T-AUTH-G06: 撤权后 ensure_resource_visible 抛 403 RESOURCE_FORBIDDEN。"""
    role = client.post("/api/v1/roles", json={"code": "vis_r1", "name": "V"}, headers=auth_headers).json()
    rid = uuid_mod.uuid4()
    grant = client.post(
        "/api/v1/resource-grants",
        json={"role_id": role["id"], "resource_type": "datasource", "resource_id": str(rid)},
        headers=auth_headers,
    ).json()
    session = get_meta_session()
    try:
        ensure_resource_visible(session, ["vis_r1"], "datasource", rid)
        client.delete(f"/api/v1/resource-grants/{grant['id']}", headers=auth_headers)
        with pytest.raises(VisibilityError) as exc:
            ensure_resource_visible(session, ["vis_r1"], "datasource", rid)
        assert exc.value.code == "RESOURCE_FORBIDDEN"
        assert exc.value.status == 403
    finally:
        session.close()


def test_horizontal_privilege_denied(client, auth_headers):
    """T-AUTH-G07: role_a 授权、role_b 未授权 → check False。"""
    role_a = client.post("/api/v1/roles", json={"code": "role_a", "name": "A"}, headers=auth_headers).json()
    client.post("/api/v1/roles", json={"code": "role_b", "name": "B"}, headers=auth_headers)
    rid = uuid_mod.uuid4()
    client.post(
        "/api/v1/resource-grants",
        json={"role_id": role_a["id"], "resource_type": "dashboard", "resource_id": str(rid)},
        headers=auth_headers,
    )
    session = get_meta_session()
    try:
        assert check_resource_access(session, ["role_b"], "dashboard", rid) is False
    finally:
        session.close()


def test_list_visible_resource_ids(client, auth_headers):
    """T-AUTH-G08: 两角色各一资源 → 合并 role_codes 返回 2 个 id。"""
    r1 = client.post("/api/v1/roles", json={"code": "lv_r1", "name": "1"}, headers=auth_headers).json()
    r2 = client.post("/api/v1/roles", json={"code": "lv_r2", "name": "2"}, headers=auth_headers).json()
    id1, id2 = uuid_mod.uuid4(), uuid_mod.uuid4()
    client.post(
        "/api/v1/resource-grants",
        json={"role_id": r1["id"], "resource_type": "report", "resource_id": str(id1)},
        headers=auth_headers,
    )
    client.post(
        "/api/v1/resource-grants",
        json={"role_id": r2["id"], "resource_type": "report", "resource_id": str(id2)},
        headers=auth_headers,
    )
    session = get_meta_session()
    try:
        visible = list_visible_resource_ids(session, ["lv_r1", "lv_r2"], "report")
        assert set(visible) == {id1, id2}
    finally:
        session.close()


def test_invalid_resource_type_422():
    """T-AUTH-G09: 非法 resource_type → 422 INVALID_RESOURCE_TYPE。"""
    session = get_meta_session()
    try:
        with pytest.raises(VisibilityError) as exc:
            ensure_resource_visible(session, ["any"], "widget", uuid_mod.uuid4())
        assert exc.value.code == "INVALID_RESOURCE_TYPE"
        assert exc.value.status == 422
    finally:
        session.close()


def test_empty_roles_forbidden():
    """T-AUTH-G10: role_codes=[] → ensure 403。"""
    session = get_meta_session()
    try:
        with pytest.raises(VisibilityError) as exc:
            ensure_resource_visible(session, [], "datasource", uuid_mod.uuid4())
        assert exc.value.code == "RESOURCE_FORBIDDEN"
        assert exc.value.status == 403
    finally:
        session.close()


from app.auth.org import service as org_service
from app.auth.users import service as users_service


def test_user_org_bind_roundtrip(client, auth_headers):
    """T-AUTH-OU01: 建 org + user → assign → get_user_org 一致。"""
    org = client.post("/api/v1/orgs", json={"name": "Dept"}, headers=auth_headers).json()
    user = client.post("/api/v1/users", json={"username": "ou_user"}, headers=auth_headers).json()
    session = get_meta_session()
    try:
        users_service.assign_user_org(session, uuid_mod.UUID(user["id"]), uuid_mod.UUID(org["id"]))
        node = users_service.get_user_org(session, uuid_mod.UUID(user["id"]))
        assert node is not None
        assert str(node.id) == org["id"]
    finally:
        session.close()


def test_user_org_idempotent(client, auth_headers):
    """T-AUTH-OU02: 重复 assign 同 org 仍成功。"""
    org = client.post("/api/v1/orgs", json={"name": "Dept2"}, headers=auth_headers).json()
    user = client.post("/api/v1/users", json={"username": "ou_idem"}, headers=auth_headers).json()
    session = get_meta_session()
    try:
        uid, oid = uuid_mod.UUID(user["id"]), uuid_mod.UUID(org["id"])
        users_service.assign_user_org(session, uid, oid)
        users_service.assign_user_org(session, uid, oid)
        assert users_service.get_user_org(session, uid).id == oid
    finally:
        session.close()


def test_user_org_invalid_org_404(client, auth_headers):
    """T-AUTH-OU03: assign 随机 org UUID → 404 ORG_NOT_FOUND。"""
    user = client.post("/api/v1/users", json={"username": "ou_bad"}, headers=auth_headers).json()
    session = get_meta_session()
    try:
        with pytest.raises(users_service.UserError) as exc:
            users_service.assign_user_org(session, uuid_mod.UUID(user["id"]), uuid_mod.uuid4())
        assert exc.value.code == "ORG_NOT_FOUND"
        assert exc.value.status == 404
    finally:
        session.close()


def test_user_org_clear(client, auth_headers):
    """T-AUTH-OU04: clear 后 get → None。"""
    org = client.post("/api/v1/orgs", json={"name": "Clr"}, headers=auth_headers).json()
    user = client.post("/api/v1/users", json={"username": "ou_clr"}, headers=auth_headers).json()
    session = get_meta_session()
    try:
        uid, oid = uuid_mod.UUID(user["id"]), uuid_mod.UUID(org["id"])
        users_service.assign_user_org(session, uid, oid)
        users_service.clear_user_org(session, uid)
        assert users_service.get_user_org(session, uid) is None
    finally:
        session.close()


def test_delete_org_with_users_409(client, auth_headers):
    """T-AUTH-O07: 用户绑定叶子 org → delete → 409 ORG_HAS_USERS。"""
    org = client.post("/api/v1/orgs", json={"name": "Leaf"}, headers=auth_headers).json()
    user = client.post("/api/v1/users", json={"username": "leaf_u"}, headers=auth_headers).json()
    session = get_meta_session()
    try:
        users_service.assign_user_org(session, uuid_mod.UUID(user["id"]), uuid_mod.UUID(org["id"]))
        with pytest.raises(org_service.OrgError) as exc:
            org_service.delete_org_node(session, uuid_mod.UUID(org["id"]))
        assert exc.value.code == "ORG_HAS_USERS"
        assert exc.value.status == 409
    finally:
        session.close()


def test_delete_idle_leaf_org_204(client, auth_headers):
    """T-AUTH-O08: 空闲叶子 → delete 成功。"""
    org = client.post("/api/v1/orgs", json={"name": "IdleLeaf"}, headers=auth_headers).json()
    session = get_meta_session()
    try:
        org_service.delete_org_node(session, uuid_mod.UUID(org["id"]))
    finally:
        session.close()
