-- Consolidate workflow spec applicable nodes:
-- - applicableNodeTypes: string[] | nodeBindings[] -> applicableNodeTypes: { nodeType, disabledActions }[]
-- - drop nodeBindings, requiredActions, optionalActions

UPDATE workflows
SET spec = (
  spec
  - 'nodeBindings'
  - 'requiredActions'
  - 'optionalActions'
) || jsonb_build_object(
  'applicableNodeTypes',
  COALESCE(
    NULLIF(
      CASE
        WHEN jsonb_typeof(spec->'nodeBindings') = 'array'
          AND jsonb_array_length(COALESCE(spec->'nodeBindings', '[]'::jsonb)) > 0
          THEN spec->'nodeBindings'
        WHEN jsonb_typeof(spec->'applicableNodeTypes') = 'array'
          AND jsonb_array_length(COALESCE(spec->'applicableNodeTypes', '[]'::jsonb)) > 0
          AND jsonb_typeof((spec->'applicableNodeTypes'->0)) = 'string'
          THEN (
            SELECT COALESCE(
              jsonb_agg(
                jsonb_build_object(
                  'nodeType', node_type.value,
                  'disabledActions', '[]'::jsonb
                )
              ),
              '[]'::jsonb
            )
            FROM jsonb_array_elements_text(spec->'applicableNodeTypes') AS node_type(value)
          )
        ELSE COALESCE(spec->'applicableNodeTypes', '[]'::jsonb)
      END,
      'null'::jsonb
    ),
    '[]'::jsonb
  )
);
