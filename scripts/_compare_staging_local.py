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
dash_id = "00000000-0000-4000-8003-000000000002"

def fetch(base, token):
    h = {"Authorization": f"Bearer {token}"}
    t = httpx.post(f"{base}/auth/login", json={"username": "admin", "password": pwd}).json()["accessToken"]
    h = {"Authorization": f"Bearer {t}"}
    d = httpx.get(f"{base}/dashboards/{dash_id}", headers=h, timeout=30).json()
    return (d.get("data") or d)["layoutJson"]["widgets"][:3]

local = fetch("http://127.0.0.1:8000/api/v1", "")
staging = fetch("http://192.168.10.22:8088/api/v1", "")
print("LOCAL:")
for w in local:
    print(w.get("title"), w.get("x"), w.get("y"), w.get("width"), w.get("height"))
print("STAGING:")
for w in staging:
    print(w.get("title"), w.get("x"), w.get("y"), w.get("width"), w.get("height"))
