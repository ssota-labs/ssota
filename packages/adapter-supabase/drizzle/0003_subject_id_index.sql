-- Tenant partition lookup: node_type + properties.subject_id (see AGENTS.md)
CREATE INDEX IF NOT EXISTS "idx_nodes_node_type_subject_id"
  ON "nodes" ("node_type", ((properties->>'subject_id')));
