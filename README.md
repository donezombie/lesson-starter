The repo has 2 parts:

- `server/` — Express API (code already included)
- `client/` — Frontend (you need to create it yourself, see instructions below)

## Requirements

- [Node.js](https://nodejs.org/) >= 18
- npm (comes with Node.js)

## 1. Create the `client` folder

If this is your first time cloning the repo, the `client/` folder won't have a frontend project inside yet. Create one with Vite (React + TypeScript):

```bash
# run from the repo root
npm create vite@latest client -- --template react-ts
cd client
npm install
```

> If `client/` already exists (empty), the command above still works — Vite will scaffold the project into that same folder.

Run the client's dev server:

```bash
npm run dev
```

## 2. Run the Express server

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

## Folder structure

```
study/
├── client/    # Frontend (create it following the instructions above)
└── server/    # Express API
    └── src/
        ├── server.js       # Entry point
        ├── swagger.js      # Swagger configuration
        ├── routes/         # Routes (auth, hello, me...)
        ├── middleware/      # Middleware (auth...)
        ├── store/          # Token store
        └── data/           # Sample data (users...)
```

## Notes

- `node_modules` for both `client` and `server` are excluded via `.gitignore` — after every clone/pull, run `npm install` again in each folder.
