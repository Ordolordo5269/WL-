# Migración PostgreSQL (Docker) → Supabase

Comandos exactos para tu proyecto **worldlore**.

---

## 0) Prepara Supabase (2 minutos)

1. Crea el proyecto en [Supabase](https://supabase.com).
2. **Project → Settings → Database** → copia el **connection string**.
3. El connection string debe incluir `?sslmode=require`.
4. Ejemplo: `postgresql://postgres.<PROJECT-REF>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require`

---

## 1) Activar extensión pgcrypto (antes del restore)

Tu DB usa `pgcrypto` (gen_random_uuid). En Supabase SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

## 2) Dump desde tu Postgres en Docker

### Opción A: Desde el host (pg_dump contra localhost:5432)

```bash
pg_dump -Fc -h localhost -p 5432 -U worldlore -d worldlore -f worldlore.dump
```

Te pedirá la contraseña: `worldlore`

### Opción B: Dentro del contenedor

```bash
docker exec -t wl_postgres pg_dump -Fc -U worldlore -d worldlore -f /tmp/worldlore.dump

docker cp wl_postgres:/tmp/worldlore.dump ./worldlore.dump
```

---

## 3) Restaurar en Supabase

Reemplaza `<TU_CONNECTION_STRING>` por el connection string de Supabase:

```bash
pg_restore --clean --if-exists --no-owner --no-privileges -d "<TU_CONNECTION_STRING>" worldlore.dump
```

Ejemplo real (sustituye PROJECT-REF, PASSWORD y region):

```bash
pg_restore --clean --if-exists --no-owner --no-privileges -d "postgresql://postgres.abcdefgh:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require" worldlore.dump
```

---

## 4) Verificación

### En Supabase SQL Editor

```sql
SELECT count(*) FROM "Entity";
SELECT count(*) FROM "IndicatorValue";
```

### Desde tu backend

Pon en `backend/.env`:

```env
DATABASE_URL=postgresql://postgres.<PROJECT-REF>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

Prueba: `GET /db/health`

---

## 5) Prisma

Si Prisma migrate falla con el pooler (PgBouncer), usa **direct connection** para migraciones:

- Session pooler: runtime normal
- Direct connection: solo para `prisma migrate deploy`

---

## Resumen de tu configuración actual

| | Valor |
|---|---|
| Contenedor | `wl_postgres` |
| Usuario | `worldlore` |
| Contraseña | `worldlore` |
| Base de datos | `worldlore` |
| Puerto host | `5432` |
