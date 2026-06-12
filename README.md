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

This runs linting and a production build, matching the GitHub Actions CI workflow.

Run the local integration smoke test after starting the frontend and backend:

```bash
npm run smoke
```

The smoke test calls the Next.js API routes for create, join, move, state fetch, and realtime events. It expects the frontend at `http://127.0.0.1:3000` by default. Override that with `SMOKE_BASE_URL` if needed:

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
POST /api/lobby/create
POST /api/lobby/join
GET  /api/games/[gameId]?playerToken=...
GET  /api/games/[gameId]/events?playerToken=...&afterVersion=...
POST /api/games/[gameId]/moves
```

These routes run on the Next.js server and call the `xo-grpc` backend using the protobuf contract in `proto/xo/v1`.
