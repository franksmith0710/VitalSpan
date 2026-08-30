# RoAPI optional sidecar — demo table for local PoC (CONN-028).
# Start: docker compose --profile roapi up -d roapi
# Schema: GET http://127.0.0.1:8086/api/schema
# SQL:    POST http://127.0.0.1:8086/api/sql  body: SELECT * FROM demo_orders LIMIT 5
