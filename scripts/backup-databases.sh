#!/usr/bin/env bash
# VitalSpan docker-compose 全量逻辑备份
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="$REPO_ROOT/data/backups/$TIMESTAMP"
mkdir -p "$OUT_DIR"

GIT_COMMIT=""
if git rev-parse HEAD >/dev/null 2>&1; then
  GIT_COMMIT="$(git rev-parse HEAD)"
fi

MANIFEST_FILES=()
WARNINGS=()

compose_container() {
  docker compose ps -q "$1" 2>/dev/null | head -n1
}

assert_healthy() {
  local svc="$1"
  local cid
  cid="$(compose_container "$svc" || true)"
  if [[ -z "$cid" ]]; then
    echo "服务 '$svc' 未运行。请先执行: docker compose up -d" >&2
    exit 1
  fi
  local health
  health="$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" 2>/dev/null || echo none)"
  if [[ "$health" != "none" && "$health" != "healthy" ]]; then
    echo "服务 '$svc' 状态为 '$health'，非 healthy" >&2
    exit 1
  fi
}

add_file() {
  local path="$1" svc="$2"
  if [[ -f "$path" || -d "$path" ]]; then
    MANIFEST_FILES+=("{\"service\":\"$svc\",\"path\":\"$(basename "$path")\"}")
  fi
}

echo "备份目录: $OUT_DIR"

assert_healthy postgres
docker exec "$(compose_container postgres)" pg_dump -U vitalspan -Fc vitalspan > "$OUT_DIR/meta-postgres.dump"
add_file "$OUT_DIR/meta-postgres.dump" postgres
echo "OK meta-postgres.dump"

assert_healthy analytics-postgres
docker exec "$(compose_container analytics-postgres)" pg_dump -U vitalspan -Fc analytics > "$OUT_DIR/analytics-postgres.dump"
add_file "$OUT_DIR/analytics-postgres.dump" analytics-postgres
echo "OK analytics-postgres.dump"

assert_healthy meta-mysql
docker exec "$(compose_container meta-mysql)" mysqldump -uvitalspan -pvitalspan --single-transaction vitalspan > "$OUT_DIR/meta-mysql.sql"
add_file "$OUT_DIR/meta-mysql.sql" meta-mysql
echo "OK meta-mysql.sql"

assert_healthy sample-mysql
docker exec "$(compose_container sample-mysql)" mysqldump -usample -psample --single-transaction sample_db > "$OUT_DIR/sample-mysql.sql"
add_file "$OUT_DIR/sample-mysql.sql" sample-mysql
echo "OK sample-mysql.sql"

assert_healthy sample-mariadb
docker exec "$(compose_container sample-mariadb)" mysqldump -usample -psample --single-transaction sample_db > "$OUT_DIR/sample-mariadb.sql"
add_file "$OUT_DIR/sample-mariadb.sql" sample-mariadb
echo "OK sample-mariadb.sql"

assert_healthy sample-timescaledb
docker exec "$(compose_container sample-timescaledb)" pg_dump -U vitalspan -Fc ops_tsdb > "$OUT_DIR/sample-timescaledb.dump"
add_file "$OUT_DIR/sample-timescaledb.dump" sample-timescaledb
echo "OK sample-timescaledb.dump"

CH_DIR="$OUT_DIR/sample-clickhouse"
mkdir -p "$CH_DIR"
if assert_healthy sample-clickhouse 2>/dev/null; then
  CH="$(compose_container sample-clickhouse)"
  if TABLES="$(docker exec "$CH" clickhouse-client --query 'SHOW TABLES' 2>/dev/null)"; then
    while IFS= read -r t; do
      [[ -z "$t" ]] && continue
      docker exec "$CH" clickhouse-client --query "SELECT * FROM $t FORMAT Native" > "$CH_DIR/${t}.native" || true
    done <<< "$TABLES"
    add_file "$CH_DIR" sample-clickhouse
    echo "OK sample-clickhouse/"
  fi
else
  WARNINGS+=("sample-clickhouse skipped")
  echo "WARN: 跳过 sample-clickhouse" >&2
fi

SQLITE="$REPO_ROOT/data/vitalspan-meta.db"
if [[ -f "$SQLITE" ]]; then
  cp "$SQLITE" "$OUT_DIR/vitalspan-meta.db"
  add_file "$OUT_DIR/vitalspan-meta.db" sqlite-local
  echo "OK vitalspan-meta.db"
fi

cat > "$OUT_DIR/keys-checklist.txt" <<'EOF'
# 密钥清单（请勿将明文密钥写入备份目录）
SECRET_KEY
CREDENTIAL_FERNET_KEY
CREDENTIAL_FERNET_KEY_PREVIOUS
CREDENTIAL_SM4_KEY
CREDENTIAL_CRYPTO_PROVIDER
PASSWORD_HASH_ALGORITHM
EOF

FILES_JSON="$(printf '%s\n' "${MANIFEST_FILES[@]}" | paste -sd, -)"
WARN_JSON="$(printf '"%s",' "${WARNINGS[@]}" 2>/dev/null | sed 's/,$//' || true)"
cat > "$OUT_DIR/manifest.json" <<EOF
{"timestamp":"$TIMESTAMP","gitCommit":"$GIT_COMMIT","files":[$FILES_JSON],"warnings":[$WARN_JSON]}
EOF

echo ""
echo "备份完成: $OUT_DIR"
