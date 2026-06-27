-- Precomputed next fire time so the heartbeat selects only due schedules
-- instead of scanning every enabled row each minute.
--
-- Existing enabled rows are left NULL; the heartbeat's repair pass computes
-- their next_run_at on the first tick (scheduling forward, without firing).
alter table schedules
  add column if not exists next_run_at timestamptz;

create index if not exists schedules_next_run_at_idx
  on schedules (next_run_at)
  where enabled;
