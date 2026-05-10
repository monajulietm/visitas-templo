# Templo Bahá'í de Sudamérica — Sistema de Reservas

Group-visit reservation system for the Templo Bahá'í de Latinoamérica (Av. Diag. Las Torres 2000, Peñalolén, Santiago, Chile). Institutions submit guided-visit requests; admins manage availability through a password-protected panel.

## Architecture

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite (port 8000), Tailwind, React Hook Form + Zod, Framer Motion, Lucide |
| Backend | Hono on Bun runtime (port 3000), Zod validation |
| Database | SQLite via Prisma |
| Email | Resend (Spanish-only templates) |
| Logging | Google Sheets API (service account) |
| CAPTCHA | Cloudflare Turnstile (optional) |

All third-party integrations gracefully **no-op** when env vars are absent, so you can run the project end-to-end without any external accounts.

## Quick start

Prerequisites: [Bun](https://bun.sh/) (for the backend) and Node 18+ (for the frontend).

```bash
# 1. Backend
cd backend
cp .env.example .env
bun install
bunx prisma migrate dev --name init
bun run dev          # http://localhost:3000

# 2. Frontend (in another terminal)
cd frontend
cp .env.example .env
npm install
npm run dev          # http://localhost:8000
```

Then open <http://localhost:8000> for the public form, <http://localhost:8000/admin> for the admin panel (default password `admin123`).

## Routes

### Public

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/api/reservations/availability?fecha=YYYY-MM-DD` | Slots for a specific day |
| `GET` | `/api/reservations/availability/month?year=&month=` | Fully-blocked dates in a month |
| `POST` | `/api/reservations` | Create reservation (rate-limited 3/hr/IP, honeypot, optional CAPTCHA) |
| `GET` | `/api/manage/:token` | Fetch by token |
| `PATCH` | `/api/manage/:token` | Edit `fechaVisita`/`horarioVisita`/`nroPersonas` |
| `DELETE` | `/api/manage/:token` | Cancel |

### Admin (require `x-admin-token` header)

| Method | Path |
|---|---|
| `POST` | `/api/admin/login` |
| `GET` | `/api/admin/stats` |
| `GET` | `/api/admin/reservations` |
| `DELETE` | `/api/admin/reservations/:id` |
| `GET` | `/api/admin/blocked-dates` |
| `POST` | `/api/admin/blocked-dates` |
| `DELETE` | `/api/admin/blocked-dates/:fecha` |

## Business rules

- Minimum 7 days advance booking
- 10–200 visitors per reservation
- Tue–Fri: 10:00, 11:00, 12:00, 15:00, 16:00 · Sat: 10:00 only · Sun & Mon closed
- Max 2 morning groups per day (10:00 / 11:00 / 12:00 cap)
- Chilean national holidays auto-blocked (`backend/src/lib/holidays.ts`)
- Admins can block any date or specific slots with a reason

## Environment variables

### `backend/.env`

```
DATABASE_URL="file:./prisma/dev.db"
PORT=3000
FRONTEND_URL=http://localhost:8000
ADMIN_PASSWORD=admin123

# Optional integrations (omit to disable)
RESEND_API_KEY=
RESEND_FROM_EMAIL=visitas@templobahai.cl
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
CAPTCHA_SECRET_KEY=
```

### `frontend/.env`

```
VITE_BACKEND_URL=http://localhost:3000
VITE_CAPTCHA_SITE_KEY=
```

## Notes on the spec

- The original `proposiotoVisita` field name has been corrected to `propositoVisita` everywhere (schema, API, frontend, emails).
- Emails are Spanish-only by design (the spec's later behavior).
- Rate limits and the honeypot live in-process; for multi-instance deploys, swap the in-memory store in `lib/rate-limit.ts` for Redis.

## Layout

```
backend/
  prisma/schema.prisma
  src/
    index.ts
    routes/{reservations,manage,admin}.ts
    lib/{db,availability,holidays,email,sheets,auth,captcha,rate-limit,schemas}.ts
    middleware/cors.ts
frontend/
  index.html
  src/
    main.tsx
    pages/{ReservationForm,ManageReservation,Admin}.tsx
    lib/{api,regions,options,i18n,cn}.ts
```
