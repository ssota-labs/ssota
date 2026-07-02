#!/usr/bin/env node

import { runToolcraftCli } from "../src/cli.mjs";

await runToolcraftCli(["create", ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: process.env,
});
