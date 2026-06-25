import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { createEmulator } from "emulate";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seed = parseYaml(
  readFileSync(join(root, "emulate.config.yaml"), "utf8"),
);

const SERVICES = [
  ["github", 4001],
  ["google", 4002],
  ["slack", 4003],
  ["linear", 4012],
];

const emulators = await Promise.all(
  SERVICES.map(([service, port]) =>
    createEmulator({
      service,
      port,
      seed: seed[service],
    }),
  ),
);

for (const [service, port] of SERVICES) {
  console.log(`  ${String(service).padEnd(6)} http://localhost:${port}`);
}
console.log("\nPress Ctrl+C to stop.\n");

async function shutdown() {
  await Promise.all(emulators.map((emulator) => emulator.close()));
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
