-- 에이전트 런 실행 트랜스크립트(agent_run_messages) + 로그 목록 인덱스.
-- 툴 디스패치 step이 incremental로 기록하고, finalize에서 canonical 전체
-- 트랜스크립트로 교체한다. parts는 chat_messages.parts와 동일한 AI SDK
-- UIMessage part 컨벤션. RLS는 전 테이블 deny-all 정책을 따른다 [SEC-01].

create table if not exists "public"."agent_run_messages" (
  "id" uuid primary key default gen_random_uuid(),
  "run_id" uuid not null references "public"."agent_runs"("id") on delete cascade,
  "seq" bigint generated always as identity,
  "role" text not null,
  "parts" jsonb not null default '[]'::jsonb,
  "tool_call_id" text,
  "created_at" timestamptz not null default now()
);

alter table "public"."agent_run_messages" enable row level security;

create index if not exists "agent_run_messages_run_id_seq_idx"
  on "public"."agent_run_messages" ("run_id", "seq");

create unique index if not exists "agent_run_messages_run_tool_call_unique"
  on "public"."agent_run_messages" ("run_id", "tool_call_id")
  where tool_call_id is not null;

-- 에이전트별 런 로그 목록(최근순) 조회용
create index if not exists "agent_runs_teamspace_agent_started_idx"
  on "public"."agent_runs" ("teamspace_id", "agent_definition_id", "started_at" desc);
