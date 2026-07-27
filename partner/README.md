# AllergiApp Partner

Portale web per i ristoratori (`partner.allergiapp.com`) — claim della
scheda, vetrina (piatti+allergeni, link), abbonamento. Design e decisioni in
`../MONETIZATION.md`.

## Sviluppo

```bash
cd partner
npm install
npm run dev   # http://localhost:3001 (porta diversa dall'admin)
```

Env in `.env.local` (stesso progetto Supabase di app e admin):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Convenzioni

- Stack speculare all'admin: Next.js 15 (App Router), Tailwind v4,
  `@supabase/supabase-js` client-side (AuthContext, niente SSR auth).
- **i18n IT/EN dal giorno 1**: tutte le stringhe passano dai dizionari in
  `src/lib/dictionaries/` (`useI18n()` → `d.sezione.chiave`). Mai stringhe
  hardcoded nei componenti.
- **Mobile-first**: il portale dev'essere usabile da telefono quanto da
  desktop. Shell: sidebar ≥ md, bottom bar su mobile.
- Migrations DB del portale: serie **7xx** in `../supabase/migrations/`
  (applicate a mano via SQL editor, mai `supabase db push`).
- Deploy: progetto Vercel dedicato, **da `main`** con root directory
  `partner/` (niente branch di deploy stile admin-prod). Non ancora creato.
