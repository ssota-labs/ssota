# Contributing to SSOTA

Thanks for your interest in contributing! This document covers the essentials.

## License of contributions

SSOTA is **fair-code** (see [README](README.md), [LICENSE.md](LICENSE.md),
[LICENSE_EE.md](LICENSE_EE.md)). By submitting a contribution you agree that:

- changes to files **without** `.ee.` in their name are licensed under the
  **Sustainable Use License**; and
- changes to files **with** `.ee.` in their name (or under an `ee/` directory)
  are licensed under the **SSOTA Enterprise License**.

Please keep enterprise-only functionality in `.ee.` files so the open-core
boundary stays clean.

## Open-core boundary

The core must build and run with the OSS adapters and **no** Vercel/Supabase
account. Selection is via environment variables:

```
JOB_RUNNER=inline      AUTH=local      CREDENTIALS=own-app      STUDIO_BUILD_STORAGE=local
```

When adding a cloud integration, add it as an adapter behind the relevant
seam (`JobRunner`, `AuthProvider`, `CredentialProvider`, `StudioBuildStorage`)
and lazy-load it so the inline/local path never imports it. The `oss-build` CI
job typechecks the OSS path with no cloud env configured and must stay green.

## Development setup

Prerequisites: Node 24, pnpm 11, Docker.

```bash
pnpm install
docker compose up -d                  # Postgres + auto-applied migrations
cp .env.selfhost.example apps/web/.env
pnpm --filter "./packages/*" build
pnpm --filter web dev
```

See [docs/self-hosting.md](docs/self-hosting.md) for details.

## Before opening a PR

```bash
pnpm typecheck      # must be green across the workspace
pnpm lint
pnpm test
```

- Keep changes focused; match the style and comment density of surrounding code.
- Never commit secrets — use environment variables (`.env` is git-ignored;
  `*.env.example` files hold only public/demo values).
- For security issues, follow [SECURITY.md](SECURITY.md) instead of opening a
  public PR/issue.

## Architecture

See [docs/open-core-plan.md](docs/open-core-plan.md) for the open-core
architecture and the adapter seams.
