# Deployment Guide

How to run Denox in every supported environment.

---

## Development

```bash
cp .env.example .env
deno task dev
```

The `dev` task regenerates the route table and starts the server with `--watch`.

---

## Production (bare metal / VM)

### Option A — compiled binary + systemd

```bash
deno task compile                 # produces ./dist/app
sudo mkdir -p /opt/denox
sudo cp dist/app /opt/denox/app
sudo cp .env /opt/denox/.env      # APP_ENV=production, CORS_ORIGIN set explicitly
sudo useradd --system --no-create-home denox
sudo cp deploy/denox.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now denox
```

### Option B — Deno runtime

```bash
deno task routes
APP_ENV=production deno task start
```

---

## Docker

```bash
docker compose up -d --build
docker compose logs -f denox
```

The container runs as the non-root `deno` user with least-privilege flags and a health check against
`/api/health`.

---

## Reverse proxy + HTTPS

Denox should sit behind a TLS-terminating proxy in production.

- **Nginx**: `deploy/nginx.conf` (use certbot for certificates).
- **Caddy**: `deploy/Caddyfile` (automatic HTTPS).

Both forward `X-Forwarded-For`, which the rate limiter uses to identify clients. Keep the proxy
body-size limit in sync with `MAX_BODY_SIZE_BYTES`.

---

## Environment variables

All variables are documented in `.env.example` and validated at startup by `src/config/env.ts`. The
process refuses to boot with an invalid configuration (fail fast). In production, `CORS_ORIGIN=*` is
rejected.

---

## Scaling

- The app is stateless except for the in-memory repositories and the in-memory rate limiter. Before
  scaling horizontally, replace:
  - repositories with a database-backed implementation (same interfaces), and
  - the rate limiter store with Redis.
- Run one container/process per CPU core behind the reverse proxy.

## Backup & restore

The scaffold ships with in-memory persistence — there is nothing to back up yet. When a database
adapter is introduced, document its dump/restore procedure here as part of the same feature (see
AGENTS.md, SDD Step 6).

## Monitoring & health checks

- `GET /api/health` — readiness (status, environment, uptime).
- `GET /api/ping` — liveness.
- Logs are JSON lines in production (`LOG_LEVEL` controls verbosity); ship them to your aggregator
  of choice.
