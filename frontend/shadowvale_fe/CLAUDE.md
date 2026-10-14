# ShadowVale FE — rules for AI assistants

Read `README.md` → "Đối chiếu proposal — đọc trước khi sửa" before changing screens.

- The capstone proposal (`ShadowVale_RBL_Capstone_Proposal.docx`) is the source of truth:
  the FE must match it with nothing extra and nothing missing. Do not add screens or
  features it does not ask for, do not re-add anything listed under "Đã bỏ", and do not
  suggest editing the proposal to fit the code.
- Branch from `origin/dev` (newest code), not `main`.
- Stack is fixed: Tailwind 4 (no downgrade), shadcn/ui in `src/components/ui` (add with the
  shadcn CLI), TanStack Query for server data and mutations, Recharts via shadcn `chart`.
  Use the shared pieces in `src/features/shared` (Panel, StatCard, Status, Empty, Modal,
  `useConfirm`) and `sonner` toasts; do not add `window.confirm`, custom modals or new
  `sv-*` CSS.
- Chart colours come from `--chart-1…6` in `src/index.css`; keep that order and re-validate
  if you change them.
- Never point the BE at the shared Supabase database for testing; use demo mode or the
  Maestro mock API (`vite.maestro.config.mjs`).
- Run `npm run lint`, `npm test` and `npm run build` before handing work back.
