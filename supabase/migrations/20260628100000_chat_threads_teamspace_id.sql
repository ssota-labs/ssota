-- chat_threads was omitted from teamspace_model migration.

ALTER TABLE chat_threads RENAME COLUMN project_id TO teamspace_id;

ALTER TABLE chat_threads DROP CONSTRAINT IF EXISTS chat_threads_project_id_fkey;
ALTER TABLE chat_threads ADD CONSTRAINT chat_threads_teamspace_id_fkey
  FOREIGN KEY (teamspace_id) REFERENCES teamspaces(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS chat_threads_project_account_id_idx;
CREATE INDEX chat_threads_teamspace_account_id_idx
  ON chat_threads (teamspace_id, account_id);
