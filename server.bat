@echo off
setlocal

REM Optional build-time flags. Uncomment or set them before running this script.
REM These values are baked into the frontend during `pnpm run build`.
REM
REM Legal configuration:
REM Set this to TRUE only for a personal private self-hosted instance, a development/testing
REM fork intended to contribute back upstream, or a fork whose Terms of Service,
REM Privacy Policy, and Risuai service usage alerts have been configured correctly.
REM Builds without this flag show a legal warning screen and should not use Risuai
REM services that require the original legal notices.
REM if not defined VITE_RISU_LEGAL_CONFIGURED set "VITE_RISU_LEGAL_CONFIGURED=TRUE"

REM Lite mode:
REM Enables the experimental lightweight/mobile-oriented UI mode at build time.
REM if not defined VITE_RISU_LITE set "VITE_RISU_LITE=TRUE"

REM Advertisement configuration:
REM Optional Google AdSense client and slot IDs for desktop and mobile ad units.
REM if not defined VITE_AD_CLIENT set "VITE_AD_CLIENT="
REM if not defined VITE_AD_CLIENT_MOBILE set "VITE_AD_CLIENT_MOBILE="
REM if not defined VITE_AD_SLOT set "VITE_AD_SLOT="
REM if not defined VITE_AD_SLOT_MOBILE set "VITE_AD_SLOT_MOBILE="

call npm install -g pnpm@11.9.0
call pnpm install
call pnpm run build

REM Optional runtime flags. These can be overridden when invoking the script.
REM
REM Server runtime:
REM NODE_ENV selects production behavior for Node dependencies and middleware.
REM PORT controls which port the self-hosted server listens on.
REM if not defined NODE_ENV set "NODE_ENV=production"
REM if not defined PORT set "PORT=6001"

REM Reverse proxy support:
REM Enable this only when running behind a trusted reverse proxy such as
REM Nginx, Caddy, Cloudflare Tunnel, or a managed platform that forwards client IPs.
REM if not defined TRUST_PROXY set "TRUST_PROXY=1"

call pnpm run runserver
