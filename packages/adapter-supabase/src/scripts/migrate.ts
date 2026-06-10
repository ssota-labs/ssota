import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "../db/client.js";

async function main() {
  const { db, client } = createDb();
  console.log("Applying migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
