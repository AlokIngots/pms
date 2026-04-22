# Database

`schema.sql` is a MySQL schema dump (no data) of the `alok_pms` database.
25 tables covering Sales Orders, Batch Cards, QC, Dispatch, Invoicing,
and master data.

## Regenerate after schema changes

Run on the production VPS:

    mysqldump --no-data --routines --triggers --no-tablespaces \
        --skip-comments --databases alok_pms > db/schema.sql

## Restore on a fresh MySQL instance

    mysql -u root -p < db/schema.sql

## Backups

Full data backups (hourly, 7-day retention) run via cron on the VPS at
`/root/backups/pms/`. They are NOT committed to this repo — they contain
customer data.
