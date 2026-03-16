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
su-exec postgres psql -c "CREATE USER sikryt WITH PASSWORD 'sikryt_password';" || true
su-exec postgres psql -c "CREATE DATABASE sikryt_dev OWNER sikryt;" || true
su-exec postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sikryt_dev TO sikryt;" || true

echo "Checking for nickname migration..."
# Check if nickname column exists in User table
COL_EXISTS=$(su-exec postgres psql -d sikryt_dev -tAc "SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='nickname';")
if [ "$COL_EXISTS" != "1" ]; then
    echo "Pre-migrating nickname column to avoid data loss errors..."
    su-exec postgres psql -d sikryt_dev -c "ALTER TABLE \"User\" ADD COLUMN \"nickname\" TEXT;"
    su-exec postgres psql -d sikryt_dev -c "UPDATE \"User\" SET \"nickname\" = \"email\" WHERE \"nickname\" IS NULL;"
fi

echo "Applying Prisma migrations..."
npx prisma db push --accept-data-loss

echo "Starting Prisma Studio on port 5555..."
npx prisma studio --port 5555 --hostname 0.0.0.0 &

echo "Migrating missing nicknames"
node seed-nicknames.js

if [ -n "$AUTH_SECRET_FILE" ] && [ -f "$AUTH_SECRET_FILE" ]; then
    echo "Reading AUTH_SECRET from file..."
    export AUTH_SECRET=$(cat "$AUTH_SECRET_FILE")
    echo "AUTH_SECRET=\"$AUTH_SECRET\"" >> /app/.env
fi

echo "Starting Next.js application..."
exec npm start
