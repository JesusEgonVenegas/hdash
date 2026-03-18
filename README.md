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

### Docker

```bash
# Backend image
cd backend
dotnet publish -c Release -o out
# Then containerize with a .NET 9 runtime base image, mount /data as a volume

# Frontend image
cd frontend
npm run build
# Deploy the .next output with Next.js standalone or a Node runtime
```

### Quick start with a VPS

```bash
# Backend — publish and run as a service
cd backend && dotnet publish -c Release -o /srv/hdash-api
Jwt__Key="<secret>" dotnet /srv/hdash-api/backend.dll

# Frontend — build and run
cd frontend && npm run build && npm start
```

Use nginx or Caddy as a reverse proxy in front of both.

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
