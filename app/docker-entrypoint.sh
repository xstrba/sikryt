#!/bin/sh
set -e

echo "Initializing PostgreSQL database..."
# Fix permissions on volume mapping just in case
chown -R postgres:postgres /var/lib/postgresql/data
chown -R postgres:postgres /run/postgresql

# Initialize DB if it doesn't exist
if [ ! -s "/var/lib/postgresql/data/PG_VERSION" ]; then
    su-exec postgres initdb -D /var/lib/postgresql/data
    
    # Configure authentication
    echo "host all all 127.0.0.1/32 trust" >> /var/lib/postgresql/data/pg_hba.conf
    echo "host all all ::1/128 trust" >> /var/lib/postgresql/data/pg_hba.conf
fi

echo "Starting PostgreSQL..."
su-exec postgres pg_ctl -D /var/lib/postgresql/data \
    -l /var/lib/postgresql/data/logfile start

# Wait for PostgreSQL to start
until su-exec postgres pg_isready -h 127.0.0.1; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 1
done

echo "Setting up database and user..."
# Create user and database (ignoring errors if they already exist)
su-exec postgres psql -c "CREATE USER sikryt WITH PASSWORD 'sikryt_password';" 2>/dev/null || true
su-exec postgres psql -c "CREATE DATABASE sikryt_dev OWNER sikryt;" 2>/dev/null || true
su-exec postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sikryt_dev TO sikryt;" 2>/dev/null || true

echo "Applying database migrations..."
# Plain-psql migration runner (see migrate.sh); also brings databases created by
# `prisma db push` in releases before 1.2.0 up to the current schema.
/app/migrate.sh /app/prisma/migrations

if [ -n "$AUTH_SECRET_FILE" ] && [ -f "$AUTH_SECRET_FILE" ]; then
    echo "Reading AUTH_SECRET from file..."
    export AUTH_SECRET=$(cat "$AUTH_SECRET_FILE")
    echo "AUTH_SECRET=\"$AUTH_SECRET\"" >> /app/.env
fi

echo "Starting Next.js application..."
exec node /app/server.js
