The repo has 2 parts:

- `server/` — Express API (code already included)
- `client/` — Frontend (code already included)

## Requirements

- [Node.js](https://nodejs.org/) >= 18
- npm (comes with Node.js)

## 1. Run the client

```bash
cd client
npm install
npm run dev
```

## 2. Configure the server's database connection

Copy `server/.env.example` to `server/.env` and set `MONGO_URI` to a real
MongoDB connection string (the server won't start without it):

```bash
cd server
cp .env.example .env
# then edit .env and set MONGO_URI
```

## 3. Run the Express server

```bash
cd server
npm install
npm run dev
```

- `npm run dev` — runs via `nodemon`, auto-restarts on code changes (use during development)
- `npm start` — runs via `node`, no auto-restart (use for production)

Once running, the server listens at `http://localhost:4100` (can be changed via the `PORT` environment variable):

- API: `http://localhost:4100/api/...`
- Health check: `http://localhost:4100/health`
- Swagger docs: `http://localhost:4100/api-docs`

The client dev server proxies `/login`, `/logout`, and `/api` requests to the backend (see `server.proxy` in `client/vite.config.ts`), so both the `server` and `client` dev servers need to be running together for the app to work end to end.

## Demo accounts

Two accounts are seeded automatically for logging in:

| Username | Password | Role |
| --- | --- | --- |
| `admin` | `123456` | admin |
| `employee1` | `123456` | employee |

## Folder structure

```
study/
├── client/    # Frontend (React + TypeScript)
└── server/    # Express API
    └── src/
        ├── server.js       # Entry point
        ├── swagger.js      # Swagger configuration
        ├── routes/         # Routes (auth, hello, me...)
        ├── middleware/      # Middleware (auth...)
        ├── store/          # Token store + MongoDB connection (mongoClient.js, seed.js)
        └── data/           # employees.js, attendance.js, leaveRequests.js, settings.js,
                             # payroll.js — all backed by MongoDB collections
```

## Notes

- `node_modules` for both `client` and `server` are excluded via `.gitignore` — after every clone/pull, run `npm install` again in each folder.
- Data lives in MongoDB, not a local file. On first connect to an empty
  database, the server automatically seeds the two demo accounts and
  default settings (see `server/src/store/seed.js`).
