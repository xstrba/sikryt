# Sikryt

**A web UI for managing Docker Swarm secrets and configs.**

Docker Swarm can store secrets and configs, but working with them on the command line is awkward:
secrets can't be read back once created, nothing can be edited in place, and there's no way
to give a teammate access to only *some* of them. Sikryt puts a friendly interface on top of
your swarm so you can browse, create, version and reveal secrets — and decide who gets to see what.

🐳 **Docker image:** [`xstrba05/sikryt` on Docker Hub](https://hub.docker.com/r/xstrba05/sikryt)

---

## Features

- **Browse everything in one place** – all swarm secrets and configs, organised into a folder tree.
- **Folders from naming conventions** – a secret called `production__api__DB_PASSWORD` shows up as
  `DB_PASSWORD` inside `production / api`. Folders you create in the UI produce names the same way.
- **Versioning** – Swarm secrets are immutable, so Sikryt "edits" a secret by creating a new version
  (`NAME--v1`, `NAME--v2`, …) and keeps the history next to it.
- **Reveal values** – read the current value of a secret (or config) right in the browser, with a code
  editor view and line numbers. Handy for comparing versions or checking what a service actually gets.
- **Users and permissions** – admins see and manage everything; regular users only see the folders
  they've been assigned.
- **Global search** across all secrets and configs.
- **Automatic sync** – secrets created outside Sikryt (e.g. with `docker secret create`) are picked up
  periodically and placed into the right folder.
- **Session limit** – logins expire after a fixed time (6 hours by default), even while you're active.

## How it works

Sikryt talks to the Docker Engine API through the mounted Docker socket, so it must run on a
**Swarm manager node**. It keeps its own small PostgreSQL database (bundled inside the image) for
folders, users and version metadata — the secret values themselves stay in Swarm and are never
stored by Sikryt.

Docker doesn't allow reading a secret's value back through the API. To reveal one, Sikryt starts a
short-lived service that mounts that secret, reads it once, and is removed immediately. Configs can be
read directly.

## Running it

### Quick start on a Swarm manager

```bash
docker volume create sikryt_data

docker run -d --name sikryt \
  -p 3000:3000 \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e AUTH_URL=http://localhost:3000 \
  -e MANAGER_ONLY=true \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v sikryt_data:/var/lib/postgresql/data \
  --restart unless-stopped \
  xstrba05/sikryt:latest
```

Then create the first admin account:

```bash
docker exec sikryt node seed-user.js admin@example.com 'choose-a-strong-password' admin "Administrator" admin
```

Open <http://localhost:3000> and sign in with the **nickname** (`admin`) and the password.
Arguments of `seed-user.js` are `<email> <password> [nickname] [name] [admin]`; running it again for an
existing email resets that user's password.

Users created later from the **Users** page get the default password `Sikryt123!` and should change it
in their profile right away.

> Keep the `sikryt_data` volume – it holds users, folders and version history.
> Pin a specific version (e.g. `xstrba05/sikryt:1.0.10`) instead of `latest` in production.

### Configuration

| Variable | Default | Description |
|---|---|---|
| `AUTH_SECRET` | – (required) | Key used to sign login sessions. Use a long random value and keep it stable. |
| `AUTH_SECRET_FILE` | – | Alternative to `AUTH_SECRET`: path to a file containing it (e.g. a mounted Docker secret). |
| `AUTH_URL` | – | Public URL of the app, e.g. `https://sikryt.example.com`. |
| `SESSION_MAX_AGE_HOURS` | `6` | How long a login lasts, counted from sign-in. Fractions allowed (`0.5` = 30 min). |
| `SYNC_INTERVAL` | `10` | How often (in minutes) to sync secrets created outside Sikryt. |
| `MANAGER_ONLY` | `false` | By default the temporary "reveal" service is placed on worker nodes. Set to `true` to allow any node, including managers — required for single-node swarms. |

Port `5555` additionally serves Prisma Studio (a raw database browser) inside the container — don't
publish it publicly.

## Local development

Requirements: Docker with Swarm mode enabled (`docker swarm init`).

```bash
docker compose --profile dev up -d --build
```

- App with hot reload: <http://localhost:3000> (source in [`app/`](app/), mounted into the container)
- PostgreSQL: `localhost:5432` (user `sikryt`, password `sikryt_password`, database `sikryt_dev`)

Create a user the same way as above, just with the dev container name:

```bash
docker exec sikryt_app node seed-user.js admin@example.com 'password' admin Administrator admin
```

Tech stack: Next.js, NextAuth, Prisma + PostgreSQL, CodeMirror, dockerode.

## Releases

The current version lives in the [`VERSION`](VERSION) file. Bumping it on `main` triggers the
[GitHub workflow](.github/workflows/docker-publish.yml), which builds the image and pushes
`xstrba05/sikryt:<version>` and `xstrba05/sikryt:latest` to
[Docker Hub](https://hub.docker.com/r/xstrba05/sikryt).

To build and push manually instead: `./build-and-push.sh` (uses `VERSION`, or pass a version as argument).
