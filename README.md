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

## Production

Set via environment or `appsettings.Production.json`:

| Variable | Description |
|---|---|
| `Jwt__Key` | Signing secret, ≥32 chars (`openssl rand -hex 32`) |
| `ConnectionStrings__DefaultConnection` | e.g. `Data Source=/data/app.db` (mount a writable volume) |
| `Cors__AllowedOrigins` | Frontend origin, e.g. `https://home.example.com` |
| `Email__*`, `Digest__Enabled` | Turn on real email + the daily scheduler |

Publish and reverse-proxy behind nginx/Caddy:

```bash
cd backend  && dotnet publish -c Release -o /srv/hdash-api
cd frontend && npm run build && npm start
```

Because it's SQLite + one .NET process + Next.js, the whole thing runs comfortably on a
~€4/mo VPS or a Raspberry Pi — no managed database required.

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
- [ ] Login rate-limiting / brute-force protection
- [ ] Per-user digest send-hour (opt-in exists; hour is currently global)
- [ ] Real token revocation (logout is currently client-side only)
- [ ] Automated backups for the SQLite volume

> Email verification is wired but **not enforced** by default — set `Auth:RequireConfirmedEmail=true` to require a confirmed address before sign-in.

> Status: `dev` is the active branch; feature work lands via PR.

---

<div align="center"><sub>Built with care for the people you live with.</sub></div>
