# HustleHub+ — Backend (Part 1)

APDS7311/w · INSY7314/w — Application Development Security POE

## 1. What this is

HustleHub+ is a secure freelance marketplace. This repository currently
contains **Part 1** of a three-part build: the backend authentication
foundation. It supports user registration and login, with the security
controls the platform will build on for the rest of the project.

**Intended users, longer-term:** Clients (book gigs), Freelancers (list
gigs, get paid, see tax estimates), and Admins (platform oversight). Part 1
only builds registration/login for Client and Freelancer roles — Admin
accounts are never self-assignable through the public API, to prevent
privilege escalation (see §4).

## 2. Architecture

<img width="2880" height="2060" alt="HustleHub+ Part 1 architecture" src="https://github.com/user-attachments/assets/dbf3c022-7998-46dc-8d61-86f4e2a76d39" />

The full MERN stack is live as of Part 2: **M**ongoDB (Atlas) now backs
every repository behind the same interfaces Part 1 defined, **R**eact
(`hustlehub-frontend/`, Vite + TypeScript) is a new sibling project
consuming this API, and **E**xpress/**N**ode remain the backend.

### Request flow

1. Request crosses the HTTPS boundary (unchanged from Part 1 — TLS via
   a locally generated certificate, see §7).
2. `helmet` applies security headers, `cors` restricts cross-origin
   requests to the frontend's dev origin, `express.json()` parses the
   body, `express-mongo-sanitize` strips `$`/`.` keys from
   body/query/params.
3. Auth and booking-creation routes pass through rate limiting first
   (see §6).
4. A Zod schema validates the body.
5. Protected routes pass through `authMiddleware` (verifies the JWT,
   attaches `req.user`), then `requireRole(...)` where the route is
   restricted to a specific role.
6. Controller → service → repository, same separation as Part 1.
   Services are the only layer enforcing ownership — e.g. updating a gig
   loads it, checks `gig.freelancerId === req.user.id`, and only then
   writes; a 403 is returned before any write happens otherwise.
7. Centralised error handler, unchanged from Part 1.

## 3. Data model (MongoDB, via Mongoose)

```
User          email, name, passwordHash, role
Gig           freelancerId, freelancerName, title, description, price,
              category, coverImage
Booking       gigId, gigSnapshot: { title, price }, clientId, clientName,
              freelancerId, freelancerName, status
Transaction   bookingId, clientId, freelancerId, amount
```

**`gigSnapshot` on Booking** captures the gig's title and price *at the
moment of booking*. If a freelancer edits or deletes that gig afterward,
existing bookings and their financial records don't silently change —
this is an audit-record pattern, not just a live reference.

**Denormalised display names** (`freelancerName` on Gig, `clientName`/
`freelancerName` on Booking): populated once at creation time rather than
looked up from `User` on every read, to avoid an extra database round
trip every time a gig or booking list is rendered. Falls back to the
email's local part if no name was set at registration.

**Booking → Transaction is two sequential writes, not one atomic
transaction.** A booking is created, then a matching transaction is
created immediately after. Accepted simplification for this scope — a
genuinely atomic version would use a MongoDB client session (Atlas's free
tier supports this, since it's a replica set), which is a reasonable
next step rather than something silently skipped.

## 4. API endpoints

| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | `/api/users/register` | Public | Create a client or freelancer account |
| POST | `/api/users/login` | Public | Authenticate, receive a JWT |
| GET | `/api/users/me` | Authenticated | Caller's own profile |
| POST | `/api/gigs` | Freelancer | Create a gig |
| GET | `/api/gigs` | Public | Browse all gigs |
| GET | `/api/gigs/:id` | Public | View one gig |
| GET | `/api/gigs/mine` | Freelancer | Own listings |
| PUT | `/api/gigs/:id` | Freelancer, owner only | Update a gig |
| DELETE | `/api/gigs/:id` | Freelancer, owner only | Delete a gig |
| POST | `/api/bookings` | Client | Book a gig (creates a Transaction too) |
| GET | `/api/bookings/mine` | Client | Bookings I've made |
| GET | `/api/bookings/received` | Freelancer | Bookings on my gigs |
| GET | `/api/transactions/mine` | Freelancer | Transaction history + total income |

**Gig browsing is deliberately public** (no `authMiddleware`) — a
marketplace where you can't see what's on offer before registering isn't
much of a marketplace. This doesn't weaken RBAC: every *write* (create,
update, delete) and every endpoint that exposes a specific user's own
data (bookings, transactions) still requires authentication and the
correct role.

## 5. RBAC

`requireRole(...roles)` (`src/middleware/requireRole.middleware.ts`) is a
middleware factory — it reads `req.user.role` (already attached by
`authMiddleware`, which must run first) and rejects with `403 Forbidden,
FORBIDDEN_ROLE` if the caller's role isn't in the allowed list.

Role alone isn't sufficient for gig updates/deletes, since "any
freelancer" and "the freelancer who owns this specific gig" are different
things. Ownership is checked in the service layer, before the write:

```ts
const gig = await gigRepository.findById(id);
if (!gig) throw new AppError('Gig not found', 404, 'GIG_NOT_FOUND');
if (gig.freelancerId !== freelancerId) {
  throw new AppError('...', 403, 'NOT_GIG_OWNER');
}
// only now does the update/delete actually run
```

Admin remains a defined role (carried over from Part 1, still not
self-assignable at registration) but has no dedicated endpoints yet —
nothing in Part 2's requirements calls for admin-specific features, and
building them now would be ahead of the rubric's intended progression.

## 6. Security additions (beyond Part 1)

**Rate limiting (`express-rate-limit`).** 5 requests / 15 minutes per IP
on `POST /api/users/login` and `POST /api/users/register`; 10 requests /
15 minutes on `POST /api/bookings`. Exceeding the limit returns `429`
in this API's standard error shape (`{ success: false, error: { message,
code: "RATE_LIMITED" } }`), not the library's default response format.

**Security headers (`helmet`) with an explicit CSP**, not the default:
```
default-src 'self'; script-src 'none'; style-src 'none'; img-src 'none';
connect-src 'self' http://localhost:5173 http://127.0.0.1:5173;
frame-ancestors 'none'; object-src 'none'; form-action 'none'
```
`script-src`/`style-src`/`img-src` are all `'none'` because this server
never renders or serves any HTML, CSS, or images itself — it's a pure
JSON API. `connect-src` allowlists the frontend's dev origin. This is
strict by default rather than relying on helmet's defaults, which leave
more open than this API actually needs.

**Input sanitisation (`express-mongo-sanitize`).** Strips `$` and `.`
keys from `req.body`, `req.query`, and `req.params` before they reach
Mongoose — closes the NoSQL-operator-injection class of attack (e.g. a
login payload like `{ "email": { "$gt": "" } }`) that Zod's type
validation mostly but not completely covers on its own.

**CORS.** Restricted to the frontend's dev origins
(`http://localhost:5173`, `http://127.0.0.1:5173`) with `credentials:
true` — not left open to any origin.

**Email normalisation.** Emails are lowercased and trimmed at both
registration and lookup now (Part 1 only normalised at lookup) — so
`Mpho@HustleHub.com` and `mpho@hustlehub.com` are always treated as the
same account, including for duplicate-registration detection.

### Threat model summary (extends Part 1's)

| Threat | Control implemented |
|---|---|
| Credential stuffing | bcrypt hashing (cost 12), generic login error, rate limiting on login |
| User enumeration | Identical `401` for wrong password and unknown email |
| Privilege escalation (role) | `role` enum restricted at registration; admin never self-assignable |
| Broken access control (ownership) | Service-layer ownership check before every gig write, not just a role check |
| Token theft / replay | Short-lived JWT (1h), HTTPS-only transport |
| NoSQL injection | `express-mongo-sanitize` on every request, ahead of Zod validation |
| Unrestricted resource consumption | Rate limiting on auth and booking endpoints |
| Cross-origin abuse | CORS restricted to the known frontend origin |
| Information disclosure via errors | Centralised handler — no stack traces, paths, or config values ever reach a response |

## 7. Frontend

`hustlehub-frontend/` — Vite + React + TypeScript, `react-router-dom` for
routing. Pages: Login, Register, Gigs (browse), Gig Detail (book button
for clients), My Gigs (freelancer CRUD), My Bookings (client), Received
Bookings (freelancer, includes total income). Navigation is role-aware —
`ProtectedRoute` checks the logged-in user's role and redirects away from
pages that don't apply to them.

**Token storage: `localStorage`.** The honest trade-off: this is
vulnerable to theft if an XSS hole existed on this frontend. The
mitigating factor is that React escapes all rendered text by default and
nothing in this codebase uses `dangerouslySetInnerHTML`, which is what
would actually open that hole — so the risk this trade-off accepts is
one the codebase doesn't otherwise have an avenue for.

## 8. Running it locally

### Backend
Same as Part 1 (`npm install`, `.env` from `.env.example`, `mkcert`
certificate), plus:

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-host>/hustlehub?appName=hustlehub-cluster
```

MongoDB Atlas (free M0 tier) — create a cluster, a database user, and
allow network access, then use the connection string it gives you. The
database (`hustlehub`) and its collections are created automatically on
first write; nothing needs to be created manually in Atlas first.

```bash
npm run dev
```

### Frontend

```bash
cd hustlehub-frontend
npm install
npm run dev
```

Runs on `http://localhost:5173` by default. The backend's CORS
configuration is already set to allow exactly this origin.

## 9. Testing

**Postman/Newman** — `postman/HustleHub-Part2.postman_collection.json`
and its paired environment file cover gig CRUD (including the ownership
`403` case), booking creation (including the forbidden-role case),
transaction history, and rate limiting. Run via:

```bash
newman run postman/HustleHub-Part2.postman_collection.json \
  -e postman/HustleHub-Part2.postman_environment.json
```

**Frontend** — `cd hustlehub-frontend && npm run test` (Vitest + React
Testing Library): login form submission, and gig list rendering against
a mocked API response.

## 10. Evidence

### Screenshots

Stored in [`frontend/screenshots/`](./frontend/screenshots/) — see the
submission evidence document for the full list and what each shows.

### Demonstration video

**https://youtu.be/jPjLL0S1O74?si=GYdCMtQhk3E_keJO**

## 11. Part 3 logging and CI/CD

### Structured logging

The backend uses Pino JSON logging with `pino-http` request logging. Every log uses the
`HustleHub+` service and environment base fields, ISO timestamps, structured event names,
and numeric Pino levels so the `@axiomhq/pino` multi-target transport maps levels correctly.

Important events include registration/login outcomes, authorization failures, gig CRUD,
booking creation and failures, transaction outcomes, income calculation, validation,
HTTP requests, startup/shutdown, database failures, and process exceptions. Logs are
written to stdout for Docker visibility and forwarded asynchronously to Axiom when both
Axiom environment variables are configured.

Configure:

```dotenv
AXIOM_TOKEN=
AXIOM_DATASET=hustlehub-logs
AXIOM_URL=
LOG_LEVEL=info
```

`AXIOM_TOKEN` and `AXIOM_DATASET` are optional. Missing credentials disable remote shipping
but never prevent startup. Use a local `.env` or deployment secret store; never commit the
token. Keep the dataset name as `hustlehub-logs` in the supplied Axiom configuration.
Axiom transport initialization and delivery errors are written to stderr, and `SIGTERM`,
`SIGINT`, uncaught exceptions, and startup failures attempt to flush pending logs.

Pino redaction removes passwords, password hashes, JWTs/tokens, authorization headers,
cookies, API keys, MongoDB connection strings, and nested secret fields. HTTP logs record
method, path, status, duration, request ID, and authenticated user ID, but never request
bodies or credentials.

To verify locally:

```bash
cd hustlehub-backend
npm run dev
curl.exe -k https://localhost:5000/health
```

In Docker, inspect JSON on stdout with `docker compose logs -f api`. For Axiom, open the
`hustlehub-logs` dataset and confirm events such as `server.started`, `http.request`,
`auth.login.success`, or `booking.created` appear after requests are made.

### GitHub Actions

`.github/workflows/ci.yml` runs on pushes to `main`, pull requests targeting `main`, and
manual dispatch. The backend job runs `npm ci`, ESLint, TypeScript checking, Vitest,
production build, and dependency auditing. The frontend job runs `npm ci`, ESLint, Vitest,
TypeScript/Vite build, and dependency auditing.

The Docker/API job validates Compose, builds both images, starts the ephemeral MongoDB and
API stack, and runs the existing Part 3 Newman collection through `scripts/ci-newman.sh`.
Tests use a temporary MongoDB service and CI JWT value, never the production database or
Axiom credentials.

Required repository secret: none for the base pipeline because Axiom is disabled/blank in
CI compose and tests. Optional secrets for a future deployment workflow are `AXIOM_TOKEN`
and `AXIOM_DATASET`; the production dataset is `hustlehub-logs`.

View runs under the repository's **Actions** tab. A push or pull request is successful only
when backend checks, frontend checks, Docker validation, and Newman phases all pass.
