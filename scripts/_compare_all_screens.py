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

def login(base):
    t = httpx.post(f"{base}/auth/login", json={"username": "admin", "password": pwd}, timeout=30).json()["accessToken"]
    return {"Authorization": f"Bearer {t}"}

def list_names(base):
    h = login(base)
    items = httpx.get(f"{base}/dashboards?surfaceKind=data-screen&limit=200", headers=h, timeout=60).json()
    items = items.get("data", items).get("items", items.get("items", []))
    return {i["name"]: i["id"] for i in items if not str(i["name"]).endswith("（编辑）")}

def dump(base, dash_id, limit=5):
    h = login(base)
    d = httpx.get(f"{base}/dashboards/{dash_id}", headers=h, timeout=30).json()
    ws = (d.get("data") or d)["layoutJson"]["widgets"]
    print(f"  widgets={len(ws)}")
    for w in ws[:limit]:
        print(f"  {w.get('title')} @ {w.get('x')},{w.get('y')} {w.get('width')}x{w.get('height')}")

local = list_names("http://127.0.0.1:8000/api/v1")
staging = list_names("http://192.168.10.22:8088/api/v1")

for name in sorted(set(local) & set(staging)):
    if local[name] == staging[name]:
        continue
    print(f"DIFF ID: {name}")
    print(" local", local[name]); dump("http://127.0.0.1:8000/api/v1", local[name])
    print(" staging", staging[name]); dump("http://192.168.10.22:8088/api/v1", staging[name])

print("\nONLY LOCAL:")
for n in sorted(set(local)-set(staging)):
    print(n, local[n])
print("\nONLY STAGING (first 15):")
for n in sorted(set(staging)-set(local))[:15]:
    print(n, staging[n])
