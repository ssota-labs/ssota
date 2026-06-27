-- Add per-schedule timezone. The cron heartbeat ticks in UTC, but each
-- schedule's cron_expression (window hours / days) is interpreted in this zone.
alter table schedules
  add column if not exists timezone text not null default 'Asia/Seoul';
