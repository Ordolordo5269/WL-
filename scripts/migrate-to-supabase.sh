#!/bin/bash
# Migración PostgreSQL (Docker) -> Supabase
# Ejecutar desde la raíz del proyecto: ./scripts/migrate-to-supabase.sh

set -e

# ========== CONFIGURA ESTO ==========
SUPABASE_CONNECTION_STRING="postgresql://postgres.<PROJECT-REF>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require"
# ====================================

DUMP_FILE="worldlore.dump"

echo "=== 1) Creando dump desde Docker Postgres ==="
docker exec -t wl_postgres pg_dump -Fc -U worldlore -d worldlore -f /tmp/worldlore.dump
docker cp wl_postgres:/tmp/worldlore.dump "./$DUMP_FILE"

echo ""
echo "=== 2) Restaurando en Supabase ==="
pg_restore --clean --if-exists --no-owner --no-privileges -d "$SUPABASE_CONNECTION_STRING" "$DUMP_FILE"

echo ""
echo "=== Migración completada ==="
echo "Verifica en Supabase SQL Editor: SELECT count(*) FROM \"Entity\";"
