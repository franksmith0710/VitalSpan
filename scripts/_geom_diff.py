import json
import os
import sys
from pathlib import Path
import httpx

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))
os.chdir(BACKEND)
from app.core.config import get_settings

pwd = get_settings().vitalspan_dev_admin_password or "changeme"
LOCAL = "http://127.0.0.1:8000/api/v1"
STAGING = "http://192.168.10.22:8088/api/v1"

def login(base):
    t = httpx.post(f"{base}/auth/login", json={"username": "admin", "password": pwd}, timeout=30).json()["accessToken"]
    return {"Authorization": f"Bearer {t}"}

def list_items(base):
    h = login(base)
    body = httpx.get(f"{base}/dashboards?surfaceKind=data-screen&limit=200", headers=h, timeout=60).json()
    return (body.get("data") or body).get("items") or []

def geom_sig(widgets):
    return sorted(
        (w.get("type"), w.get("title"), w.get("x"), w.get("y"), w.get("width"), w.get("height"))
        for w in widgets
    )

local_items = {i["name"]: i for i in list_items(LOCAL) if not str(i["name"]).endswith("（编辑）")}
staging_items = {i["name"]: i for i in list_items(STAGING) if not str(i["name"]).endswith("（编辑）")}

same = 0
diff = 0
for name in sorted(set(local_items) & set(staging_items)):
    lh, sh = login(LOCAL), login(STAGING)
    ld = httpx.get(f"{LOCAL}/dashboards/{local_items[name]['id']}", headers=lh, timeout=30).json()
    sd = httpx.get(f"{STAGING}/dashboards/{staging_items[name]['id']}", headers=sh, timeout=30).json()
    lw = (ld.get("data") or ld)["layoutJson"]["widgets"]
    sw = (sd.get("data") or sd)["layoutJson"]["widgets"]
    if geom_sig(lw) == geom_sig(sw):
        same += 1
    else:
        diff += 1
        print(f"DIFF {name}")
        print(f"  local={local_items[name]['id']} staging={staging_items[name]['id']}")
        print(f"  local_widgets={len(lw)} staging_widgets={len(sw)}")

print(f"same={same} diff={diff} local_only={len(set(local_items)-set(staging_items))} staging_only={len(set(staging_items)-set(local_items))}")
