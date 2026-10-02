# Wine reports

Lightweight accuracy reporting for WineDiviner.

## Apply the migration

The feature requires this migration (do **not** apply directly against production without review):

- `supabase/migrations/011_wine_reports.sql`

Apply it with your usual Supabase workflow, for example:

```bash
supabase db push
# or
supabase migration up
```

Or paste/run the SQL in the Supabase SQL editor against the target project.

Until the migration is applied, report submission and the admin Reports page will fail against a missing `wine_reports` table.

## What it adds

- Authenticated users can submit a **Report error** from wine cards (home and shared lists).
- Reports are stored in `public.wine_reports` with RLS (users insert/read own rows only).
- Admins review reports at `/admin/reports` (service role after `requireAdminAccess()`).
- Open-report flag counts appear on admin matcher wine and listing rows.

## Configuration

No new environment variables. Existing vars are required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (admin resolve/reopen/delete and report listing)

## Types

This project uses hand-written TypeScript types (no `supabase gen types` workflow). Report types live in `lib/reports/`.

## Future email notifications

`wine_reports` already has `status`, timestamps, and `user_id`. A later notifier can select newly created or newly resolved rows without schema redesign.
