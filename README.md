# HDASH

Household dashboard for managing shared living. Track groceries, todos, chores, calendar events, debts, and payments — solo or with your housemates.

## Features

- **Dashboard** — overview of pending tasks, upcoming events, debt stats, and items needing attention
- **Household** — create or join a household to share data with housemates
- **Grocery list** — shared grocery list with categories, quantities, and check-off
- **Todos** — task tracking with due dates and completion status
- **Chores** — recurring chores with rotation and assignment
- **Calendar** — monthly view with color-coded events
- **Debts & Payments** — track debts, due days, and payment history

## Tech Stack

| Layer    | Tech                                                  |
| -------- | ----------------------------------------------------- |
| Frontend | Next.js 16, React 19, Tailwind CSS 4, TypeScript      |
| Backend  | ASP.NET Core 9 (minimal APIs), Entity Framework Core  |
| Database | SQLite                                                |
| Auth     | ASP.NET Identity + JWT                                |

## Getting Started

### Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Node.js 20+](https://nodejs.org/)

### Backend

1. Create `backend/appsettings.Development.json` (gitignored) with your JWT secret:

```json
{
  "Jwt": {
    "Key": "your-secret-key-minimum-32-characters-long!!"
  }
}
```

2. Apply migrations and run:

```bash
cd backend
dotnet ef database update
dotnet run
```

The API starts on `http://localhost:5062` by default.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app starts on `http://localhost:3000`.

## Production Configuration

Set the following environment variables (or use `appsettings.Production.json`):

| Variable | Description | Example |
|---|---|---|
| `Jwt__Key` | JWT signing secret (min 32 chars) | `openssl rand -hex 32` |
| `ConnectionStrings__DefaultConnection` | SQLite path | `Data Source=/data/app.db` |
| `Cors__AllowedOrigins` | Frontend origin | `https://app.example.com` |

> The SQLite database file is gitignored. Mount it as a volume in Docker or ensure the path is writable.

## Deployment

### Docker Compose (recommended)

Both services have Dockerfiles. A `docker-compose.yml` is included that wires them together with a persistent data volume for the database.

```bash
# 1. Copy the env template and set your JWT secret
cp .env.example .env
# Edit .env and set JWT_SECRET to a random 32+ character string
# e.g. openssl rand -hex 32

# 2. Build and start
docker compose up --build

# App runs at http://localhost:3000
# API runs at http://localhost:8080
```

Migrations run automatically on first boot via EF Core. The SQLite database is stored in a named Docker volume (`hdash-data`) so it persists across container restarts.

### Production (VPS / cloud)

For a public deployment, update `NEXT_PUBLIC_API_URL` and `Cors__AllowedOrigins` to your real domains:

```bash
# .env
JWT_SECRET=<your-secret>

# docker-compose.yml overrides (or use a separate compose override file)
# backend: Cors__AllowedOrigins=https://app.example.com
# frontend: NEXT_PUBLIC_API_URL=https://api.example.com
```

Put nginx or Caddy in front for TLS termination.

## Project Structure

```
hdash/
├── backend/
│   ├── Data/           # DbContext and database config
│   ├── DTOs/           # Request/response records
│   ├── Endpoints/      # Minimal API endpoint groups
│   ├── Migrations/     # EF Core migrations
│   ├── Models/         # Entity models
│   └── Program.cs      # App entry point and middleware
└── frontend/
    └── src/
        ├── app/        # Next.js pages and components
        ├── lib/        # Auth context, API helpers
        └── types/      # TypeScript interfaces
```
