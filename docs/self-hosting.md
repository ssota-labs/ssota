# Self-hosting SSOTA

The SSOTA core (Sustainable Use License) runs entirely on your own machine with
no Vercel or Supabase account. It uses only standard Postgres plus the OSS
adapters: in-process agent runs, single-user auth, env-token connectors, and
filesystem (or S3) storage.

> Enterprise features (durable workflow execution, managed Connect OAuth,
> multi-user Supabase auth, etc.) live in `.ee.` files under the SSOTA
> Enterprise License and are **not** active in this mode.

## 1. Start Postgres

```bash
docker compose up -d
```

On first start this applies an `auth`-schema compatibility shim
(`docker/postgres/shim.sql`) and then every migration in `supabase/migrations`.
The shim exists because the migrations were authored for Supabase and reference
its `auth` schema / RLS; the app connects as the database owner and bypasses
RLS, so the policies only need to be creatable.

> If port `54322` is already in use (e.g. a running `supabase start` stack),
> stop that stack first or edit the published port in `docker-compose.yml`.

## 2. Configure env

```bash
cp .env.selfhost.example apps/web/.env
cp .env.selfhost.example apps/mcp/.env   # if running the MCP app
```

The defaults select the OSS adapters:

| Variable               | OSS default | Enterprise        |
| ---------------------- | ----------- | ----------------- |
| `JOB_RUNNER`           | `inline`    | `workflow`        |
| `AUTH`                 | `local`     | `supabase`        |
| `CREDENTIALS`          | `own-app`   | `connect`         |
| `STUDIO_BUILD_STORAGE` | `local`     | `supabase` / `s3` |

## 3. Install & run

```bash
pnpm install
pnpm --filter "./packages/*" build
pnpm --filter web dev
```

You are signed in as a single fixed user (`LOCAL_AUTH_USER_ID`) — there is no
login screen.

## Connectors (Slack, Notion, …)

In self-host mode you register **your own** OAuth app per connector and inject
its token:

```bash
CONNECTOR_SLACK_TOKEN=xoxb-...        # default install
CONNECTOR_SLACK_<INSTALLATION>_TOKEN=xoxb-...   # per-workspace override
```

`<INSTALLATION>` is the workspace/install id (uppercased, non-alphanumerics →
`_`). The managed, click-to-connect OAuth flow is an Enterprise (Connect)
feature.

## Storage on S3 / MinIO

Instead of the filesystem, point studio build artifacts at any S3-compatible
store (install the optional `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`):

```bash
STUDIO_BUILD_STORAGE=s3
S3_BUCKET=ssota
S3_ENDPOINT=http://127.0.0.1:9000   # MinIO / R2 (omit for AWS)
S3_FORCE_PATH_STYLE=1               # required for MinIO
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

## What you give up vs. cloud

- **No durable execution.** With `JOB_RUNNER=inline`, a server crash mid-run
  loses that run (no automatic retry/resume).
- **Single user.** `AUTH=local` is one fixed identity; for multi-user, plug in a
  real provider (e.g. Auth.js) by implementing `AuthProvider`.
- **Manual connector setup.** You register and maintain your own OAuth apps.

## Producing a fully Enterprise-free distribution

The canonical repo ships the `.ee.` files (dormant unless their env is set). To
build a distribution with no Enterprise code at all, remove `**/*.ee.ts` and the
`workflow` dependency, then keep `JOB_RUNNER=inline` / `AUTH=local`. The
`oss-build` CI job verifies the OSS adapters build and typecheck with no cloud
env configured.
