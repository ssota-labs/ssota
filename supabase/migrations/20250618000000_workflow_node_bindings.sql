-- Backfill workflow spec.nodeBindings from legacy applicableNodeTypes.

UPDATE workflows
SET spec = jsonb_set(
  spec,
  '{nodeBindings}',
  COALESCE(
    NULLIF(spec->'nodeBindings', 'null'::jsonb),
    (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'nodeType', node_type.value,
            'disabledActions', '[]'::jsonb
          )
        ),
        '[]'::jsonb
      )
      FROM jsonb_array_elements_text(
        COALESCE(spec->'applicableNodeTypes', '[]'::jsonb)
      ) AS node_type(value)
    )
  )
)
WHERE spec->'nodeBindings' IS NULL
   OR jsonb_typeof(spec->'nodeBindings') <> 'array'
   OR jsonb_array_length(COALESCE(spec->'nodeBindings', '[]'::jsonb)) = 0;
