-- Seed meta-action catalog for every existing project.
-- SSOT: packages/adapter-supabase/src/seed/meta-action-catalog.ts

INSERT INTO action_catalog (
  project_id, action_type, slug, label, scope, preconditions, effects,
  executor, allowed_lifecycle_transitions, failure_mode, idempotency_rule, log_payload_schema
)
SELECT
  p.id,
  t.action_type,
  t.slug,
  t.label,
  t.scope,
  t.preconditions,
  t.effects,
  t.executor::executor_type,
  t.allowed_lifecycle_transitions,
  t.failure_mode,
  t.idempotency_rule,
  t.log_payload_schema
FROM projects p
CROSS JOIN (
  VALUES
(
  'approve_gate',
  'approve_gate',
  'Approve Gate',
  '{"kind":"global"}'::jsonb,
  '{"requiredFields":["gateId","status"]}'::jsonb,
  '[{"kind":"update_gate","gateId":"","status":"approved"}]'::jsonb,
  'Human',
  '{}'::jsonb,
  'reject',
  NULL,
  '{}'::jsonb
),
(
  'define_node_type',
  'define_node_type',
  'Define Node Type',
  '{"kind":"global"}'::jsonb,
  '{"requiredFields":["definition"]}'::jsonb,
  '[{"kind":"upsert_node_catalog_entry","entry":{"nodeType":"","family":"document","archetypeId":"","typicalValueOverrides":{},"lifecycleTransitions":{"Draft":["Active","Archived"],"Active":["Archived","Draft"],"Archived":["Active"],"Deleted":[]},"contentGuide":null}}]'::jsonb,
  'Agent',
  '{}'::jsonb,
  'reject',
  NULL,
  '{}'::jsonb
),
(
  'update_node_type',
  'update_node_type',
  'Update Node Type',
  '{"kind":"global"}'::jsonb,
  '{"requiredFields":["nodeType","patch"]}'::jsonb,
  '[{"kind":"upsert_node_catalog_entry","entry":{"nodeType":"","family":"document","archetypeId":"","typicalValueOverrides":{},"lifecycleTransitions":{"Draft":["Active","Archived"],"Active":["Archived","Draft"],"Archived":["Active"],"Deleted":[]},"contentGuide":null}}]'::jsonb,
  'Agent',
  '{}'::jsonb,
  'reject',
  NULL,
  '{}'::jsonb
),
(
  'deprecate_node_type',
  'deprecate_node_type',
  'Deprecate Node Type',
  '{"kind":"global"}'::jsonb,
  '{"requiredFields":["nodeType"]}'::jsonb,
  '[{"kind":"deprecate_node_catalog_entry","nodeType":""}]'::jsonb,
  'Agent',
  '{}'::jsonb,
  'reject',
  NULL,
  '{}'::jsonb
),
(
  'define_edge_type',
  'define_edge_type',
  'Define Edge Type',
  '{"kind":"global"}'::jsonb,
  '{"requiredFields":["definition"]}'::jsonb,
  '[{"kind":"upsert_edge_catalog_entry","entry":{"edgeType":"","domain":[],"range":[],"cardinality":"","representation":""}}]'::jsonb,
  'Agent',
  '{}'::jsonb,
  'reject',
  NULL,
  '{}'::jsonb
),
(
  'define_property',
  'define_property',
  'Define Property',
  '{"kind":"global"}'::jsonb,
  '{"requiredFields":["definition"]}'::jsonb,
  '[{"kind":"upsert_property_catalog_entry","entry":{"propertyKey":"","valueType":"string","constraints":{},"owningActions":[]}}]'::jsonb,
  'Agent',
  '{}'::jsonb,
  'reject',
  NULL,
  '{}'::jsonb
),
(
  'define_action_contract',
  'define_action_contract',
  'Define Action Contract',
  '{"kind":"global"}'::jsonb,
  '{"requiredFields":["definition"]}'::jsonb,
  '[{"kind":"upsert_action_catalog_entry","entry":{"actionType":"","preconditions":{},"effects":[],"executor":"Agent","allowedLifecycleTransitions":{},"failureMode":"reject","idempotencyRule":null,"logPayloadSchema":{}}}]'::jsonb,
  'Agent',
  '{}'::jsonb,
  'reject',
  NULL,
  '{}'::jsonb
),
(
  'define_instruction',
  'define_instruction',
  'Define Instruction',
  '{"kind":"global"}'::jsonb,
  '{"requiredFields":["definition"]}'::jsonb,
  '[{"kind":"upsert_instruction_catalog_entry","entry":{"title":"","triggerPatterns":[],"applicableNodeTypes":[],"requiredActions":[],"optionalActions":[],"lifecycle":"Active","body":""}}]'::jsonb,
  'Agent',
  '{}'::jsonb,
  'reject',
  NULL,
  '{}'::jsonb
),
(
  'update_edge_type',
  'update_edge_type',
  'Update Edge Type',
  '{"kind":"global"}'::jsonb,
  '{"requiredFields":["edgeType","patch"]}'::jsonb,
  '[{"kind":"upsert_edge_catalog_entry","entry":{"edgeType":"","domain":[],"range":[],"cardinality":"","representation":""}}]'::jsonb,
  'Agent',
  '{}'::jsonb,
  'reject',
  NULL,
  '{}'::jsonb
),
(
  'deprecate_edge_type',
  'deprecate_edge_type',
  'Deprecate Edge Type',
  '{"kind":"global"}'::jsonb,
  '{"requiredFields":["edgeType"]}'::jsonb,
  '[{"kind":"deprecate_edge_catalog_entry","edgeType":""}]'::jsonb,
  'Agent',
  '{}'::jsonb,
  'reject',
  NULL,
  '{}'::jsonb
),
(
  'update_property',
  'update_property',
  'Update Property',
  '{"kind":"global"}'::jsonb,
  '{"requiredFields":["propertyKey","patch"]}'::jsonb,
  '[{"kind":"upsert_property_catalog_entry","entry":{"propertyKey":"","valueType":"string","constraints":{},"owningActions":[]}}]'::jsonb,
  'Agent',
  '{}'::jsonb,
  'reject',
  NULL,
  '{}'::jsonb
),
(
  'deprecate_property',
  'deprecate_property',
  'Deprecate Property',
  '{"kind":"global"}'::jsonb,
  '{"requiredFields":["propertyKey"]}'::jsonb,
  '[{"kind":"deprecate_property_catalog_entry","propertyKey":""}]'::jsonb,
  'Agent',
  '{}'::jsonb,
  'reject',
  NULL,
  '{}'::jsonb
),
(
  'update_property_permission',
  'update_property_permission',
  'Update Property Permission',
  '{"kind":"global"}'::jsonb,
  '{"requiredFields":["permission"]}'::jsonb,
  '[{"kind":"upsert_property_permission_entry","permission":{"actionType":"","nodeType":"","propertyKey":"","operation":"write","permissionType":"allow","requiresHumanGate":false,"status":"active"}}]'::jsonb,
  'Agent',
  '{}'::jsonb,
  'reject',
  NULL,
  '{}'::jsonb
),
(
  'update_action_contract',
  'update_action_contract',
  'Update Action Contract',
  '{"kind":"global"}'::jsonb,
  '{"requiredFields":["actionType","patch"]}'::jsonb,
  '[{"kind":"upsert_action_catalog_entry","entry":{"actionType":"","preconditions":{},"effects":[],"executor":"Agent","allowedLifecycleTransitions":{},"failureMode":"reject","idempotencyRule":null,"logPayloadSchema":{}}}]'::jsonb,
  'Agent',
  '{}'::jsonb,
  'reject',
  NULL,
  '{}'::jsonb
),
(
  'deprecate_action_contract',
  'deprecate_action_contract',
  'Deprecate Action Contract',
  '{"kind":"global"}'::jsonb,
  '{"requiredFields":["actionType"]}'::jsonb,
  '[{"kind":"deprecate_action_catalog_entry","actionType":""}]'::jsonb,
  'Agent',
  '{}'::jsonb,
  'reject',
  NULL,
  '{}'::jsonb
),
(
  'update_instruction',
  'update_instruction',
  'Update Instruction',
  '{"kind":"global"}'::jsonb,
  '{"requiredFields":["instructionId","patch"]}'::jsonb,
  '[{"kind":"upsert_instruction_catalog_entry","entry":{"instructionId":"","title":"","triggerPatterns":[],"applicableNodeTypes":[],"requiredActions":[],"optionalActions":[],"lifecycle":"Active","body":""}}]'::jsonb,
  'Agent',
  '{}'::jsonb,
  'reject',
  NULL,
  '{}'::jsonb
),
(
  'deprecate_instruction',
  'deprecate_instruction',
  'Deprecate Instruction',
  '{"kind":"global"}'::jsonb,
  '{"requiredFields":["instructionId"]}'::jsonb,
  '[{"kind":"deprecate_instruction_catalog_entry","instructionId":""}]'::jsonb,
  'Agent',
  '{}'::jsonb,
  'reject',
  NULL,
  '{}'::jsonb
)
) AS t(
  action_type, slug, label, scope, preconditions, effects, executor,
  allowed_lifecycle_transitions, failure_mode, idempotency_rule, log_payload_schema
)
ON CONFLICT (project_id, action_type) DO NOTHING;

-- Open existing meta actions to Agent (approve_gate stays Human).
UPDATE action_catalog
SET executor = 'Agent'
WHERE action_type IN (
  'define_node_type',
  'update_node_type',
  'deprecate_node_type',
  'define_edge_type',
  'update_edge_type',
  'deprecate_edge_type',
  'define_property',
  'update_property',
  'deprecate_property',
  'update_property_permission',
  'define_action_contract',
  'update_action_contract',
  'deprecate_action_contract',
  'define_instruction',
  'update_instruction',
  'deprecate_instruction'
)
AND executor <> 'Agent';
