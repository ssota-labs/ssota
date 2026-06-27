-- Agent scheduler heartbeat.
--
-- A single pg_cron job ticks every minute and POSTs to /api/agent/cron, which
-- fans out to every enabled row in `schedules`, evaluating each schedule's
-- cron_expression (in its own timezone) to decide whether to actually run the
-- agent. This keeps cron-job count at 1 regardless of how many user schedules
-- exist, and the per-schedule window gates token spend.
--
-- The target URL and bearer secret are environment-specific, so they are NOT
-- hardcoded here — they are read from Supabase Vault at call time. Each
-- environment must seed two secrets before the heartbeat can fire (see runbook):
--   - agent_cron_url    = https://<deploy-domain>/api/agent/cron
--   - agent_cron_secret = same value as Vercel CRON_SECRET / AGENT_RUN_SECRET

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Re-runnable: drop any prior definition before (re)scheduling.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'agent-cron-heartbeat') then
    perform cron.unschedule('agent-cron-heartbeat');
  end if;
end;
$$;

select cron.schedule(
  'agent-cron-heartbeat',
  '* * * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret from vault.decrypted_secrets
      where name = 'agent_cron_url'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'agent_cron_secret'
      )
    ),
    body := '{}'::jsonb
  )
  where exists (
    select 1 from vault.decrypted_secrets where name = 'agent_cron_url'
  );
  $$
);
