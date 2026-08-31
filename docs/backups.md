# Backup strategy

TableFlow's only persistent state is the PostgreSQL database (uploaded
files aren't a feature of this version — there's nothing under `public/`
or elsewhere on disk that needs backing up beyond the database and the
`.env` secrets file, which you should already keep outside of backups that
leave the server, or encrypt if you don't).

## What to back up

- The `tableflow` PostgreSQL database (all tenant data — organizations,
  reservations, customers, tables, subscriptions, audit log).
- `.env` (secrets) — back up separately, encrypted, since it's not
  something you want in a shared/offsite dump alongside routine data
  backups.

## Automated daily dump

Install the backup script on the VPS:

```bash
sudo mkdir -p /opt/tableflow/backups
sudo tee /opt/tableflow/backup.sh > /dev/null <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/opt/tableflow/backups"
RETENTION_DAYS=14
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/tableflow-$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"
pg_dump --dbname="postgresql://tableflow:change-me-to-a-strong-password@localhost:5432/tableflow" \
  | gzip > "$FILE"

find "$BACKUP_DIR" -name 'tableflow-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete

echo "Backup written to $FILE"
SCRIPT
sudo chmod +x /opt/tableflow/backup.sh
sudo chown tableflow:tableflow /opt/tableflow/backup.sh
```

Use the same connection string as `DATABASE_URL` in `.env` (or read it
from there instead of hardcoding, if you prefer:
`source /opt/tableflow/app/.env` before the `pg_dump` line).

Schedule it daily via systemd timer (preferred over cron since logs land
in `journalctl`):

`/etc/systemd/system/tableflow-backup.service`:

```ini
[Unit]
Description=TableFlow database backup

[Service]
Type=oneshot
User=tableflow
ExecStart=/opt/tableflow/backup.sh
```

`/etc/systemd/system/tableflow-backup.timer`:

```ini
[Unit]
Description=Run TableFlow database backup daily

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now tableflow-backup.timer
sudo systemctl list-timers tableflow-backup.timer
```

## Off-site copies

Local disk backups don't protect against losing the whole VPS. Sync the
backup directory to off-site storage on the same schedule, e.g. with
`rclone` to S3-compatible storage:

```bash
rclone sync /opt/tableflow/backups remote:tableflow-backups --min-age 5m
```

Add this as a second `ExecStart` line (or a separate oneshot service
chained after the dump) in the timer above.

## Restore

```bash
sudo systemctl stop tableflow
gunzip -c /opt/tableflow/backups/tableflow-<timestamp>.sql.gz | \
  psql --dbname="postgresql://tableflow:change-me-to-a-strong-password@localhost:5432/tableflow"
sudo systemctl start tableflow
```

Restoring onto a database that already has data will error on conflicting
objects — for a clean restore, drop and recreate the database first:

```bash
sudo -u postgres psql -c "DROP DATABASE tableflow;"
sudo -u postgres psql -c "CREATE DATABASE tableflow OWNER tableflow;"
```

## Test your restores

A backup you have never restored is not a backup. Periodically restore
the latest dump into a scratch database and run `npm run db:migrate` +
smoke-test the app against it:

```bash
sudo -u postgres psql -c "CREATE DATABASE tableflow_restore_test OWNER tableflow;"
gunzip -c /opt/tableflow/backups/tableflow-<timestamp>.sql.gz | \
  psql --dbname="postgresql://tableflow:...@localhost:5432/tableflow_restore_test"
sudo -u postgres psql -c "DROP DATABASE tableflow_restore_test;"
```

## RGPD data requests

Deletion/anonymization and export requests for an individual customer are
handled at the application level (not via the database backup process):
see the "Anonymiser" / "Exporter les données" actions on a customer's
detail page, backed by `anonymizeCustomer` / `exportCustomerData` in
`server/services/customer.ts`. Anonymizing a customer scrubs their
personal fields on both the `Customer` record and the denormalized
snapshot fields on their historical `Reservation` rows, so anonymized data
does not reappear if an old backup is later restored over current data —
re-run the anonymization request again after any restore that predates it.
