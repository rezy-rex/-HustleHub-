# HustleHub+ — Backend (Part 1: )

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

<img width="2880" height="2060" alt="HustleHub" src="https://github.com/user-attachments/assets/dbf3c022-7998-46dc-8d61-86f4e2a76d39" />


This is the MERN architecture at its Part 1 stage: the **E**xpress backend
and **N**ode runtime exist now; the **R**eact frontend and **M**ongoDB
database are planned for Part 2 and will slot in behind the same
`UserRepository` interface without changing any other module.

### Request flow

1. A request crosses the HTTPS boundary (TLS terminates at the Node process
   using a locally generated certificate — see §5).
2. `express.json()` parses the body.
3. For `POST` requests, a Zod schema validates the body before it reaches
   any business logic. Invalid input never reaches a controller.
4. Public routes (`/register`, `/login`) stop here and go straight to their
   controller. Protected routes additionally pass through `authMiddleware`,
   which verifies the JWT and attaches `req.user`.
5. Controllers call services, which contain all business logic (hashing,
   verifying, token issuing) and are the only layer allowed to talk to the
   repository.
6. Any error — validation failure, wrong credentials, unexpected exception —
   is passed to a single centralised error handler, never handled ad hoc in
   a route.

## 3. API endpoints

| Method | Route | Auth required | Purpose |
|---|---|---|---|
| POST | `/api/users/register` | No | Create a client or freelancer account |
| POST | `/api/users/login` | No | Authenticate, receive a JWT |
| GET | `/api/users/me` | Yes (Bearer JWT) | Return the caller's own profile |

`/me` exists specifically to demonstrate that JWT protects routes *beyond*
login, as required — a login endpoint alone doesn't prove the token is
actually being checked anywhere.

### Response shape

Success:
```json
{ "success": true, "data": { "...": "..." } }
```

Error (never includes a stack trace, file path, or config value):
```json
{ "success": false, "error": { "message": "Invalid email or password", "code": "AUTH_INVALID_CREDENTIALS" } }
```

## 4. Security decisions

**Password hashing — bcrypt (via `bcryptjs`), cost factor 12.**
Passwords are never stored, logged, or returned in any response — the API
sanitises the `passwordHash` field out of every user object before it
leaves the service layer. `bcryptjs` (a pure-JS implementation) was chosen
over native `bcrypt` specifically because it avoids a native compile step,
which matters once this API is built inside a Docker image in Part 3.

**Authentication — JWT (`jsonwebtoken`), HS256, 1 hour expiry.**
The token payload is `{ sub: userId, role, iat, exp }`. `role` is included
from Part 1 even though role-based access control isn't graded until
Part 2, so the token format doesn't need to change later. The secret is
read from an environment variable and is never committed to the repo.

**Input validation — Zod.**
Every request body is parsed against an explicit schema before any
handler runs. Validation failures return `400` with a description of what
was wrong — never a stack trace.

**Error handling — centralised middleware.**
All errors flow through one handler. Expected errors (`AppError`) return
their intended status code and a safe message. Anything unexpected is
logged server-side in full and returns a generic `500` to the client —
internal details never reach the response body.

**HTTPS — locally configured TLS certificate.**
The server refuses to start over plain HTTP. Certificates are generated
locally per machine (see §5) and are gitignored — they are never
committed, since a shared private key defeats the purpose of TLS.

**Preventing user enumeration.**
Login returns the identical `401 Invalid email or password` whether the
email doesn't exist or the password is wrong. Two different messages here
would let an attacker discover which emails are registered.

**Preventing privilege escalation at registration.**
The registration schema only accepts `role: "client" | "freelancer"`.
`"admin"` is rejected by validation — there is no way to self-register as
an administrator through the public API.

### Threat model summary

| Threat | Control implemented |
|---|---|
| Credential stuffing | bcrypt hashing (cost 12), generic login error message |
| User enumeration | Identical `401` for wrong password and unknown email |
| Privilege escalation | `role` enum restricted to `client`/`freelancer` at registration |
| Token theft / replay | Short-lived JWT (1h expiry), HTTPS-only transport |
| Injection (SQL/NoSQL-style) | Zod schema validation on every input; no raw query construction |
| Information disclosure via errors | Centralised handler — no stack traces, paths, or config values ever reach a response |
| Sensitive data exposure | `passwordHash` stripped from every user object before it leaves the service layer |

## 5. Running it locally

### Prerequisites
- Node.js 18+
- `mkcert` (for a browser-trusted local HTTPS certificate)

### Setup

```bash
npm install
cp .env.example .env
# then edit .env — set JWT_SECRET to a random string, 32+ characters
```

### Generate a local HTTPS certificate

```bash
# macOS
brew install mkcert
mkcert -install
mkdir certs && mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost

# Windows (with Chocolatey)
choco install mkcert
mkcert -install
mkdir certs; mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost

# Linux
sudo apt install mkcert   # or see https://github.com/FiloSottile/mkcert
mkcert -install
mkdir certs && mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost
```

`certs/` is excluded from version control. Each developer generates their
own local certificate rather than sharing a private key.

### Run

```bash
npm run dev      # starts the HTTPS server with auto-reload
```

You should see:
```
[INFO] HustleHub+ API listening on https://localhost:5000
```

Your browser/curl will warn about the certificate unless you ran
`mkcert -install` first — that's expected for a local dev cert.

### Build for production

```bash
npm run build
npm start
```

## 6. Testing

A Postman collection is included at
[`postman/HustleHub-Part1.postman_collection.json`](./postman/HustleHub-Part1.postman_collection.json),
covering:

- Register: happy path, missing field, invalid email, duplicate email
- Login: happy path, wrong password, unknown email
- Protected route (`/me`): no token, invalid token, valid token

Import it into Postman, run the **Login — happy path** request first (it
stores the returned token as a collection variable), then the rest of the
collection can be run in any order.

## 7. Evidence

### Screenshots of API responses

Captured against the final `/api/users` routes and stored in
[`screenshots/`](./screenshots/):

| # | File | Shows |
|---|------|-------|
| 1 | `01-register-success.png` | `201` created — POST `/api/users/register` |
| 2 | `02-register-duplicate-email.png` | `409` — email already registered |
| 3 | `03-register-invalid-input.png` | `400` — validation rejects bad input |
| 4 | `04-register-admin-role-rejected.png` | `400` — `role: "admin"` not self-assignable |
| 5 | `05-login-success.png` | `200` — JWT returned on login |
| 6 | `06-login-wrong-password.png` | `401` — generic invalid-credentials error |
| 7 | `07-me-no-token.png` | `401` — protected route without a token |
| 8 | `08-me-valid-token.png` | `200` — protected route with a Bearer JWT |
| 9 | `09-https-certificate.png` | Browser padlock / certificate details for `https://localhost:5000` |


## 8. Demonstration video

**[https://youtu.be/89zbx3POLmk?si=kC4vUq3rHtApSozn]**

[Part 1 demo video](https://youtu.be/89zbx3POLmk?si=kC4vUq3rHtApSozn)

## 9. What's next (Part 2)
ostman, run the **Login — happy path** request first (it
stores the returned token as a collection variable), then the rest of the
collection can be run in any order.

## 7. What's next (Part 2)

- Swap `fileUserRepository` for a MongoDB-backed implementation behind the
  same `UserRepository` interface
- React frontend
- Gig creation/browsing/booking, role-based access control
- Rate limiting on auth endpoints, `helmet` + Content Security Policy
- Newman-driven CI test runs
