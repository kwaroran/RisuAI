# RisuAI: Run as a Web App (Vite)

> Last updated: 2025-12-26

This document explains how to run **RisuAI in a browser** using the Vite dev server (Svelte + Vite). It’s meant to be a quick, reproducible reference.

## Prerequisites

- Node.js
- Package manager: **pnpm** (the repo uses `pnpm-lock.yaml`)

### If `pnpm` is not found (common on Windows)

Pick one:

- **Option A: Install pnpm via npm**
  - `npm install -g pnpm@9`
  - Ensure your PATH contains:
    - `C:\Users\<your-user>\AppData\Roaming\npm`

- **Option B: Add npm global bin to PATH for the current PowerShell session**
  - `$env:Path += ";C:\Users\<your-user>\AppData\Roaming\npm"`

> Tip: For a permanent fix, add the folder above to your Windows Environment Variables → `Path`.

## Install dependencies

From the repo root (where `package.json` is):

- `pnpm install`

> First install can take a few minutes. If you see an optional dependency install failing (e.g. `canvas`), it usually does **not** block the web dev server.

## Run dev server (Development)

From the repo root:

- `pnpm dev -- --host`

Then open the URL printed by Vite, e.g.:

- Local: `http://localhost:5174/`
- Network: Vite will also print LAN URLs you can use from a phone / another PC.

### Stop the server

Press `Ctrl + C` in the terminal running Vite.

## Production-like verification (Build + Preview)

If you want a closer-to-production run:

1. `pnpm build`
2. `pnpm preview -- --host`

`preview` serves the built `dist/` output.

## FAQ

### Why is the port not 5173/5174?

Vite will pick the next available port if the default is already in use. Always trust the URL shown in the terminal.

### I can’t access it from my phone

Check:

- You started with `pnpm dev -- --host`
- Windows firewall allows Node/Vite to listen on the network
- Both devices are on the same LAN/subnet

## References

- `package.json` scripts: `dev`, `build`, `preview`
- Frontend stack: Svelte 5 + Vite
