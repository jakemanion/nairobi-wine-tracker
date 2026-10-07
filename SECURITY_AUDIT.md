# WineDiviner security audit (launch readiness)

**Date:** 2026-10-06  
**Scope:** Full-app audit (auth, authorisation, Supabase/RLS, APIs/server actions, XSS/UGC, admin). No code changes were made.  
**Threat model:** Sensible security for a small consumer web app (not banking/medical; not seeking ISO/SOC2).

**Verdict:** Not launch-ready yet. Admin privilege escalation looks well controlled, and user-private tables that have RLS migrations look solid. Blockers: privacy leak on `/classic`, unverified RLS on core catalog tables, open redirects, and unvalidated URLs that can become stored XSS. Service role is not exposed to the browser.

---

## Do this tomorrow (priority order)

### Before launch (must)

1. ~~**Fix or disable `/classic`**~~ — **Done (2026-10-07):** removed `/classic` route and classic-only UI; dropped `getCurrentUserId` / `DEFAULT_USER_ID`. Treat historical tasting notes on the admin account as potentially exposed.
2. **Verify live RLS** on `wines`, `store_listings`, `store_listings_imports`, `stores`, `profiles` in Supabase Dashboard:
   - Public catalog: SELECT for anon/authenticated as needed
   - Writes: deny for anon/authenticated; admin via service role only
   - Imports: no public access
   - Profiles: users read/update own row only
   - Then add matching migrations so config is in git
3. ~~**Sanitize redirects**~~ — **Done:** `lib/auth/safe-redirect.ts` used by login + `/auth/confirm` (reject `//`, schemes, query/hash).
4. ~~**Allowlist URL schemes**~~ — **Done:** `lib/safe-http-url.ts` on admin writes + preview/admin render (`wine-card-model`, listing thumbnails, admin matcher). Classic `wine-table` UI removed earlier.
5. **Enable MFA** on the admin Supabase account; use a strong unique password.

### Soon after / with launch hardening

6. Prefer server actions for reviews that ignore client `userId` and always use `auth.getUser().id` (`lib/reviews.ts`).
7. Delete or server-gate unused `lib/wines.ts` / `lib/store-listings.ts` browser mutators.
8. Add security headers (CSP, frame protection, HSTS via Vercel) — `next.config.ts` is currently empty.
9. Disallow crawling of `/admin` in `app/robots.ts` (`/classic` removed).
10. Soften signup email enumeration (`lib/auth/sign-up.ts`); raise password minimum (`lib/auth/constants.ts`), especially for admin.
11. Runtime allowlists for admin update field names (`app/admin/actions.ts`).
12. Generic client error messages; log details server-side.

### Nice to have

13. Middleware defense-in-depth for `/admin/*`.
14. App-level rate limits on auth/recovery if Supabase defaults feel insufficient.
15. Env-based admin allowlist instead of a committed UUID (`lib/user.ts`).

---

## Executive summary

| Area | Status |
|------|--------|
| Admin privilege model | Strong — session `getUser()` + hardcoded UUID; UI flags are cosmetic |
| User data IDOR (reviews/reports/shares) | Generally safe **if** RLS stays as migrated |
| Catalog / imports / profiles RLS | **Unknown in repo** — no migrations; must verify live |
| Highest confirmed bug | ~~`/classic` privacy leak~~ — route removed 2026-10-07 |
| XSS via text UGC | Low risk (React escaping) |
| XSS via URLs | Real risk (`javascript:` / `data:` in `href`) |
| Service-role key in client | Not found |

---

## 1. Authentication

### How it works

- Email/password via Supabase Auth (`lib/auth/sign-in.ts`, `sign-up.ts`, reset/update flows).
- Browser client uses the **anon** key (`lib/supabase.ts`).
- Middleware refreshes the session cookie on every request; it does **not** protect routes (`middleware.ts`).
- Server identity correctly uses `auth.getUser()` (JWT validated), not `getSession()` alone, for admin checks.

### Password / reset

- Reset → email → `/auth/confirm` (code/OTP) → `/auth/update-password`.
- App minimum password length is **6** (`lib/auth/constants.ts`) — weak for an admin account.
- Register can disclose that an email already exists (`lib/auth/sign-up.ts`).

### Findings

| Sev | Finding |
|-----|---------|
| **High** | Login open redirect: `next.startsWith('/')` allows `//evil.example` (`app/login/page.tsx`). After login, `router.push(nextPath)` can leave the site (phishing). |
| **Medium** | `/auth/confirm` concatenates attacker-controlled `next` with no allowlist (`app/auth/confirm/route.ts`). |
| **Medium** | No MFA anywhere; one compromised admin password = full catalog control. |
| **Low** | Email enumeration on signup; weak password policy; middleware is refresh-only. |

### What looks solid

- Password update uses Supabase `updateUser`.
- Service role is server-only (`SUPABASE_SERVICE_ROLE_KEY`, not `NEXT_PUBLIC_`).
- No evidence of auth bypass via cookies/localStorage for admin **writes**.

### MFA recommendation

Enable Supabase MFA (TOTP) for the admin account before launch. Optionally enforce AAL2 inside `requireAdminAccess()` later. Ordinary consumer users: optional, not required for this threat model.

---

## 2. Authorisation / IDOR

### Inventory

There are **no** `app/api/**` routes. Mutations are:

- Admin server actions (`app/admin/actions.ts`, `app/admin/report-actions.ts`) — all gated by `requireAdminAccess()`
- User server actions for reports and shared lists
- Client-side Supabase for review edits (`lib/reviews.ts`) — relies on RLS

### Findings

| Sev | Finding |
|-----|---------|
| **Critical** | `/classic` uses hardcoded `ADMIN_USER_ID` via `getCurrentUserId()`, loads that user’s reviews (including tasting notes) with the **service-role** client, and renders them with “Signed in as …” — **no login required**. |
| **Medium** | Review helpers take client-supplied `userId`. RLS (`auth.uid() = user_id`) blocks cross-user writes today; there is no server-side bind to the session. |
| **Info** | Shared lists are public-by-slug by design; owner tasting notes are stripped (`lib/share/load-shared-list.ts`). Membership of shared collections is intentionally visible via which wines appear. |

### What looks solid

- Report submit sets `user_id` from session, not from the client (`lib/reports/report-actions.ts`).
- Share actions scope to `owner_id` / RLS.
- Admin pages check `isActorAdmin()` before loading data; actions check again before service-role writes.
- Ordinary users cannot call admin mutations successfully without the admin session.
- **Home page** correctly loads reviews only for `session.userId`. `/classic` is the outlier.

---

## 3. Supabase / database security

### Tables with RLS in migrations (good)

| Table | Policies |
|-------|----------|
| `reviews` | Own SELECT/INSERT/UPDATE/DELETE (`auth.uid() = user_id`) — `008_reviews_rls.sql` |
| `user_collections`, `user_collection_wines`, `shared_lists`, `shared_list_collections` | Owner-only ALL — `010_shared_lists.sql` |
| `wine_reports` | Own SELECT; INSERT own open rows only; **no** user UPDATE/DELETE (admin uses service role) — `011_wine_reports.sql` |

Users cannot insert/update another user’s `user_id` / `owner_id` on these tables under the migrated policies.

### Tables with **no RLS in any migration** (must verify live)

`wines`, `store_listings`, `store_listings_imports`, `stores`, `profiles`

If the live project still has default Supabase grants and RLS off, the public anon key can read/write the catalog and imports. That would be a **Critical** integrity/confidentiality failure independent of the admin UI.

Legacy browser mutators still exist in `lib/wines.ts` / `lib/store-listings.ts` (not used by current admin UI, which uses gated server actions). They become dangerous if RLS/grants are open.

### SECURITY DEFINER

- `handle_new_user()` — `SECURITY DEFINER` with `search_path = public` (good) — `006`/`007`.
- `set_updated_at()` — invoker (fine).
- No views in migrations.

### Service role usage

- `createServerReadClient()` (**`lib/supabase-server.ts`**) prefers the service role and bypasses RLS for almost all server page loads.
- Workable for a public catalog, but **application filters are the trust boundary**. `/classic` shows what happens when that filter is wrong.
- Admin writes via `createAdminClient()` only after `requireAdminAccess()` — good pattern.
- Service role is not shipped to the browser.

---

## 4. API / server security

| Topic | Verdict |
|-------|---------|
| SQL injection | Not found — Supabase query builder |
| Command injection | Not found |
| Auth on admin actions | Consistent `requireAdminAccess()` |
| Input validation | Reports validated well; admin dynamic `{ [field]: value }` has no runtime allowlist (admin-only) |
| Error leakage | Many actions return raw `error.message` (schema/constraint hints) |
| Rate limiting | Only wine-report submit. Auth reset relies on Supabase. Share/admin bulk unthrottled |

---

## 5. XSS / user-generated content

| Content | Risk |
|---------|------|
| Notes, report text, names, shared labels | **Safe** — React text nodes |
| `dangerouslySetInnerHTML` | Only in unused `design/figma_export` chart code — not in the Next app |
| Legal markdown | Static repo files; not UGC |
| `vivino_url` / `store_product_url` in `href` | **High** — no `http(s):` allowlist; React does not block `javascript:` |

Also: no CSP / HSTS / frame-protection headers (`next.config.ts` is empty).

---

## 6. Admin security

### How admin is decided

`ADMIN_USER_ID` in `lib/user.ts` is compared to the authenticated session user from `getUser()` in `lib/auth/admin.ts`.

### Escalation vectors checked

| Vector | Result |
|--------|--------|
| Client `isAdmin` prop / React state | UI only (badge / Edit link) |
| Cookies / localStorage role flag | Not used |
| Profile field / request param | No role column; params don’t grant admin |
| Calling admin server actions as non-admin | Returns unauthorized |
| Forging another user’s reviews via API | Blocked by reviews RLS |

**Admin is properly separated from ordinary users** for mutations. The failure mode is compromise of that one account (password), not client-side privilege escalation.

Hardcoding the UUID in source identifies the high-value account if the repo is public — move to env (`ADMIN_USER_IDS`) when convenient.

---

## Launch-readiness scorecard

| Control | Ready? |
|---------|--------|
| User isolation for notes/ratings/wishlist | Yes (with RLS as migrated) |
| Admin cannot be self-granted from the browser | Yes |
| Private data not leaked by public pages | Yes (`/classic` removed) |
| Catalog write lockdown | **Verify live** |
| Auth redirect safety | **No** |
| XSS basics for text UGC | Yes |
| XSS basics for links | **No** |
| Secrets hygiene (service role) | Yes |
| Admin account hardening (MFA) | **No** |
| Abuse controls | Partial (reports only) |

**Bottom line:** Ship after fixing `/classic`, confirming catalog RLS (and locking it in migrations), hardening redirects/URLs, and turning on admin MFA. The core authorisation design for admin vs user is sound; the gaps are concrete bugs and missing DB lockdown evidence, not a broken privilege model.

---

## Suggested first fix session

1. ~~`/classic` (critical privacy)~~ — done (route removed)
2. Redirect sanitisation (login + auth confirm)
3. URL scheme allowlist
4. Live Supabase RLS check + migrations
5. Admin MFA in Supabase dashboard
