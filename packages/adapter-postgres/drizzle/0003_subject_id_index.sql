-- Optional lookup index for legacy graph rows that stored partition keys in properties.
CREATE INDEX IF NOT EXISTS "idx_nodes_node_type_subject_id"
  ON "nodes" ("node_type", ((properties->>'subject_id')));
