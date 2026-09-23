# CrediX MVP Architecture

CrediX is a modular monolith: a Next.js frontend and a synchronous FastAPI
backend exposing versioned endpoints under `/api/v1`.

```text
Next.js frontend
       |
       v
FastAPI API (/api/v1)
       |
       v
SQLAlchemy repositories and ORM models
       |
       v
PostgreSQL operational database
```

## Current database architecture

- **PostgreSQL** is the operational development/runtime database.
- **Alembic** is the only operational schema migration mechanism. FastAPI does
  not run `Base.metadata.create_all()` at startup.
- **SQLite** is retained solely for deterministic automated tests and isolated
  local testing.
- `DATABASE_URL` is the single database connection source for SQLAlchemy and
  Alembic.
- Demo seed data is explicit and idempotent: `python -m app.seed`.

The initial Alembic revision creates the operational workflow tables:
`users`, `loan_applications`, `documents`, `timeline_events`, `case_cards`,
`chat_sessions`, and `chat_messages`. `users.external_auth_id` is nullable and
maps a provisioned CrediX profile to a Supabase Auth subject. Passwords and
tokens are never stored in this database.

## Data strategy

PostgreSQL stores the operational workflow: user profiles, financing
applications, document metadata, timeline events, case cards, and demo chat
records. Documents hold metadata and future storage references only; binary
content is not stored in the database.

The large synthetic banking dataset (customers, accounts, transactions, loans,
payments, credit applications, and fraud transactions) is **not** runtime
application data and must not be imported into PostgreSQL. It is reserved for
training, experimentation, and feature-contract work:

```text
real/synthetic source data -> feature builder -> AI model
```

Current scores, confidence values, recommendations, citations, and dashboard
aggregates remain explicitly DEMO / PLACEHOLDER values. No OCR, ML, fraud
model, vector store, or inference service is included here.

## API and frontend boundaries

The API remains mounted under `/api/v1`; existing response contracts are
preserved. Business screens continue to use mock data. Auth provisioning is
the narrow exception: the confirmation route can call the protected
`POST /api/v1/auth/provision` endpoint with a Supabase session token.

## Current authentication foundation

CrediX now prepares authentication as a separate identity and profile system:

```text
Supabase Auth
  -> Supabase access JWT
  -> FastAPI verifies signature through project JWKS
  -> verified JWT sub
  -> users.external_auth_id
  -> CrediX PostgreSQL profile and business role
```

FastAPI validates asymmetric Supabase user access tokens using the public JWKS
endpoint derived from `SUPABASE_URL`:
`https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`. Verification
requires a valid signature, issuer, audience, expiry, and subject. No shared
JWT secret, private signing key, Supabase service-role key, unsigned decoding,
or client-provided business role is trusted.

The application business role remains `users.role`; Supabase's JWT `role` claim
is never used to decide whether someone is a CrediX officer or client. A valid
Supabase identity without a mapped `external_auth_id` receives
`403 PROFILE_NOT_PROVISIONED`; protected requests never create profiles
implicitly.

`POST /api/v1/auth/provision` uses the verified JWT `sub` as the only
authoritative identity. It creates or returns a client-only profile, is
idempotent on repeated calls, and refuses to auto-link an institution-controlled
officer profile by email. A legacy client-only email collision may be linked
only when the existing profile has no external identity. The optional
`user_metadata.full_name` claim is display data only; it never controls a role.
If the verified token explicitly carries `email_verified: false`, provisioning
is rejected. Otherwise the configured Supabase confirmation-link flow is
considered authoritative once the browser SDK has established an authenticated
session; no email string or URL parameter is treated as proof of verification.

`GET /api/v1/auth/me` is the profile endpoint used immediately after a real
Supabase email/password sign-in. The existing `POST /api/v1/auth/login` remains
explicitly **DEMO/LEGACY** and deprecated; the frontend does not call it.

The frontend has one Supabase browser-client factory with session persistence
and URL-session detection enabled. The verification and sign-in routes read the
current session through the official SDK and send its access token only in
protected auth/profile requests. They never manually persist or decode tokens
and never call `loginAs`.

Current session flow:

```text
Supabase email/password sign-in -> Supabase JS session -> Bearer access token ->
FastAPI /auth/me -> CrediX DB profile/role -> client portal or officer dashboard
```

If `/auth/me` returns `PROFILE_NOT_PROVISIONED` after an explicit client sign-in,
the frontend calls `/auth/provision` once, then reloads `/auth/me`. Public
provisioning never runs for an expected officer sign-in. The PostgreSQL role is
the sole routing authority; the sign-in role selector is only UX context.

`AuthContext` restores the Supabase session on refresh, reloads the CrediX
profile, listens for token/session changes, and calls `supabase.auth.signOut()`
on logout. It does not use `localStorage` role state as authentication.

Google OAuth, OTP, password reset, and business-screen integration remain
future tasks. Custom SMTP/OTP is not part of this flow. A
Supabase service-role key may be needed only for future controlled
administrative operations such as officer invitations; it is not used or stored
for client provisioning.

## Current client sign-up boundary

The existing Create Account screen now creates **client Supabase Auth
identities only** through `supabase.auth.signUp`. It sends the password directly
to Supabase and keeps `full_name` only as display/onboarding user metadata. It
does not send role metadata, does not create a CrediX PostgreSQL `users` row,
and does not call FastAPI during sign-up.

Public Credit Officer selection is deliberately blocked: officer profiles are
issued through a future controlled institutional process. A successful client
sign-up enters a pending email-confirmation state and routes to
`/verify-email`. After Supabase establishes a verified session, the route
provisions the client profile and shows a safe success state with a link back to
the Sign In page. If no session is available after the confirmation link, the
page does not bypass auth; the real email/password Sign In flow securely
provisions the confirmed client if needed. It never enters the Applicant Portal
automatically.
