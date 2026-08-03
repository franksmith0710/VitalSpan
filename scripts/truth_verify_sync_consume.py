"""L1 truth verify: sync consume chain against live API + analytics PG."""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND_ENV = ROOT / "backend" / ".env"
if BACKEND_ENV.is_file():
    for line in BACKEND_ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())

API = os.environ.get("TRUTH_VERIFY_API", "http://127.0.0.1:8000")
ADMIN_PASSWORD = os.environ.get("VITALSPAN_DEV_ADMIN_PASSWORD", "changeme")


def http(method: str, path: str, body: dict | None = None, token: str | None = None) -> tuple[int, dict | list | str]:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode()
            try:
                return resp.status, json.loads(raw)
            except json.JSONDecodeError:
                return resp.status, raw
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        try:
            return exc.code, json.loads(raw)
        except json.JSONDecodeError:
            return exc.code, raw


def pg_probe() -> dict:
    from sqlalchemy import create_engine, inspect, text

    engine = create_engine("postgresql+psycopg://vitalspan:vitalspan@127.0.0.1:5433/analytics")
    insp = inspect(engine)
    tables = insp.get_table_names()
    out: dict = {"tables": tables, "orders_clean_exists": "orders_clean" in tables}
    if "orders_clean" not in tables:
        return out
    with engine.connect() as conn:
        out["count"] = conn.execute(text("SELECT COUNT(*) FROM orders_clean")).scalar()
        sample = conn.execute(text("SELECT * FROM orders_clean LIMIT 1")).mappings().first()
        out["columns"] = list(sample.keys()) if sample else []
        out["sample_row"] = dict(sample) if sample else None
        quoted = conn.execute(text('SELECT COUNT(*) FROM "orders_clean"')).scalar()
        out["quoted_count"] = quoted
    return out


def main() -> int:
    print("=== PG direct probe ===")
    pg = pg_probe()
    print(json.dumps(pg, ensure_ascii=False, default=str, indent=2))
    if not pg.get("orders_clean_exists"):
        print("FAIL: orders_clean missing")
        return 1

    print("\n=== Login ===")
    code, login = http("POST", "/api/v1/auth/login", {"username": "admin", "password": ADMIN_PASSWORD})
    if code != 200 or not isinstance(login, dict):
        print("FAIL login", code, login)
        return 1
    token = login.get("accessToken") or login.get("access_token")
    if not token:
        print("FAIL login token missing", login)
        return 1
    print("OK login")

    print("\n=== Datasources ===")
    code, listed = http("GET", "/api/v1/datasources", token=token)
    if code != 200 or not isinstance(listed, dict):
        print("FAIL list datasources", code, listed)
        return 1
    items = listed.get("items", [])
    analytics = next(
        (
            d
            for d in items
            if d.get("type") in ("postgresql", "postgres")
            and int(d.get("port", 0)) == 5433
            and d.get("database") == "analytics"
        ),
        None,
    )
    if analytics is None:
        code, created = http(
            "POST",
            "/api/v1/datasources",
            {
                "name": "truth-audit-analytics",
                "code": "truth-audit-analytics",
                "type": "postgresql",
                "host": "127.0.0.1",
                "port": 5433,
                "database": "analytics",
                "username": "vitalspan",
                "password": "vitalspan",
            },
            token=token,
        )
        if code not in (200, 201) or not isinstance(created, dict):
            print("FAIL create datasource", code, created)
            return 1
        analytics = created
        print("Created datasource", analytics.get("id"))
    else:
        print("Using datasource", analytics.get("id"), analytics.get("name"))
    ds_id = analytics["id"]

    sql_variants = [
        "SELECT * FROM orders_clean",
        'SELECT * FROM "orders_clean"',
        "SELECT COUNT(*) AS cnt FROM orders_clean",
    ]
    ok = 0
    print("\n=== query/execute ===")
    for sql in sql_variants:
        code, body = http(
            "POST",
            "/api/v1/query/execute",
            {
                "dataSourceId": ds_id,
                "mode": "sql",
                "sql": sql,
                "limit": 100,
                "rls": {"enabled": False},
            },
            token=token,
        )
        if code != 200 or not isinstance(body, dict):
            print(f"FAIL [{sql}] status={code} body={str(body)[:300]}")
            continue
        cols = body.get("columns", [])
        col_names = [c.get("name") if isinstance(c, dict) else c for c in cols]
        rows = body.get("rows", [])
        print(f"OK [{sql}] columns={col_names} rows={len(rows)}")
        if sql.startswith("SELECT COUNT"):
            print("  count value:", rows[0] if rows else None)
        elif rows and pg.get("count") is not None:
            if len(rows) != pg["count"]:
                print(f"  WARN row count mismatch: api={len(rows)} pg={pg['count']}")
        ok += 1

    code, tables = http("GET", f"/api/v1/datasources/{ds_id}/tables?schema=public", token=token)
    table_names = [t.get("name") for t in tables.get("items", [])] if isinstance(tables, dict) else []
    print("\nschema browser tables:", table_names)

    expected_count = pg.get("count")
    summary = {
        "pg_count": expected_count,
        "pg_columns": pg.get("columns"),
        "sql_variants_ok": ok,
        "sql_variants_total": len(sql_variants),
        "orders_clean_in_schema_browser": "orders_clean" in table_names,
    }
    print("\n=== SUMMARY ===")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if ok == len(sql_variants) else 1


if __name__ == "__main__":
    sys.path.insert(0, str(ROOT / "backend"))
    raise SystemExit(main())
