#!/bin/sh
# Applies Prisma SQL migrations (prisma/migrations/<name>/migration.sql) with plain psql, so the
# runtime image does not need the Prisma CLI and its engines.
#
# Applied migrations are recorded in Prisma's own "_prisma_migrations" table (same columns and
# checksum format), so `prisma migrate dev` / `prisma migrate status` keep working in development.
#
# Usage: migrate.sh [migrations-dir]   (connection taken from DATABASE_URL)
set -eu

MIGRATIONS_DIR="${1:-/app/prisma/migrations}"
# psql does not understand Prisma's "?schema=..." query parameter
DB_URL="${DATABASE_URL%%\?*}"
# Hide "already exists, skipping" notices from the idempotent baseline on upgraded databases
export PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=warning"

psql_q() {
    psql "$DB_URL" -v ON_ERROR_STOP=1 -qtAX "$@"
}

psql_q -c 'CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                  VARCHAR(36) PRIMARY KEY NOT NULL,
    "checksum"            VARCHAR(64) NOT NULL,
    "finished_at"         TIMESTAMPTZ,
    "migration_name"      VARCHAR(255) NOT NULL,
    "logs"                TEXT,
    "rolled_back_at"      TIMESTAMPTZ,
    "started_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);'

applied_count=0
for dir in $(ls -1 "$MIGRATIONS_DIR" | sort); do
    file="$MIGRATIONS_DIR/$dir/migration.sql"
    [ -f "$file" ] || continue

    checksum=$(sha256sum "$file" | cut -d' ' -f1)
    recorded=$(psql_q -c "SELECT checksum FROM \"_prisma_migrations\"
        WHERE migration_name = '$dir' AND finished_at IS NOT NULL AND rolled_back_at IS NULL
        LIMIT 1")

    if [ -n "$recorded" ]; then
        if [ "$recorded" != "$checksum" ]; then
            echo "[migrate] WARNING: $dir was modified after it was applied (checksum mismatch)"
        fi
        continue
    fi

    echo "[migrate] Applying $dir"
    # Migration and its bookkeeping row run in one transaction: either both happen or neither.
    {
        cat "$file"
        printf '\n;\nINSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, finished_at, applied_steps_count)\n'
        printf "VALUES (gen_random_uuid()::text, '%s', '%s', now(), now(), 1);\n" "$checksum" "$dir"
    } | psql "$DB_URL" -v ON_ERROR_STOP=1 -q --single-transaction -f -
    applied_count=$((applied_count + 1))
done

echo "[migrate] Database is up to date ($applied_count migration(s) applied)."
