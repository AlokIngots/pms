# Alok PMS — Production Management System

Production tracking for **Alok Ingots (Mumbai) Pvt. Ltd.** — tracks stainless steel bright bar manufacturing from Sales Order → Batch Card → 13-stage production flow → QC → Dispatch → Commercial Invoice.

Live at **https://pms.alokindia.co.in**

---

## Stack

- **Backend** — Flask 3.1, MySQL 8, ReportLab (PDFs), Anthropic SDK (AI PDF extraction), gunicorn
- **Frontend** — React 19 + Vite, served by nginx
- **Integrations** — AlokCRM (polling sync of Won offers → auto-create SO + batch cards)
- **Automation** — self-hosted n8n workflows for hiring, visiting-card extraction, factory photo logging

## Features

- **Sales Orders** — Export & Domestic, GST support, auto SO numbering (`AIMPL/S.O/EXP/` / `AIMPL/S.O/DOM/`)
- **Batch Cards** — Auto-generated from SO line items, QR-coded from RM Receive onward
- **13-stage production tracking** — Black Bar Inspection → HT Process → Black Bar Str. → Peeling → Bright Bar Str. → Grinding → Cutting → Chamfering → Polishing → MPI Final → Packing → Dispatch
- **Operator logs** — Shift-wise, machine-wise, per-stage
- **QC** — UT Inspection, HT Process verification, MPI Final
- **PDFs** — Batch card, packing list (export/domestic), sales contract, commercial invoice
- **CRM sync** — Polls AlokCRM every 60s for Won offers, auto-creates SO + batch cards
- **AI SO extraction** — Upload PDF/image to `/api/extract-so`; Claude extracts structured JSON

## Architecture

    ┌──────────────┐      ┌─────────────────┐      ┌──────────────┐
    │  React SPA   │─────▶│  Flask + gunic. │─────▶│   MySQL 8    │
    │  (nginx)     │ /api │  (systemd)      │      │  alok_pms    │
    └──────────────┘      └────────┬────────┘      └──────────────┘
                                   │ polls every 60s
                                   ▼
                          ┌─────────────────┐
                          │   AlokCRM       │
                          │ /api/v1/deals/  │
                          │      won        │
                          └─────────────────┘

## Quick start — Docker (recommended)

    git clone https://github.com/AlokIngots/pms.git
    cd pms
    cp .env.example .env       # edit with real values
    docker compose up -d --build

Then open http://localhost:8080.

## Quick start — bare metal (dev)

Backend:

    cd backend
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cp ../.env.example .env
    python app.py

Frontend:

    cd frontend
    npm install
    npm run dev

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Var | Purpose |
| --- | --- |
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection |
| `ANTHROPIC_API_KEY` | Powers `/api/extract-so` |
| `CRM_BASE_URL` | Defaults to `https://crm.alokindia.co.in` |
| `CRM_SYNC_TOKEN` | Sent as `X-PMS-Token` header to CRM |
| `CRM_POLL_INTERVAL` | Seconds between polls (default 60) |
| `ENABLE_CRM_POLLING` | `true`/`false` — disable in dev |
| `CORS_ORIGINS` | Comma-separated allowed origins |

## API endpoints (selected)

| Method | Path | Purpose |
| --- | --- | --- |
| GET  | `/api/health` | Liveness check |
| POST | `/api/extract-so` | Upload PDF/image → structured SO JSON |
| GET  | `/api/batches` | List batches |
| POST | `/api/scan/<batch_id>/<stage>` | Move batch to next stage |
| GET  | `/api/so/<so_number>` | SO detail |
| PUT  | `/api/so/<so_number>` | Update SO |
| POST | `/api/crm-sync/manual` | Force CRM poll |
| GET  | `/api/crm-sync/status` | Recent sync log |

## Database backups

Schema is versioned at `db/schema.sql`. Full data backups run hourly on the production VPS via cron; see `db/README.md` for restore instructions.

## Project structure

    pms/
    ├── Dockerfile.backend
    ├── Dockerfile.frontend
    ├── docker-compose.yml
    ├── nginx.conf
    ├── .env.example
    │
    ├── backend/           # Flask + MySQL
    │   ├── app.py
    │   ├── db.py
    │   ├── requirements.txt
    │   ├── routes/        # 18 blueprint modules
    │   ├── templates/
    │   └── utils/
    │
    ├── frontend/          # React + Vite
    │   ├── src/
    │   │   ├── pages/     # 17 pages
    │   │   ├── components/
    │   │   └── context/
    │   └── package.json
    │
    └── db/
        ├── schema.sql     # no data, safe to commit
        └── README.md

## Roadmap

- [ ] API authentication on all endpoints
- [ ] pytest suite for invoice/PDF calculations
- [ ] GitHub Actions CI (lint + build)
- [ ] Deploy via Docker (images ready, cutover pending)
- [ ] Move PMS→CRM calls to internal Docker network

## License

Proprietary — Alok Ingots (Mumbai) Pvt. Ltd.

## Contact

Alok Garodia · [alokindia.com](https://alokindia.com)
