-- Instruction external content (Node-unified contentUrl + stable instructionKey)

ALTER TABLE instructions
  ADD COLUMN instruction_key text,
  ADD COLUMN content_url text;

ALTER TABLE instructions
  ALTER COLUMN body DROP NOT NULL;

CREATE UNIQUE INDEX instructions_project_instruction_key_unique
  ON instructions (project_id, instruction_key)
  WHERE instruction_key IS NOT NULL;
