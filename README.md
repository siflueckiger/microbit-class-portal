# microbit-class-portal

A classroom website for micro:bit [MakeCode](https://makecode.microbit.org)
tutorials. One site, two roles:

- **Students** enter a class code, browse that class's tutorials, and run them
  embedded in the page.
- **The teacher** logs in, builds tutorials with the real MakeCode block editor,
  and distributes them from a shared pool to classes.

German UI. Built with React + Vite and Supabase (Postgres + Auth).

Live: <https://siflueckiger.github.io/microbit-class-portal/>

Hosted Supabase project: `wygzkmauediourqgcdyg` (region `eu-central-1`).

## Architecture

- **Frontend**: Vite + React + TypeScript, hash routing
  (`#/`, `#/class/<code>`, `#/admin`, `#/admin/tutorial/<id>`).
- **Tutorial runner/builder**: the real micro:bit editor is embedded with
  [`@microbit/makecode-embed`](https://github.com/microbit-foundation/makecode-embed).
  The teacher snapshots blocks ("Schritt aus Workspace"); the app stores the
  steps as JSON and generates MakeCode tutorial Markdown when a student opens it.
- **Backend**: Supabase. Tables `classes`, `tutorials`, `class_tutorials`.
  Auth is email + password with sign-ups **disabled** (one teacher account).
- **Access control**: the anonymous (student) role cannot read tables directly.
  Two security-definer RPCs, `student_get_class(code)` and
  `student_get_tutorial(code, id)`, gate everything behind a valid class code.

## Local development

Prerequisites: Node 18+ and Docker.

```bash
npm install
supabase start      # local Postgres + Auth + Studio (first run pulls images)
npm run dev         # http://localhost:5174
```

Create `.env.development.local` (git-ignored) with the values printed by `supabase start`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<local anon key>
```

Create a teacher account (local only) via the Auth admin API:

```bash
curl -X POST http://127.0.0.1:54321/auth/v1/admin/users \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"lehrer@example.com","password":"Testpasswort123","email_confirm":true}'
```

Then register that account as an admin so the row-level security policies let it
manage data (use the `id` from the response above):

```bash
curl -X POST http://127.0.0.1:54321/rest/v1/admins \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{"user_id":"<user-id>"}'
```

Seed data (`supabase/seed.sql`) creates class **5a** with code **DEMO5A** and two
sample tutorials.

Helpful:

- `npm run supabase:reset` — re-apply migrations + seed.
- Studio: <http://127.0.0.1:54323>
- Mailpit (auth emails): <http://127.0.0.1:54324>
- `supabase stop` when you are done.

## Deploying to production

1. `supabase login`
2. `supabase link --project-ref <project-ref>`
3. `npm run db:push` — apply migrations to the hosted database.
4. In the Supabase dashboard: **Authentication → Providers → Email**, disable
   "Allow new users to sign up", then create the teacher account under
   **Authentication → Users**.
5. Create `.env.production` with the hosted project values (the anon key is
   public, so committing it is fine):
   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```
6. `npm run deploy` — builds and publishes `dist/` to the `gh-pages` branch.
7. The workflow `.github/workflows/keepalive.yml` pings the project every few
   days so the free-tier project does not pause over school breaks.

## Data model

```
classes          id, name, code (unique), created_at
tutorials        id, title, description, steps (jsonb), created_at, updated_at
class_tutorials  class_id, tutorial_id, position   (pool → class, ordered)
```

A tutorial step looks like:

```json
{
  "id": "step-...",
  "title": "Schritt 1",
  "description": "Ziehe einen Block ...",
  "code": "basic.showIcon(IconNames.Heart)",
  "blockXml": "<xml>...</xml>",
  "kind": "blocks"
}
```

`code` is used to generate the tutorial Markdown; `blockXml` lets the editor
reopen a tutorial's workspace when editing.

## Security notes

- Students have no accounts and no personal data is stored.
- A class code grants read access to that class's tutorials only.
- Teacher writes are restricted to users listed in the `admins` table (checked
  by the `is_admin()` function in the RLS policies), so even if public sign-ups
  were enabled a random account could not read or write anything.
- The Supabase anon key is public by design; the service-role key is never used
  in the frontend.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run deploy` | Build and publish to GitHub Pages |
| `npm run supabase:start` / `stop` | Local Supabase stack |
| `npm run supabase:reset` | Re-apply migrations + seed |
| `npm run db:push` | Push migrations to the linked hosted project |
