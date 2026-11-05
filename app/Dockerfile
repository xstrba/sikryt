FROM node:24-alpine AS builder
WORKDIR /app
# Dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx prisma generate
RUN npm run build
# Prisma ships WASM/edge engines for every database; on Node only runtime/library.js and the native
# libquery_engine-*.so.node are used, so drop the rest from the standalone bundle (~45 MB).
RUN cd .next/standalone/node_modules \
    && rm -f @prisma/client/runtime/query_engine_bg.* @prisma/client/runtime/query_compiler_bg.* \
        @prisma/client/runtime/wasm-* @prisma/client/runtime/edge* @prisma/client/runtime/react-native* \
        .prisma/client/query_engine_bg.* .prisma/client/wasm*

FROM node:24-alpine AS runner
WORKDIR /app

# Install postgres and pull in the latest Alpine security patches
RUN apk upgrade --no-cache \
    && apk add --no-cache postgresql postgresql-contrib su-exec

# musl security fix (1.2.6-r6) is only in edge so far. Same upstream 1.2.6, so it is ABI-compatible;
# the ~1.2.6 constraint keeps it from jumping to a new upstream release. Drop once the base image has it.
RUN apk add --no-cache --upgrade --repository=https://dl-cdn.alpinelinux.org/alpine/edge/main \
        'musl~1.2.6' 'musl-utils~1.2.6'

# The app runs its binaries directly, so package managers are not needed at runtime.
# Removing them also removes their bundled dependencies from the vulnerability surface.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
        /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
        /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*

# Setup postgres directories
RUN mkdir -p /run/postgresql && chown -R postgres:postgres /run/postgresql
RUN mkdir -p /var/lib/postgresql/data && chown -R postgres:postgres /var/lib/postgresql

# Next.js standalone server: server.js + only the node_modules files it actually uses
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# SQL migrations (applied by migrate.sh) and the admin seeding script
COPY --from=builder /app/prisma/migrations ./prisma/migrations
COPY --from=builder /app/seed-user.js ./seed-user.js
# seed-user.js require()s bcryptjs (CJS build); the app itself only uses its bundled ESM build
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY migrate.sh ./migrate.sh

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh /app/migrate.sh

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# The database URL for the app to connect to the local postgres instance
ENV DATABASE_URL="postgresql://sikryt:sikryt_password@127.0.0.1:5432/sikryt_dev?schema=public"
# In case it needs AUTH_SECRET, it can be provided at runtime
# ENV AUTH_SECRET=""

EXPOSE 3000

CMD ["docker-entrypoint.sh"]
