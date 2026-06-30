ALTER TABLE "tasks"
  ADD COLUMN IF NOT EXISTS "sandbox_environment_id" uuid;

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_teamspace_sandbox_environment_fk"
  FOREIGN KEY ("teamspace_id", "sandbox_environment_id")
  REFERENCES "sandbox_environments" ("teamspace_id", "id")
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "tasks_sandbox_environment_id_idx"
  ON "tasks" ("sandbox_environment_id")
  WHERE "sandbox_environment_id" IS NOT NULL;
