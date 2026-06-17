# xo-nextjs

Next.js web client for the XO multiplayer game.

The app will use Next.js API routes as a small bridge between the browser UI and the `xo-grpc` backend.

## Requirements

- Node.js 24+
- npm
- Running `xo-grpc` backend for connected game flows

## Setup

```bash
npm ci
cp .env.example .env.local
```

Update `.env.local` if your backend is not running on the default target:

```bash
XO_GRPC_TARGET=localhost:50051
```

`XO_GRPC_TARGET` is server-only and is read by the Next.js API routes. Use a gRPC target in `host:port` format. Do not include `http://` or `https://`.

## Development

```bash
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run check
```

This runs the frontend proto contract check, linting, and a production build, matching the GitHub Actions CI workflow.

Run only the checked-in proto contract check:

```bash
npm run contract
```

This validates the frontend-facing contract surface from the local `proto/` files without cloning or starting the backend repo.

Run the local integration smoke test after starting the frontend and backend:

```bash
npm run smoke
```

The smoke test calls the Next.js API routes for health, create, join, move, state fetch, and realtime events. It expects the frontend at `http://127.0.0.1:3000` by default. Override that with `SMOKE_BASE_URL` if needed:

```bash
SMOKE_BASE_URL=http://127.0.0.1:3001 npm run smoke
```

## Runtime Configuration

```text
XO_GRPC_TARGET=localhost:50051
```

Development defaults to `localhost:50051` if `XO_GRPC_TARGET` is omitted. Production requires it so the deployed web server does not accidentally try to call a local backend.

Example production values:

```text
XO_GRPC_TARGET=xo-grpc.internal:50051
XO_GRPC_TARGET=api.example.com:50051
```

## Production Run

Build and start the web server with the backend target available in the server environment:

```bash
npm ci
XO_GRPC_TARGET=localhost:50051 npm run build
XO_GRPC_TARGET=localhost:50051 npm run start
```

Then verify the running production server:

```bash
SMOKE_BASE_URL=http://127.0.0.1:3000 npm run smoke
```

Deployment checklist:

- `XO_GRPC_TARGET` is set on the deployed Next.js server.
- The Next.js server can reach the `xo-grpc` backend over gRPC.
- The backend has Postgres migrations applied.
- The deployment serves the Next.js HTTP app and keeps API routes on the Node.js runtime.

## CI/CD

GitHub Actions stays scoped to this frontend repo:

- `CI` runs on pull requests and pushes to `main`.
- `CI` runs `npm run check`, which validates the local proto contract, lints, and builds.
- `Production Artifact` runs on pushes to `main` and manually through `workflow_dispatch`.
- `Production Artifact` builds a standalone Next.js bundle and uploads `xo-nextjs-production.tar.gz`.

The workflows do not clone or start the backend repo. End-to-end verification that requires a live backend remains the local/manual `npm run smoke` check.

## Project Shape

```text
src/app
  App Router pages and global styles
src/components
  Small UI components for the lobby and game room
src/lib
  Shared frontend types and helpers
public/fonts
  Comico web font
```

## API Routes

```text
GET  /api/health
POST /api/lobby/create
POST /api/lobby/join
GET  /api/games/[gameId]?playerToken=...
GET  /api/games/[gameId]/events?playerToken=...&afterVersion=...
POST /api/games/[gameId]/moves
```

These routes run on the Next.js server and call the `xo-grpc` backend using the protobuf contract in `proto/xo/v1`.
