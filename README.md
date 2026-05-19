# thangam-backend

NestJS REST API for **Sri Thangam Housing** — a multi-branch real estate operations platform managing properties, bookings, billing, members, and documents.

## Tech Stack

- **Runtime:** Node.js 20 + NestJS 11
- **Database:** PostgreSQL via Supabase (Prisma 7 ORM + `@prisma/adapter-pg`)
- **Storage:** Supabase Storage (profile photos, property images, documents)
- **Auth:** JWT (access token in header, refresh token in httpOnly cookie)
- **PDF:** puppeteer-core (booking forms, estimate copies)
- **Deployment:** Render (auto-deploy via GitHub Actions)

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (database + storage bucket named `sth-files`)

## Quick Start

```bash
npm install
cp .env.example .env        # fill in Supabase + JWT values
npx prisma generate
npm run start:dev           # http://localhost:3001
```

> **Database is hosted on Supabase** — schema and seed data are already applied. `migrate deploy` and `db:seed` are only needed when setting up a brand new Supabase project.

**Super Admin credentials:** `admin@srithangam.com` / `Admin@123`

### Setting up a new Supabase project from scratch

```bash
npx prisma migrate deploy   # apply schema migrations
npm run db:seed             # create Super Admin account
```

## Environment Variables

See `.env.example` for all required variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `JWT_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `SUPABASE_STORAGE_BUCKET` | Storage bucket name (default: `sth-files`) |
| `CORS_ORIGIN` | Allowed frontend origin |

## API Docs

Swagger UI available in development at: `http://localhost:3001/api/docs`

## Commands

| Command | Description |
|---|---|
| `npm run start:dev` | Start in watch mode |
| `npm run build` | Production build |
| `npm run start:prod` | Run production build |
| `npm run db:migrate` | Create a new migration (dev only) |
| `npm run db:seed` | Seed Super Admin account |
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm test` | Unit tests |
| `npm run test:e2e` | E2E tests (requires real `.env`) |
| `npm run test:cov` | Unit test coverage |

## Project Structure

```
src/
  modules/
    auth/          # Login, refresh, logout, /me
    admins/        # Admin CRUD + profile photo upload
    members/       # Member hierarchy, team views, photo upload
    properties/    # Property CRUD, workflow, image upload
    bookings/      # Booking creation, workflow, PDF
    billing/       # Billing records, PDF
    dashboard/     # Role-scoped stats for web + mobile
    notifications/ # In-app notifications + messaging
    documents/     # Supabase Storage upload + signed URLs
    pdf/           # puppeteer-core PDF generation
    health/        # Liveness + DB readiness check
  common/
    guards/        # JwtAuthGuard, RolesGuard
    decorators/    # @CurrentUser, @Roles, @Public
    filters/       # AllExceptionsFilter
    interceptors/  # TransformInterceptor (wraps all responses)
    pipes/         # ImageFilePipe (JPEG/PNG/WebP, max 5MB)
prisma/
  schema.prisma    # Database schema
  migrations/      # SQL migration history
  seed.ts          # Super Admin + system settings seed
```

## Deployment

Deployed on **Render** via `render.yaml`. CI/CD runs on GitHub Actions:
1. Type-check → Lint → Unit tests → E2E tests → Build
2. On `main` push: triggers Render deploy webhook

Required GitHub Secrets: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RENDER_DEPLOY_HOOK_BACKEND`, `VITE_API_URL` (for frontend).
