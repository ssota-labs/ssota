-- Rename instruction catalog storage to workflows; workflow spec is SSOT in spec jsonb.

ALTER TABLE instructions RENAME TO workflows;

ALTER INDEX IF EXISTS instructions_project_slug_unique
  RENAME TO workflows_project_slug_unique;

ALTER INDEX IF EXISTS instructions_project_instruction_key_unique
  RENAME TO workflows_project_workflow_key_unique;

ALTER TABLE workflows RENAME COLUMN instruction_key TO workflow_key;

ALTER TABLE impact_queue RENAME COLUMN instruction_id TO workflow_id;

ALTER TABLE workflows ADD COLUMN IF NOT EXISTS spec jsonb;

ALTER TABLE workflows ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

-- Backfill workflow spec from legacy flattened columns.
UPDATE workflows
SET spec = jsonb_strip_nulls(
  jsonb_build_object(
    'title', title,
    'workflowKey', workflow_key,
    'lifecycle', lifecycle,
    'scope', scope,
    'trigger', jsonb_build_object(
      'patterns', COALESCE(trigger_patterns, '[]'::jsonb),
      'events', COALESCE(triggers, '[]'::jsonb)
    ),
    'context', jsonb_build_object(
      'queries', '[]'::jsonb,
      'traversals', '[]'::jsonb,
      'assertions', '[]'::jsonb
    ),
    'conditions', '[]'::jsonb,
    'gates', '[]'::jsonb,
    'routes', '[]'::jsonb,
    'references',
      CASE
        WHEN body IS NOT NULL AND content_url IS NOT NULL THEN jsonb_build_array(
          jsonb_build_object(
            'id', 'agent_body',
            'title', 'Agent notes',
            'kind', 'inline',
            'body', body
          ),
          jsonb_build_object(
            'id', 'runbook',
            'title', 'External runbook',
            'kind', 'url',
            'url', content_url
          )
        )
        WHEN body IS NOT NULL THEN jsonb_build_array(
          jsonb_build_object(
            'id', 'agent_body',
            'title', 'Agent notes',
            'kind', 'inline',
            'body', body
          )
        )
        WHEN content_url IS NOT NULL THEN jsonb_build_array(
          jsonb_build_object(
            'id', 'runbook',
            'title', 'External runbook',
            'kind', 'url',
            'url', content_url
          )
        )
        ELSE '[]'::jsonb
      END,
    'steps',
      CASE
        WHEN jsonb_array_length(COALESCE(workflow_steps, '[]'::jsonb)) > 0 THEN (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_strip_nulls(
                jsonb_build_object(
                  'id', step.value ->> 'id',
                  'title', step.value ->> 'title',
                  'description', step.value ->> 'description',
                  'mode', 'agentic',
                  'actions', (
                    SELECT COALESCE(
                      jsonb_agg(
                        jsonb_build_object(
                          'actionType', action_ref.value #>> '{}',
                          'required', false
                        )
                      ),
                      '[]'::jsonb
                    )
                    FROM jsonb_array_elements(
                      COALESCE(step.value -> 'actionRefs', '[]'::jsonb)
                    ) AS action_ref
                  ),
                  'referenceIds', '[]'::jsonb,
                  'gate',
                    CASE
                      WHEN COALESCE((step.value ->> 'gate')::boolean, false) THEN jsonb_build_object(
                        'id', (step.value ->> 'id') || '_gate',
                        'policy', COALESCE(gate_policy, '{}'::jsonb),
                        'required', true
                      )
                      ELSE NULL
                    END,
                  'output', step.value ->> 'output'
                )
              )
            ),
            '[]'::jsonb
          )
          FROM jsonb_array_elements(workflow_steps) AS step
        )
        ELSE jsonb_build_array(
          jsonb_build_object(
            'id', 'execute',
            'title', title,
            'mode', 'agentic',
            'actions', (
              SELECT COALESCE(
                jsonb_agg(
                  jsonb_build_object(
                    'actionType', allowed_action.value #>> '{}',
                    'required', false
                  )
                ),
                '[]'::jsonb
              )
              FROM jsonb_array_elements(COALESCE(allowed_actions, '[]'::jsonb)) AS allowed_action
            ),
            'referenceIds', '[]'::jsonb
          )
        )
      END,
    'output', jsonb_build_object(
      'contract', COALESCE(output_contract, '{}'::jsonb),
      'completionCriteria', completion_criteria
    ),
    'agentNotes', body,
    'applicableNodeTypes', COALESCE(applicable_node_types, '[]'::jsonb),
    'allowedActions', COALESCE(allowed_actions, '[]'::jsonb),
    'requiredActions', COALESCE(required_actions, '[]'::jsonb),
    'optionalActions', COALESCE(optional_actions, '[]'::jsonb)
  )
);

ALTER TABLE workflows ALTER COLUMN spec SET NOT NULL;

ALTER TABLE workflows
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS trigger_patterns,
  DROP COLUMN IF EXISTS applicable_node_types,
  DROP COLUMN IF EXISTS required_actions,
  DROP COLUMN IF EXISTS optional_actions,
  DROP COLUMN IF EXISTS body,
  DROP COLUMN IF EXISTS content_url,
  DROP COLUMN IF EXISTS triggers,
  DROP COLUMN IF EXISTS workflow_steps,
  DROP COLUMN IF EXISTS allowed_actions,
  DROP COLUMN IF EXISTS output_contract,
  DROP COLUMN IF EXISTS gate_policy,
  DROP COLUMN IF EXISTS completion_criteria;
