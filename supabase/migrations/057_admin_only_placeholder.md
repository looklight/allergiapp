# 057 — admin-only migration (vive su `admin-prod`)

Il numero 057 è stato usato per una migration admin-only:

- File reale: `057_admin_rpcs_username.sql`
- Branch: `admin-prod`
- Contenuto: ripristina `get_profiles_with_email`, `get_profile_with_email`
  e `get_restaurants_admin` allineate allo schema username (post `056_drop_display_name`).

Per leggerla senza switchare branch:

```bash
git fetch
git show origin/admin-prod:supabase/migrations/057_admin_rpcs_username.sql
```

Questo file `.md` esiste solo come "tombstone" per evitare di riusare il numero 057
e per orientare chi consulta la cartella `supabase/migrations/` da `main`.

## Convenzione futura

Per evitare ulteriori collisioni di numerazione fra i due stream:

- nuove migrations app/schema → continuare su `main` con `058`, `059`, …
- nuove migrations admin-only → partire da `500_…` sul branch `admin-prod`

Vedi anche `memory/project_db_migrations_pattern.md` (memoria del progetto).
