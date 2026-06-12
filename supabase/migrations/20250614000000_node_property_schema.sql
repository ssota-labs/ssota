-- Node-local property_schema: migrate from property_refs + property_catalog, then hard-delete legacy tables/columns.

ALTER TABLE node_catalog
  ADD COLUMN IF NOT EXISTS property_schema jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Build property_schema from property_refs joined with property_catalog rows.
UPDATE node_catalog nc
SET property_schema = COALESCE(
  (
    SELECT jsonb_object_agg(
      ref_key,
      jsonb_strip_nulls(
        jsonb_build_object(
          'valueType', COALESCE(pc.value_type, 'string'),
          'constraints', COALESCE(pc.constraints, '{}'::jsonb),
          'required', false,
          'system', (ref_key = 'title')
        )
      )
    )
    FROM jsonb_array_elements_text(nc.property_refs) AS ref_key
    LEFT JOIN property_catalog pc
      ON pc.project_id = nc.project_id
     AND pc.property_key = ref_key
  ),
  '{}'::jsonb
);

-- Ensure system title on every node type.
UPDATE node_catalog
SET property_schema = property_schema || jsonb_build_object(
  'title',
  jsonb_build_object(
    'valueType', 'string',
    'constraints', jsonb_build_object('minLength', 1, 'maxLength', 500),
    'required', true,
    'system', true
  )
)
WHERE NOT (property_schema ? 'title');

ALTER TABLE node_catalog DROP COLUMN IF EXISTS property_refs;

DROP POLICY IF EXISTS deny_all ON property_catalog;
DROP TABLE IF EXISTS property_catalog;

-- Stub rows for graph builtins (FK target for action_property_permissions).
-- Runtime merge prefers core built-ins over these project rows.
INSERT INTO action_catalog (
  project_id,
  action_type,
  slug,
  label,
  scope,
  preconditions,
  effects,
  executor,
  allowed_lifecycle_transitions,
  failure_mode,
  idempotency_rule,
  log_payload_schema
)
SELECT
  p.id,
  v.action_type,
  v.slug,
  v.label,
  v.scope::jsonb,
  v.preconditions::jsonb,
  v.effects::jsonb,
  v.executor::executor_type,
  v.allowed_lifecycle_transitions::jsonb,
  v.failure_mode,
  v.idempotency_rule,
  v.log_payload_schema::jsonb
FROM projects p
CROSS JOIN (
  VALUES
    (
      'create_node',
      'create_node',
      'Create Node',
      '{"kind":"global"}',
      '{"requiredFields":["nodeType"]}',
      '[{"kind":"create_node","node":{"nodeType":"","lifecycleStatus":"Draft","properties":{},"content":null,"provenance":{}}}]',
      'Agent',
      '{}',
      'reject',
      NULL,
      '{}'
    ),
    (
      'update_node_properties',
      'update_node_properties',
      'Update Node Properties',
      '{"kind":"global"}',
      '{"requiredFields":["nodeId","properties"],"requiresExistingNode":true}',
      '[{"kind":"update_node","nodeId":"","patch":{"properties":{}}}]',
      'Agent',
      '{}',
      'reject',
      NULL,
      '{}'
    )
) AS v(
  action_type,
  slug,
  label,
  scope,
  preconditions,
  effects,
  executor,
  allowed_lifecycle_transitions,
  failure_mode,
  idempotency_rule,
  log_payload_schema
)
ON CONFLICT (project_id, action_type) DO NOTHING;

-- Remap property permissions to generic graph builtins (before deleting legacy actions).
UPDATE action_property_permissions
SET action_type = 'create_node'
WHERE action_type IN (
  'create_project',
  'create_task',
  'create_note',
  'create_document',
  'create_homepage_project',
  'create_design_brief',
  'create_page_section'
);

UPDATE action_property_permissions
SET action_type = 'update_node_properties'
WHERE action_type IN (
  'update_document',
  'update_project',
  'update_task'
);

-- Retire per-type create actions in favor of built-in create_node.
DELETE FROM action_catalog
WHERE action_type IN (
  'create_project',
  'create_task',
  'create_note',
  'create_document',
  'create_homepage_project',
  'create_design_brief',
  'create_page_section'
);

-- Instructions: replace create_* action refs with create_node in jsonb arrays.
UPDATE instructions
SET
  required_actions = (
    SELECT COALESCE(jsonb_agg(
      CASE
        WHEN elem #>> '{}' IN (
          'create_project', 'create_task', 'create_note', 'create_document',
          'create_homepage_project', 'create_design_brief', 'create_page_section'
        ) THEN to_jsonb('create_node'::text)
        ELSE elem
      END
    ), '[]'::jsonb)
    FROM jsonb_array_elements(required_actions) AS elem
  ),
  optional_actions = (
    SELECT COALESCE(jsonb_agg(
      CASE
        WHEN elem #>> '{}' IN (
          'create_project', 'create_task', 'create_note', 'create_document',
          'create_homepage_project', 'create_design_brief', 'create_page_section'
        ) THEN to_jsonb('create_node'::text)
        ELSE elem
      END
    ), '[]'::jsonb)
    FROM jsonb_array_elements(optional_actions) AS elem
  ),
  allowed_actions = (
    SELECT COALESCE(jsonb_agg(
      CASE
        WHEN elem #>> '{}' IN (
          'create_project', 'create_task', 'create_note', 'create_document',
          'create_homepage_project', 'create_design_brief', 'create_page_section'
        ) THEN to_jsonb('create_node'::text)
        ELSE elem
      END
    ), '[]'::jsonb)
    FROM jsonb_array_elements(allowed_actions) AS elem
  );

-- workflow_steps.actionRefs inside instructions.
UPDATE instructions
SET workflow_steps = (
  SELECT COALESCE(jsonb_agg(
    CASE
      WHEN step ? 'actionRefs' THEN
        step || jsonb_build_object(
          'actionRefs',
          (
            SELECT COALESCE(jsonb_agg(
              CASE
                WHEN ref #>> '{}' IN (
                  'create_project', 'create_task', 'create_note', 'create_document',
                  'create_homepage_project', 'create_design_brief', 'create_page_section'
                ) THEN to_jsonb('create_node'::text)
                ELSE ref
              END
            ), '[]'::jsonb)
            FROM jsonb_array_elements(step->'actionRefs') AS ref
          )
        )
      ELSE step
    END
  ), '[]'::jsonb)
  FROM jsonb_array_elements(workflow_steps) AS step
)
WHERE jsonb_array_length(workflow_steps) > 0;

-- node_catalog allowed_action_refs whitelist.
UPDATE node_catalog
SET allowed_action_refs = (
  SELECT COALESCE(jsonb_agg(
    CASE
      WHEN elem #>> '{}' IN (
        'create_homepage_project', 'create_design_brief', 'create_page_section'
      ) THEN to_jsonb('create_node'::text)
      ELSE elem
    END
  ), '[]'::jsonb)
  FROM jsonb_array_elements(allowed_action_refs) AS elem
)
WHERE jsonb_array_length(allowed_action_refs) > 0;
