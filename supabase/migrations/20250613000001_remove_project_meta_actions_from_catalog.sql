-- Meta actions live in core built-in registry (packages/core/src/catalog/builtin-meta-actions.ts).
-- Remove legacy per-project duplicates from action_catalog.

DELETE FROM action_catalog
WHERE action_type IN (
  'approve_gate',
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
);
