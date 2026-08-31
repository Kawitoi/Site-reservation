# VPS deployment guide

This guide deploys TableFlow on a single Ubuntu/Debian VPS behind Nginx,
running the app as a systemd service (`output: "standalone"` — no Vercel
dependency). It assumes a fresh server with root/sudo access and a domain
name pointed at the server's IP.

## 1. System packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx postgresql postgresql-contrib
```

`postgresql-contrib` ships the `btree_gist` extension the double-booking
exclusion constraint depends on.

Install Node.js 22 LTS:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v22.x
```

## 2. PostgreSQL

Create a dedicated role and database:

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE tableflow WITH LOGIN PASSWORD 'change-me-to-a-strong-password';
CREATE DATABASE tableflow OWNER tableflow;
SQL
```

Note the connection string:
`postgresql://tableflow:change-me-to-a-strong-password@localhost:5432/tableflow?schema=public`

By default PostgreSQL only listens on localhost, which is what you want —
the app connects over `localhost:5432`, never expose Postgres to the
public internet.

## 3. Application user and code

```bash
sudo adduser --system --group --home /opt/tableflow tableflow
sudo -u tableflow git clone <your-repo-url> /opt/tableflow/app
cd /opt/tableflow/app
```

## 4. Configure environment

```bash
sudo -u tableflow cp .env.example /opt/tableflow/app/.env
sudo -u tableflow nano /opt/tableflow/app/.env
```

Fill in at minimum:

```
DATABASE_URL=postgresql://tableflow:change-me-to-a-strong-password@localhost:5432/tableflow?schema=public
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=https://your-domain.example
APP_URL=https://your-domain.example
NEXT_PUBLIC_APP_URL=https://your-domain.example
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
EMAIL_FROM="TableFlow <no-reply@your-domain.example>"
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
```

`.env` is never committed (see `.gitignore`) — keep the file's permissions
tight (`chmod 600`) since it holds live secrets.

Leave the Stripe and SMTP variables unset only for a throwaway/staging
deployment; production needs both configured (billing enforcement and
password-reset/verification/invitation/booking emails are otherwise
silently disabled — see the README's environment variables table).

## 5. Install, migrate, build

```bash
sudo -u tableflow bash -c '
  cd /opt/tableflow/app
  npm ci
  npx prisma generate
  npm run db:migrate
  npm run build
'
```

`npm run db:migrate` runs `prisma migrate deploy`, which is non-interactive
and safe to run on every deploy — it only applies migrations not yet
recorded as applied.

Optionally seed a first admin account, or just sign up through the app
once it's running (`/signup` creates the first organization/owner).

## 6. systemd service

Create `/etc/systemd/system/tableflow.service`:

```ini
[Unit]
Description=TableFlow
After=network.target postgresql.service

[Service]
Type=simple
User=tableflow
Group=tableflow
WorkingDirectory=/opt/tableflow/app
EnvironmentFile=/opt/tableflow/app/.env
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node /opt/tableflow/app/.next/standalone/server.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/opt/tableflow/app

[Install]
WantedBy=multi-user.target
```

The standalone build doesn't include `public/` or `.next/static` by
default — copy them alongside the server bundle once after each build (or
add this to your deploy script):

```bash
cp -r /opt/tableflow/app/public /opt/tableflow/app/.next/standalone/public
cp -r /opt/tableflow/app/.next/static /opt/tableflow/app/.next/standalone/.next/static
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now tableflow
sudo systemctl status tableflow
```

View logs (the app writes structured JSON lines to stdout/stderr, see
`lib/logger.ts`):

```bash
journalctl -u tableflow -f
```

## 7. Nginx reverse proxy + HTTPS

Create `/etc/nginx/sites-available/tableflow`:

```nginx
server {
    listen 80;
    server_name your-domain.example;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/tableflow /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Issue a TLS certificate with certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.example
```

Certbot rewrites the server block to redirect HTTP → HTTPS and renews
automatically via its systemd timer (`systemctl status certbot.timer`).

## 8. Stripe webhook

Point your Stripe webhook endpoint at
`https://your-domain.example/api/webhooks/stripe` and copy the signing
secret into `STRIPE_WEBHOOK_SECRET` in `.env`, then restart the service.
Webhook processing is idempotent (`ProcessedWebhook` table) — safe to
replay from the Stripe dashboard if needed.

## 9. Deploying updates

```bash
sudo -u tableflow bash -c '
  cd /opt/tableflow/app
  git pull
  npm ci
  npx prisma generate
  npm run db:migrate
  npm run build
  cp -r public .next/standalone/public
  cp -r .next/static .next/standalone/.next/static
'
sudo systemctl restart tableflow
```

This is a brief-downtime deploy (a few seconds while the service
restarts) — acceptable for a single-instance VPS; there is no blue/green
step here.

## 10. Backups

See [`backups.md`](backups.md).
