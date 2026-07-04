<div align="center">

# HDASH

**The household, on one screen.**

A self-hostable dashboard for shared living — chores, groceries, todos, a calendar,
and the money — with a terminal-flavored UI and a daily digest that lands in your inbox.

`Next.js 16` · `React 19` · `ASP.NET Core 9` · `SQLite` · `JWT`

</div>

---

## What it is

HDASH is one place to run a household with the people you live with. Create a household,
invite your housemates, and everything is shared: whose turn it is to take out the trash,
what's on the shopping list, what's on the calendar this week, and where the money stands.

It has a point of view. The interface is a **terminal** — monospace, keyboard-first, green-on-black —
and the daily email digest is styled like a **transit departures board** (your day as scheduled
departures; the overdue chore reads as `DELAYED`). Opinionated on purpose.

## Features

| | |
|---|---|
| **Today** | One screen of everything that needs you now — overdue chores, todos due, today's events, payments coming up, outstanding shopping. A live count badges the nav. |
| **Daily digest** | A once-a-day email rounding up the household, with a swappable visual skin. Per-person opt-in. |
| **Household** | Create or join a household by invite code; all data is scoped to it. |
| **Chores** | Recurring chores with auto-rotation and assignment — "whose turn" solved. |
| **Grocery** | Shared list with categories, quantities, and check-off. |
| **Todos** | Tasks with due dates, priority, and assignment. |
| **Calendar** | Monthly view with color-coded events. |
| **Debts & payments** | Track debts and payment history, with **interest-aware balances** and a payoff simulator (avalanche / snowball). |

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, TypeScript |
| Backend | ASP.NET Core 9 minimal APIs, Entity Framework Core |
| Database | SQLite (zero-config; one file) |
| Auth | ASP.NET Identity + JWT |
| Email | Pluggable — dev file outbox or SMTP |

---

## Quick start

**Prerequisites:** [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0) · [Node.js 20+](https://nodejs.org/)

### 1. Backend

Create `backend/appsettings.Development.json` (gitignored) with a signing key:

```json
{
  "Jwt": { "Key": "your-secret-key-at-least-32-characters-long!!" }
}
```

Then run — migrations apply automatically on startup:

```bash
cd backend
dotnet run
```

API is on **`http://localhost:5063`**.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App is on **`http://localhost:3000`** (the backend's CORS expects this origin).

### 3. Log in

In development, a demo household **"The Nest"** is seeded automatically:

```
email:    admin@hdash.local     (or sam@hdash.local)
password: admin123
```

Delete `backend/app.db` any time to rebuild the demo from scratch.

---

## The daily digest

A background job assembles each household's day and emails it once daily. The pipeline is
cleanly separated so the **look is a swappable component**:

```
DigestService   → assembles the day (reuses the same rules as /api/today, interest-aware ledger)
IDigestRenderer → the "skin" — DeparturesDigestRenderer (default) or BaselineDigestRenderer
IEmailSender    → FileEmailSender (dev, writes .html, no credentials) or SmtpEmailSender
DigestScheduler → sends once daily at a configured hour
```

Try it without any email setup — it writes rendered emails to `backend/outbox/`:

- `GET  /api/digest/preview`   — render your household's digest as HTML
- `POST /api/digest/send-test` — send it to yourself right now
- `PUT  /api/digest/settings`  — opt in / out (`{ "digestOptIn": false }`)

Or use the in-app **Settings** page (Preview / Send me a test / toggle).

### Configuration (`appsettings.json`)

```jsonc
"Digest": {
  "Enabled": false,        // turn the daily scheduler on
  "Skin": "departures",    // "departures" | "baseline"
  "Hour": 6,               // local hour to send
  "SkipEmpty": true        // don't email a household with nothing to report
},
"Email": {
  "Provider": "file",      // "file" (dev outbox) | "smtp"
  "Smtp": { "Host": "", "Port": 587, "Username": "", "Password": "", "From": "", "FromName": "The Nest" }
}
```

Any SMTP works — a Gmail app password, Fastmail, or a Resend/Postmark SMTP bridge.

---

## Notable engineering

- **Authoritative debt math.** Balances accrue monthly interest server-side in `DebtCalculator` (the single source of truth, unit-tested) rather than being recomputed per-client — so the balance you see reflects real, growing debt, not just principal minus payments.
- **One place for household scoping.** `HouseholdScope` resolves "who can I see" once, instead of the rule being copy-pasted across every endpoint.
- **Skin-swappable digest.** Everything downstream of the assembled `HouseholdDigest` is style-agnostic; a new look is one `IDigestRenderer` and one line of config.

## Testing

```bash
dotnet test        # backend.Tests — DebtCalculator money-math + rules
```

## Deploy (Docker)

The whole app runs from one `docker-compose.yml` — a .NET backend, a Next.js
frontend, and a persisted SQLite volume. No managed database required, so it fits
comfortably on a ~€4/mo VPS or a Raspberry Pi.

```bash
cp .env.example .env
# edit .env — set JWT_KEY at minimum:  openssl rand -hex 32
docker compose up -d --build
```

Frontend on `:3000`, backend on `:5063`. The database, nightly backups, and (in
dev-file mode) sent digests all live on the `hdash-data` volume, so they survive
restarts and image rebuilds. Migrations apply automatically on startup.

**Key `.env` settings** (see `.env.example` for all):

| Variable | Description |
|---|---|
| `JWT_KEY` | **Required.** Signing secret, ≥32 chars (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_API_URL` | Browser-reachable backend URL (baked at build; rebuild if it changes) |
| `FRONTEND_ORIGIN` | Frontend origin, for CORS + digest links |
| `EMAIL_PROVIDER` / `SMTP_*` / `DIGEST_ENABLED` | Turn on real email + the daily digest |
| `BACKUP_ENABLED` | Nightly SQLite snapshots to the volume (on by default) |

> **Remote hosts:** `NEXT_PUBLIC_API_URL` is compiled into the frontend at build
> time, so set it to your host's backend URL and rebuild (`docker compose up -d --build`).
> For a single public domain, put a reverse proxy (Caddy/nginx) in front and route
> `/` to the frontend and the API to the backend.

Not using Docker? Each service also runs standalone (`dotnet publish -c Release`
for the backend; `npm run build && npm start` for the frontend).

## Project structure

```
hdash/
├── backend/
│   ├── Data/         # DbContext + demo seeder
│   ├── Endpoints/    # minimal API groups (auth, debts, today, digest, …)
│   ├── Services/     # DebtCalculator, HouseholdScope, Digest/, Email/
│   ├── Models/       # entities
│   └── Migrations/
├── backend.Tests/    # xUnit money-math tests
└── frontend/src/
    ├── app/          # pages (today, settings, debts, …) + components
    ├── lib/          # auth context, API client, debt math
    └── types/
```

## Roadmap

Built for a household you run yourself. Progress toward opening it to the public:

- [x] Email verification + password reset (Identity tokens, generic replies, no account enumeration)
- [x] Login rate-limiting / brute-force protection (per-IP, `Auth:RateLimit:PermitPerMinute`)
- [x] Per-user digest send-hour (each person picks their own delivery time)
- [x] Server-side token revocation (logout invalidates the JWT via a jti denylist)
- [x] Automated SQLite backups (`VACUUM INTO` snapshots on an interval, with rotation)

> Email verification is wired but **not enforced** by default — set `Auth:RequireConfirmedEmail=true` to require a confirmed address before sign-in.
> Backups are **off** by default — set `Backup:Enabled=true` in production.

> Status: `dev` is the active branch; feature work lands via PR.

---

<div align="center"><sub>Built with care for the people you live with.</sub></div>
