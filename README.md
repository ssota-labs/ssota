# SSOTA

SSOTA is an open-core automation platform. The core is **self-hostable** and runs
on any Postgres; a managed cloud offering adds durable execution, managed OAuth
connectors, multi-tenancy, and other operational features.

See [docs/open-core-plan.md](docs/open-core-plan.md) for the open-core architecture
and self-hosting roadmap.

## License

SSOTA is **fair-code** distributed software — source-available, but **not**
OSI-approved open source.

- Everything **except** files containing `.ee.` in their name and content under
  `ee/` directories is licensed under the **Sustainable Use License**
  ([LICENSE.md](LICENSE.md)). You may self-host and modify it for your own
  internal business purposes or non-commercial use, and redistribute it free of
  charge for non-commercial purposes.
- Files containing `.ee.` and content under `ee/` directories are licensed under
  the **SSOTA Enterprise License** ([LICENSE_EE.md](LICENSE_EE.md)) and require a
  valid commercial agreement.

This mirrors the licensing model used by [n8n](https://docs.n8n.io/sustainable-use-license/).

## Self-hosting

The core runs without any Vercel or Supabase account. Set the adapter selection
env vars (see [docs/open-core-plan.md](docs/open-core-plan.md)) to run fully
locally:

```
JOB_RUNNER=inline      # durable execution disabled, runs in-process
AUTH=local             # single-user / Auth.js
CREDENTIALS=own-app    # register your own OAuth apps per connector
STORAGE=local          # filesystem storage
```
