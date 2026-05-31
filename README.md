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
