-- Action 감사 기록 — runAction 커밋과 같은 트랜잭션에서 INSERT (ADR-runtime-ontology-with-closed-edit-vocabulary)
-- 편집과 감사는 둘 다 있거나 둘 다 없다. (teamspace_id, idempotency_key)가 멱등 재호출의 근거.

create table if not exists "public"."action_audits" (
  "id" uuid primary key default gen_random_uuid(),
  "teamspace_id" uuid not null references "public"."teamspaces"("id") on delete cascade,
  "action_key" text not null,
  "actor_id" uuid,
  "actor_kind" text not null,
  "parameters" jsonb not null default '{}'::jsonb,
  "edits" jsonb not null,
  "result" jsonb not null,
  "idempotency_key" text,
  "created_at" timestamptz not null default now()
);

alter table "public"."action_audits" enable row level security;

create index if not exists "action_audits_teamspace_created_idx"
  on "public"."action_audits" ("teamspace_id", "created_at");

create unique index if not exists "action_audits_teamspace_idempotency_unique"
  on "public"."action_audits" ("teamspace_id", "idempotency_key")
  where idempotency_key is not null;
