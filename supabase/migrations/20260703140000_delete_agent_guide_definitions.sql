-- Reference-only agent guides are removed from the code registry; drop any legacy rows.
DELETE FROM agent_definitions
WHERE id IN (
  'a0000000-0000-4000-8000-000000000020',
  'a0000000-0000-4000-8000-000000000021',
  'a0000000-0000-4000-8000-000000000022',
  'a0000000-0000-4000-8000-000000000023'
);
