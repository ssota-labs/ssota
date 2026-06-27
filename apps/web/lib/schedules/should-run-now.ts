import { Cron } from "croner";

export interface ShouldRunResult {
  /** True if a scheduled fire falls within the current tick window. */
  run: boolean;
  /** The fire time that triggered this tick (for dedupe), or null. */
  fire: Date | null;
}

/**
 * Gate for the cron heartbeat. The heartbeat ticks every `tickMs` (≈1 min) in
 * UTC; for each schedule we ask croner — in the schedule's own timezone — for
 * the first scheduled fire at/after `now - tickMs - buffer`. If that fire is
 * already at/before `now`, the schedule fired within the current tick and is
 * due. Everything outside the schedule's window/days produces a fire in the
 * future, so the agent is never invoked there — that is the token gate.
 *
 * croner's `previousRun()` only works for a live, running job, so we derive the
 * due check from `nextRun(windowStart)` instead.
 *
 * `fire` is returned so the caller can dedupe: only start a run if no agent_run
 * already exists for this schedule at/after `fire`.
 */
export function shouldRunNow(
  cronExpression: string,
  timezone: string,
  now: Date,
  tickMs: number,
  bufferMs = 60_000,
): ShouldRunResult {
  try {
    const job = new Cron(cronExpression, { timezone });
    const windowStart = new Date(now.getTime() - tickMs - bufferMs);
    const fire = job.nextRun(windowStart);
    if (!fire) return { run: false, fire: null };
    return { run: fire.getTime() <= now.getTime(), fire };
  } catch {
    // Unparseable expression — skip this schedule, never throw (one bad row
    // must not break the whole heartbeat sweep).
    return { run: false, fire: null };
  }
}
