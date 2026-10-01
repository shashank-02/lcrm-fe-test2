# Lead CRM — Frontend

React single-page app for the Lead CRM API. Vite · React 18 · TypeScript · Tailwind (light/dark) · TanStack Query.

Backend and shared docs live in the `lead-crm-backend` repo: [Architecture](../lead-crm-backend/docs/ARCHITECTURE.md) · [Deployment](../lead-crm-backend/docs/DEPLOYMENT.md) · [AI skill file](../lead-crm-backend/docs/CLAUDE_SKILL.md).

## Screens

- **Login** — email / username / phone + password; forced password change on first login.
- **Dashboard** — follow-ups due & overdue, contacted/created/assigned today, unassigned, funnel, by-source, 14-day trend, team activity feed.
- **Leads** — tabs with live counts, search, owner/stage/status/source/team and custom-field filters, column picker (persisted), sortable columns, 25/100 rows per page, row selection with bulk bar (assign, stage, status, source, follow-up, field, today list, export, delete), two-step *Create lead* modal with duplicate-phone check.
- **Lead detail** — chevron stage bar (click to move; stage directives enforced with inline errors), navy summary card with Primary/Secondary toggle and quality score, tabs: Basic Info + admin-defined tabs (inline edit), Activities, Interactions (calls), Files (upload/verify/download), Notes, Tasks. Floating Call / WhatsApp / Email launcher with template picker.
- **Reports** — agent performance table, team comparison, daily trend; date range, team and agent filters; CSV export.
- **Admin** — Users, Teams (members), Permission matrix editor, Pipeline (stages / statuses / sources / directives), Lead fields builder, Message templates, Assignment rules, Import wizard + history, Organisation settings.

Dark and light themes; desktop-first layout that collapses to a mobile drawer.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173 — proxies /api to http://localhost:4000
```

Point at a remote API by creating `.env`:

```
VITE_API_URL=https://your-api-domain
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with API proxy |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the production build locally |

## Deploying

`amplify.yml` is included for AWS Amplify Hosting (build `npm run build`, publish `dist`). Add the SPA rewrite rule described in the deployment guide and set `VITE_API_URL`. Any static host (Netlify/Vercel/S3+CloudFront) works: serve `dist/` and rewrite unknown paths to `index.html` (a `public/_redirects` file is included for Netlify-style hosts).

## Structure

```
src/
  lib/          api.ts (axios + refresh) · utils.ts (formatting)
  store/        auth · theme · bootstrap
  types/        API types
  components/   ui/ (primitives) · layout/AppShell · fields/DynamicField
  pages/        LoginPage · DashboardPage · leads/ · reports/ · admin/
  styles/       globals.css (theme tokens)
```
