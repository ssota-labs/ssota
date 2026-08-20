-- action_catalog — L2 선언적 액션 타입(ActionType)의 저장 행 (ADR-runtime-ontology-with-closed-edit-vocabulary, ADR-aip-console-concepts B).
-- L1 node_catalog/edge_catalog와 같이 org-scoped, (organization_id, key) unique.
-- 정의(parameters·writes·requires·criteria·gate·edits·aggregateRootParam)는 `definition` jsonb에 ActionType 그대로 둔다 —
-- 검증은 contracts actionTypeSchema가 쓰기 경로에서 한다.

create table if not exists "public"."action_catalog" (
  "id" uuid primary key default gen_random_uuid(),
  "organization_id" uuid not null references "public"."organizations"("id") on delete cascade,
  "key" text not null,
  "label" text not null,
  "description" text not null default '',
  "definition" jsonb not null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

alter table "public"."action_catalog" enable row level security;

create unique index if not exists "action_catalog_organization_key_unique"
  on "public"."action_catalog" ("organization_id", "key");

create index if not exists "action_catalog_organization_id_idx"
  on "public"."action_catalog" ("organization_id");
