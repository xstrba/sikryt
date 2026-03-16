FROM node:24-alpine AS builder
WORKDIR /app
# Dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app

# Install postgres
RUN apk add --no-cache postgresql postgresql-contrib su-exec

# Setup postgres directories
RUN mkdir -p /run/postgresql && chown -R postgres:postgres /run/postgresql
RUN mkdir -p /var/lib/postgresql/data && chown -R postgres:postgres /var/lib/postgresql

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/seed-user.js ./seed-user.js
COPY --from=builder /app/seed-nicknames.js ./seed-nicknames.js

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# The database URL for the app to connect to the local postgres instance
ENV DATABASE_URL="postgresql://sikryt:sikryt_password@127.0.0.1:5432/sikryt_dev?schema=public"
# In case it needs AUTH_SECRET, it can be provided at runtime
# ENV AUTH_SECRET="" 

EXPOSE 3000 5555

CMD ["docker-entrypoint.sh"]
