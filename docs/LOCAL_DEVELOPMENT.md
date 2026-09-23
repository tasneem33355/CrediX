# Local development

## Backend and PostgreSQL

From `CrediX/backend`, prepare the Python environment and local configuration:

```powershell
Copy-Item .env.example .env
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

`DATABASE_URL` is the single connection setting. The local development format
is:

```text
postgresql+psycopg://credix:credix@localhost:5432/credix
```

Start the one-service local PostgreSQL stack:

```powershell
docker compose up -d postgres
```

Apply the schema and load idempotent demo data:

```powershell
python -m alembic upgrade head
python -m app.seed
```

Start FastAPI:

```powershell
python -m uvicorn app.main:app --reload --port 8000
```

Check `http://localhost:8000/health`, `http://localhost:8000/docs`, and an
existing database-backed endpoint such as
`http://localhost:8000/api/v1/applications`.

For a disposable local reset only (this deletes the named Docker volume):

```powershell
docker compose down -v
docker compose up -d postgres
python -m alembic upgrade head
python -m app.seed
```

## Tests

Automated tests intentionally use a separate SQLite database and do not require
Docker or PostgreSQL:

```powershell
python -m pytest -q
```

## Supabase Auth foundation

Add only public project configuration to `backend/.env`:

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_JWT_AUDIENCE=authenticated
```

FastAPI derives the issuer (`<SUPABASE_URL>/auth/v1`) and JWKS endpoint from
that URL, then verifies asymmetric access tokens using the project's public
signing keys. Do not add a Supabase JWT secret or service-role key for normal
user-token verification.

Add only browser-safe public configuration to `frontend/.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

Never expose a secret or service-role key through `NEXT_PUBLIC_*` variables.
Also set the local API base URL:

```text
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

The shared browser client owns session persistence; frontend code does not
manually store access or refresh tokens.

For a real development smoke test, sign in through the existing CrediX Sign In
form using a confirmed client account. The frontend calls
`supabase.auth.signInWithPassword`, sends the returned session token to
`/auth/me`, and provisions only a missing client profile before routing by the
database role. The frontend never sends the password to FastAPI.

For direct API verification with a controlled token, call:

```powershell
Invoke-WebRequest http://localhost:8000/api/v1/auth/me `
  -Headers @{ Authorization = "Bearer <supabase-access-token>" }
```

A valid token without a mapped profile returns `403 PROFILE_NOT_PROVISIONED`.
`POST /api/v1/auth/login` is DEMO/LEGACY only and is not a production sign-in
endpoint.

After a confirmed client session is available, provision the operational
profile with the same Supabase access token:

```powershell
Invoke-WebRequest http://localhost:8000/api/v1/auth/provision `
  -Method Post `
  -Headers @{ Authorization = "Bearer <supabase-access-token>" }
```

The endpoint derives identity only from the verified JWT `sub`, always creates
or links a `client` profile, and is idempotent. It never accepts a role from
the request, user metadata, or URL. Existing officer/demo email collisions are
rejected; an unlinked legacy client profile may be linked narrowly. No
password, access token, refresh token, or Supabase secret is stored in
PostgreSQL. An explicit `email_verified: false` JWT claim is rejected; the
authenticated session established by the configured confirmation-link flow is
otherwise the verification signal.

## Client email sign-up setup

Task 3 requires one hosted Supabase development project. In the Supabase
Dashboard, enable the Email provider, allow new user sign-ups, and keep
**Confirm Email** enabled. Configure the local Site URL as:

```text
http://localhost:3000
```

Add these local redirect URLs to the Auth URL allow list:

```text
http://localhost:3000/verify-email
http://localhost:3000/auth/callback
http://localhost:3000/reset-password
```

Set the same project URL in both `frontend/.env.local` and `backend/.env`.
Only the frontend receives the project's publishable key; never put a
service-role/secret key in the browser.

The Create Account form calls `supabase.auth.signUp({ email, password,
options: { data: { full_name }, emailRedirectTo } })` for **clients only**.
Supabase may return a user with `session: null` while Confirm Email is enabled;
this is a successful pending-verification state, not a login. After the email
link returns to `/verify-email`, the official browser client checks for the
current session and, when present, calls `/auth/provision`. If the redirect
does not leave a usable session, the page reports verified/unavailable; the
next real email/password Sign In can securely provision the client. No OTP,
custom SMTP, or manual token parsing is used.

## Frontend

From `CrediX/frontend`:

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

The frontend still uses mock data for business screens. Auth-related calls only
use `/auth/me` and `/auth/provision`; all other business APIs remain untouched.
The Sign In selector cannot grant access: PostgreSQL role determines the route.
Logout calls `supabase.auth.signOut()`, clears in-memory CrediX profile state,
and returns to Sign In. Google OAuth and Forgot Password remain future tasks.

## Frontend demo mode

For a standalone submission or Vercel showcase, set only:

```text
NEXT_PUBLIC_DEMO_MODE=true
```

Demo mode uses the existing frontend mock business data and in-memory demo
officer/client identities. It bypasses Supabase Auth, FastAPI, PostgreSQL, and
Docker entirely, so `NEXT_PUBLIC_API_URL` and Supabase variables are not needed
for the demo build.

To resume real Supabase and FastAPI integration later, set:

```text
NEXT_PUBLIC_DEMO_MODE=false
```

The real auth helpers remain in the codebase; no backend implementation is
removed by demo mode.
