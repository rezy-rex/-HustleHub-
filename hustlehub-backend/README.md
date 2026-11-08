# HustleHub+

APDS7311/w · INSY7314/w — Application Development Security POE (final submission)

HustleHub+ is a secure freelance marketplace. Freelancers list gigs, clients book them, every booking records a transaction, and freelancers see their income and an estimated tax bill on a dashboard. Security is built in from the first request, and the whole stack runs in Docker and is checked by a CI/CD pipeline.

**Contents:** [Architecture](#2-architecture) · [Run it](#4-running-it) · [API](#5-api-endpoints) · [Tax](#7-tax-estimation) · [Security](#8-security-controls) · [Logging](#9-logging) · [Testing](#10-testing) · [CI/CD](#11-cicd-pipeline) · [Static analysis](#12-static-analysis) · [Docker](#13-docker) · [Security review](#14-final-security-review) · [Evidence](#15-evidence) · [Team](#16-team)

## 1. Overview

| Role | What they do |
|---|---|
| Client | Browses gigs and books them |
| Freelancer | Creates and manages gigs, sees bookings, income and estimated tax |
| Admin | Reserved role. It can never be self-assigned at registration |

| Part | What it added |
|---|---|
| 1 | Express API, registration and login, bcrypt hashing, JWT, HTTPS, Zod validation, safe errors |
| 2 | MongoDB Atlas, gigs, bookings, transactions, RBAC with ownership checks, rate limiting, Helmet and CSP, React frontend, Newman tests |
| 3 | Tax estimation and income dashboard, structured logging to Axiom, account lockout, token revocation, Docker and Compose, GitHub Actions pipeline, static analysis |

## 2. Architecture

<img width="1920" height="1080" alt="hustlehub-architecture pdf" src="https://github.com/user-attachments/assets/d34a7a08-8ae4-4e84-a980-0533af296c2b" />


Two containers run behind the browser:

- **client** (nginx, port 8080) serves the React app, adds security headers and a Content Security Policy, and proxies `/api/` to the API over TLS.
- **api** (Node 22, Express, TypeScript, HTTPS on port 5000) holds all the business logic and talks to MongoDB Atlas.

Request flow through the API:

1. `requestLogger` creates a fresh request ID and logs the request (no query string, no headers or bodies).
2. `helmet` sets security headers and the API's CSP. `cors` allows only the configured origins.
3. `express.json()` parses the body, then `express-mongo-sanitize` strips `$` and `.` keys.
4. Rate limiters apply to login, register and booking creation.
5. A Zod schema validates the input. Invalid input never reaches a controller.
6. `authMiddleware` verifies the JWT **and** checks its token version against the database. `requireRole` enforces the role.
7. Controller, then service, then repository. Services own the business rules, including ownership checks that run before any write.
8. Any error reaches one handler that returns a generic message and logs the detail privately.

## 3. Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Router, Recharts |
| Backend | Node.js 22, Express, TypeScript, Zod, bcryptjs, jsonwebtoken |
| Database | MongoDB Atlas via Mongoose |
| Logging | pino, shipped to Axiom |
| Containers | Docker, Docker Compose, nginx |
| Testing | Vitest, Postman and Newman |
| CI/CD and scanning | GitHub Actions, ESLint (security plugin), CodeQL, npm audit, Trivy, gitleaks |

## 4. Running it

### With Docker (recommended)

Prerequisites: Docker Desktop, Git Bash, and `hustlehub-backend/.env` created from `.env.example` (Atlas URI, a `JWT_SECRET` of 32+ characters, optional Axiom settings).

```bash
bash scripts/gen-certs.sh        # once per machine; creates certs/docker/ (gitignored)
docker compose up --build -d
docker compose ps                # wait for both services to be healthy
```

Open http://localhost:8080. The API is also on https://localhost:5000 for Postman. Full guide and troubleshooting: [`docs/running-containers.md`](./docs/running-containers.md).

### Without Docker

```bash
cd hustlehub-backend && npm install && npm run dev     # needs a mkcert certificate in certs/
cd hustlehub-frontend && npm install && npm run dev    # http://localhost:5173
```

## 5. API endpoints

| Method | Route | Access |
|---|---|---|
| GET | `/health` | Public, returns `{"status":"ok"}` only |
| POST | `/api/users/register` | Public, rate limited |
| POST | `/api/users/login` | Public, rate limited, lockout protected |
| GET | `/api/users/me` | Authenticated |
| POST | `/api/users/logout` | Authenticated, revokes all of the caller's tokens |
| GET | `/api/gigs`, `/api/gigs/:id` | Public |
| GET | `/api/gigs/mine` | Freelancer |
| POST | `/api/gigs` | Freelancer |
| PUT, DELETE | `/api/gigs/:id` | Freelancer, owner only |
| POST | `/api/bookings` | Client, rate limited |
| GET | `/api/bookings/mine` | Client |
| GET | `/api/bookings/received` | Freelancer |
| GET | `/api/transactions/mine` | Freelancer, transactions and total income |
| GET | `/api/transactions/tax-summary` | Freelancer, income and estimated tax |

Responses are `{ success: true, data }` or `{ success: false, error: { message, code } }`. Errors never include stack traces, paths or configuration.

## 6. Data model

```
User          email, name, passwordHash, role, tokenVersion, failedLoginAttempts, lockUntil
Gig           freelancerId, freelancerName, title, description, price, category, coverImage
Booking       gigId, gigSnapshot { title, price }, clientId, clientName, freelancerId, freelancerName, status
Transaction   bookingId, clientId, freelancerId, amount
```

`gigSnapshot` freezes the title and price at booking time, so editing or deleting a gig later cannot change a financial record. Creating a booking and its transaction are two sequential writes, not one atomic operation. If the second write fails, a `transaction.failed` event is logged so the orphaned booking can be found. A MongoDB session would make this atomic and is the natural next step.

## 7. Tax estimation

The estimate uses the **SARS 2026/27 individual tax tables** (tax year 1 March 2026 to 28 February 2027), with a primary rebate of R17,820 and a tax-free threshold of R99,000 for under-65s.

| Taxable income (R) | Tax (R) |
|---|---|
| 0 – 245,100 | 18% |
| 245,101 – 383,100 | 44,118 + 26% above 245,100 |
| 383,101 – 530,200 | 79,998 + 31% above 383,100 |
| 530,201 – 695,800 | 125,599 + 36% above 530,200 |
| 695,801 – 887,000 | 185,215 + 39% above 695,800 |
| 887,001 – 1,878,600 | 259,783 + 41% above 887,000 |
| 1,878,601+ | 666,339 + 45% above 1,878,600 |

**Estimated tax = bracket tax − R17,820, never below zero.**

Worked examples: R180,000 gross gives 18% = R32,400, minus the rebate = **R14,580**, net R165,420 (effective rate 8.1%). R400,000 gross gives R79,998 + 31% of R16,900 = R85,237, minus the rebate = **R67,417**, net R332,583 (effective rate about 16.9%).

How it is computed:

- Only transactions inside the current tax year count. The year runs 1 March to the last day of February (leap years included), in UTC.
- Tax is calculated on year-to-date income as if it were a full year's income. The cumulative chart applies the same function to cumulative income at each month, because progressive tax cannot be added up month by month.
- If tables for a newer tax year aren't loaded, the latest ones are used and the API says so in its `assumptions`.

Assumptions (shown on the dashboard and returned by the API): all platform income is taxable, no expenses or deductions, primary rebate only, amounts in ZAR, and this is an estimate and not tax advice. The calculator is a pure function with unit tests at the bracket boundaries.

The dashboard shows four summary cards, a monthly income chart, a cumulative income-versus-tax chart, a "distance to next bracket" indicator, and the assumptions box. It is available to freelancers only.

## 8. Security controls

| Area | Control |
|---|---|
| Passwords | bcrypt, cost 12. The hash is stripped from every response |
| Tokens | JWT, HS256, 1 hour, payload `sub`, `role`, `tv`. The secret comes from the environment |
| Transport | HTTPS on the API. nginx talks to the API over TLS inside the Docker network |
| Validation | Zod on every body, then `express-mongo-sanitize` against NoSQL operator injection |
| RBAC | `requireRole` plus ownership checks in the service layer, before any write |
| Abuse limits | Rate limits: 5 login/register requests and 10 booking requests per 15 minutes per IP |
| Headers | Helmet with an explicit CSP on the API. nginx adds its own CSP and headers for the frontend |
| Errors | One central handler returns generic messages. Details go to logs only |
| Enumeration | Identical `401` for unknown email, wrong password and locked account. A dummy bcrypt comparison keeps timing alike |
| Privilege escalation | Registration accepts only `client` or `freelancer` |

### The two additional security features

**1. Account lockout.** The IP rate limiter alone cannot stop a distributed attack on one account. After 3 consecutive failed logins an account is locked for 15 minutes (both configurable). The locked response is identical to a wrong-password response, so an attacker cannot tell the account exists. Lock events are logged. The counter resets on a successful login or when the lock expires.

**2. Logout with token revocation.** JWTs are stateless, so a stolen token normally stays valid until it expires. `POST /api/users/logout` increments the user's `tokenVersion`, and every request compares the token's `tv` to the database. Old tokens return `401 TOKEN_REVOKED`. The cost is one database read per authenticated request, which was accepted for this scale.

## 9. Logging

The API writes structured JSON with pino to stdout (`docker compose logs api`) and ships the same events to **Axiom**, a cloud logging platform (dataset `hustlehub-logs`). If no Axiom token is set, it logs to stdout only. A rejected token never crashes the API.

Every request gets a fresh request ID (returned as `X-Request-Id`), and each event inside it carries that ID automatically, so one request can be followed from start to finish.

| Event | Why it matters |
|---|---|
| `auth.login.success`, `auth.login.failed` | Spot credential stuffing and password guessing |
| `auth.account.locked` | A direct signal that an account is under attack |
| `auth.register.success` | Account creation audit trail |
| `auth.logout`, `auth.token.revoked` | Session tracking and detection of reused revoked tokens |
| `booking.created`, `transaction.recorded` | Financial audit trail |
| `transaction.failed` | Finds a booking whose transaction was not recorded |
| `authz.denied` | Probing for access-control gaps (wrong role, not the owner) |
| `rate.limited` | Abuse and brute-force attempts |
| `http.request` | Method, path, status and duration for every request |
| `error.unhandled` | Reliability. The stack goes to logs, never to the client |

Never logged: passwords, tokens, authorization headers, query strings, or raw email addresses. Logins use a short SHA-256 hash of the email, and pino redaction covers the sensitive field names as a second layer.

## 10. Testing

| Level | Tool | What it covers |
|---|---|---|
| Backend unit | Vitest | Tax calculation and tax-year boundaries, lockout flow, auth middleware and revocation, log redaction, environment defaults. No database or network |
| Frontend unit | Vitest and Testing Library | Login, gig list, dashboard rendering and states, logout behaviour, currency formatting |
| API | Postman collection run by Newman | Auth, gigs, bookings, transactions, tax summary, RBAC rejections, lockout, logout revocation, rate limiting |

```bash
cd hustlehub-backend && npm test
cd hustlehub-frontend && npm test
bash scripts/ci-newman.sh      # starts a throwaway stack and runs both Newman phases
```

Newman runs in **two phases**. The login and register limiter is shared and allows only 5 requests per 15 minutes, so the functional folders run with the limits raised through environment variables, and the rate-limit folder then runs against a recreated API container with the real limits. The lockout and logout tests use their own throwaway users so they cannot break other tests.

## 11. CI/CD pipeline

`.github/workflows/ci.yml` runs on every push and pull request. Any failing step fails the run.

| Job | Steps |
|---|---|
| backend | install, typecheck, lint, unit tests, build, `npm audit` (high and above) |
| frontend | install, lint, unit tests, build, `npm audit` |
| hygiene | check for leftover ownership tags, gitleaks secret scan over full history |
| stack | generate certs, build both images with Compose, start them with a throwaway Mongo, run Newman (both phases), check the UI, the `/api` proxy, the CSP header and that `X-Powered-By` is absent, scan both images with Trivy (HIGH and CRITICAL) |

`.github/workflows/codeql.yml` runs CodeQL on push, pull request and weekly. The pipeline needs no secrets, because it never touches Atlas or Axiom. A deliberately broken test on a throwaway branch shows the pipeline failing (see the evidence below).

## 12. Static analysis

| Tool | Checks |
|---|---|
| ESLint with `eslint-plugin-security` and `typescript-eslint` | Unsafe patterns and type-aware issues in both apps, on every run |
| CodeQL (security-extended) | Deeper data-flow analysis for injection, XSS and similar |
| `npm audit` | Known vulnerabilities in dependencies |
| Trivy | Vulnerabilities in the built images |
| gitleaks | Committed secrets |

Results: [CONFIRM: final counts, for example "ESLint 0 errors in both projects, CodeQL 0 open alerts, npm audit 0 high/critical, Trivy 0 fixable HIGH/CRITICAL"].

Every finding and its resolution is in [`docs/static-analysis-notes.md`](./docs/static-analysis-notes.md): real issues were fixed, and false positives (mostly `detect-object-injection`) were suppressed with the narrowest inline disable and a written reason. [CONFIRM: add 2 or 3 of the most meaningful fixes here, in one sentence each].

## 13. Docker

```
hustlehub-backend/Dockerfile      multi-stage, Node 22 alpine, non-root user, healthcheck
hustlehub-frontend/Dockerfile     build stage, then unprivileged nginx
hustlehub-frontend/nginx.conf     SPA fallback, /api proxy, security headers and CSP
docker-compose.yml                api + client, secrets from the ignored .env, certs mounted read-only
docker-compose.ci.yml             adds a throwaway Mongo for CI and test runs
scripts/gen-certs.sh              creates the local certificate for the containers
```

Design decisions:

- Secrets are never baked into images. `.env` and certificates are excluded by `.dockerignore` and supplied at run time.
- Both containers run as non-root users and have healthchecks. The client starts only after the API is healthy.
- nginx forwards the real client address, and the API trusts exactly one proxy hop (`TRUST_PROXY=1`), so rate limiting and logs see real IPs.
- nginx and the API talk over TLS inside the Docker network. [CONFIRM: "nginx verifies the API certificate" or "verification is off because traffic never leaves the private Docker network"].

## 14. Final security review

| Threat | How it is handled | Where it is tested |
|---|---|---|
| **Injection** (NoSQL) | Zod rejects wrong types, `express-mongo-sanitize` strips operator keys, Mongoose queries are built without string concatenation | Validation tests, Newman invalid-input cases |
| **Cross-site scripting** | React escapes output and nothing uses `dangerouslySetInnerHTML`. nginx sets a CSP for the app (scripts from `'self'` only). The API's CSP blocks all scripts and styles. [CONFIRM against `nginx.conf`: allowed origins are `'self'` plus the gig cover-image host, with `'unsafe-inline'` for styles only] | DevTools console shows no CSP violations |
| **Authentication weaknesses** | bcrypt cost 12, 1 hour JWTs, account lockout, token revocation on logout, generic errors, IP rate limiting | Lockout and logout tests, Newman folders 5 to 7 |
| **Access control** | Role checks on every protected route, ownership checks before gig writes, clients cannot reach freelancer endpoints, tax data is limited to the owner | Newman 403 cases, unit tests |
| **Sensitive data exposure** | Hashes never returned, secrets only in the environment, logs redacted and email-hashed, images carry no secrets | Axiom screenshots, `ls /app` in the container |
| **Brute force and abuse** | Rate limits plus per-account lockout, both logged | `rate.limited` and `auth.account.locked` events |
| **Supply chain** | `npm audit`, Trivy on images, gitleaks, CodeQL, pinned image tags | Pipeline |
| **Monitoring gaps** | Structured events for logins, bookings, transactions, denials and errors, shipped off-box to Axiom | Axiom screenshots |

Known limitations, stated honestly:

- The JWT is stored in `localStorage`. XSS would expose it, which is why the CSP and React's escaping matter. httpOnly cookies would be stronger but need CSRF protection.
- Booking and transaction creation are not atomic (see section 6).
- Port 5000 is published so Postman can reach the API directly. Because `TRUST_PROXY=1`, someone connecting directly could spoof `X-Forwarded-For`. In a real deployment only the proxy would be exposed.
- The local certificate is self-signed, and the Atlas network allowlist is open (`0.0.0.0/0`) because four people on different networks use it. Neither suits production.
- The tax model is a simplified estimate and not tax advice.

## 15. Evidence

- Screenshots: [`screenshots/part3/`](./screenshots/part3/) (frontend, API, Docker, Axiom, Atlas, pipeline, static analysis, tests)
- Demonstration video: https://youtu.be/nLMWCF2E3BA?si=0xl3_TVC-zWY98vn
- Pipeline: https://github.com/rezy-rex/-HustleHub-/actions/runs/42484536868


## 16. Team

| Member | Main areas |
|---|---|
| Thuso | Integration, Docker and Compose, CI/CD pipeline, static analysis, final documentation |
| Sixolile | Data models and repositories, account lockout and token revocation |
| Odirile | Controllers and services, RBAC, tax estimation, structured logging |
| Lesedi | React frontend, income dashboard, frontend container |
