# CLAUDE.md — lead-crm-frontend

Conventions live in the backend repo at `docs/CLAUDE_SKILL.md` (section 3). Quick facts:

- Stack: React 18 · Vite 5 · TypeScript strict · Tailwind 3 (CSS-variable theme, `.dark` class) · TanStack Query · zustand · react-router v6 · recharts · sonner.
- Commands: `npm run dev` (proxies `/api` → `http://localhost:4000`) · `npm run typecheck` · `npm run build`.
- Data: `api` from `lib/api.ts` (bearer + refresh); reference data from `useBootstrap()`; permission checks with `useCan()`.
- After lead mutations call `useLeadInvalidate()(id)`; after admin config changes `useInvalidateBootstrap()`.
- Custom lead fields are data-driven (`DynamicInput` / `fieldValue`); admin CRUD screens are specs in `pages/admin/configSpecs.tsx`.
- UI primitives: `components/ui/index.tsx`; utility classes `.card .input .th .td .pill` in `styles/globals.css`. Use theme tokens, not hard-coded colours.
