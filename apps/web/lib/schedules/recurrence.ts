import { Cron } from "croner";

/**
 * Recurrence is the visual-builder shape (Notion-style "On a schedule"). It is
 * the source the UI edits; on save it is compiled to a 5-field cron expression
 * (+ a separate timezone) which is what `schedules` actually stores. The cron
 * expression is the single source of truth at runtime — Recurrence is just an
 * editing convenience, recoverable via `cronToRecurrence` for the shapes the
 * builder produces.
 */
export type Frequency = "minute" | "hour" | "day" | "week";

export interface Recurrence {
  frequency: Frequency;
  /** Every N {frequency}. */
  interval: number;
  /** 0=Sun … 6=Sat. Used by "week" mode and as a day filter for others. */
  daysOfWeek?: number[];
  /** Fire time for hour/day/week modes. */
  atHour: number;
  atMinute: number;
  /**
   * Hour-of-day window (token gate) for minute/hour modes — e.g. 9..14 means
   * "only between 09:00 and 14:59". Encoded into the cron hour field.
   */
  windowStartHour?: number;
  windowEndHour?: number;
  /** IANA timezone the expression is evaluated in. */
  timezone: string;
}

export const DEFAULT_TIMEZONE = "Asia/Seoul";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function clampInt(value: number, min: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.floor(value)) : fallback;
}

function dowField(days?: number[]): string {
  if (!days || days.length === 0 || days.length === 7) return "*";
  return [...new Set(days)].sort((a, b) => a - b).join(",");
}

function hourWindowField(start?: number, end?: number): string {
  if (start == null || end == null) return "*";
  if (start === end) return String(start);
  if (start < end) return `${start}-${end}`;
  // Inverted window (e.g. 22..2) — cron can't span midnight in one range, so
  // express as two ranges.
  return `${start}-23,0-${end}`;
}

/** Compile a Recurrence into a 5-field cron expression (minute hour dom month dow). */
export function recurrenceToCron(r: Recurrence): string {
  const interval = clampInt(r.interval, 1, 1);
  const minute = clampInt(r.atMinute, 0, 0);
  const hour = clampInt(r.atHour, 0, 0);

  switch (r.frequency) {
    case "minute": {
      const min = interval === 1 ? "*" : `*/${interval}`;
      const hr = hourWindowField(r.windowStartHour, r.windowEndHour);
      return `${min} ${hr} * * ${dowField(r.daysOfWeek)}`;
    }
    case "hour": {
      const base = hourWindowField(r.windowStartHour, r.windowEndHour);
      const hr =
        interval === 1
          ? base
          : base === "*"
            ? `*/${interval}`
            : `${base}/${interval}`;
      return `${minute} ${hr} * * ${dowField(r.daysOfWeek)}`;
    }
    case "day": {
      const dom = interval === 1 ? "*" : `*/${interval}`;
      return `${minute} ${hour} ${dom} * *`;
    }
    case "week": {
      return `${minute} ${hour} * * ${dowField(r.daysOfWeek)}`;
    }
  }
}

function parseDays(field: string): number[] | undefined {
  if (field === "*") return undefined;
  const days = new Set<number>();
  for (const part of field.split(",")) {
    const range = part.match(/^(\d)-(\d)$/);
    if (range) {
      for (let d = Number(range[1]); d <= Number(range[2]); d++) days.add(d);
    } else if (/^\d$/.test(part)) {
      days.add(Number(part));
    } else {
      return undefined;
    }
  }
  return [...days].sort((a, b) => a - b);
}

function parseHourWindow(
  field: string,
): { start?: number; end?: number } | null {
  if (field === "*") return {};
  const range = field.match(/^(\d{1,2})-(\d{1,2})$/);
  if (range) return { start: Number(range[1]), end: Number(range[2]) };
  if (/^\d{1,2}$/.test(field)) return { start: Number(field), end: Number(field) };
  return null;
}

/**
 * Best-effort inverse of `recurrenceToCron` for the shapes the builder emits.
 * Returns null for expressions the visual builder can't represent (the dialog
 * then falls back to its raw-cron editing mode).
 */
export function cronToRecurrence(
  cron: string,
  timezone: string = DEFAULT_TIMEZONE,
): Recurrence | null {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [min, hr, dom, month, dow] = parts as [
    string,
    string,
    string,
    string,
    string,
  ];
  if (month !== "*") return null;

  const days = parseDays(dow);
  const base: Recurrence = {
    frequency: "day",
    interval: 1,
    atHour: 0,
    atMinute: 0,
    daysOfWeek: days,
    timezone,
  };

  // minute: */N or * in minute field, hour field is a window or *
  const minEvery = min.match(/^\*\/(\d+)$/);
  if ((min === "*" || minEvery) && !hr.includes("/")) {
    const window = parseHourWindow(hr);
    if (window) {
      return {
        ...base,
        frequency: "minute",
        interval: minEvery ? Number(minEvery[1]) : 1,
        windowStartHour: window.start,
        windowEndHour: window.end,
      };
    }
  }

  // hour: explicit minute, hour field has interval or window
  if (/^\d+$/.test(min)) {
    const hrEvery = hr.match(/^(?:(\d{1,2})-(\d{1,2})|\*)\/(\d+)$/);
    if (hrEvery) {
      return {
        ...base,
        frequency: "hour",
        interval: Number(hrEvery[3]),
        atMinute: Number(min),
        windowStartHour: hrEvery[1] ? Number(hrEvery[1]) : undefined,
        windowEndHour: hrEvery[2] ? Number(hrEvery[2]) : undefined,
      };
    }
    // day: dom interval, single hour
    if (/^\d+$/.test(hr) && dow === "*") {
      const domEvery = dom.match(/^\*\/(\d+)$/);
      if (dom === "*" || domEvery) {
        return {
          ...base,
          frequency: "day",
          interval: domEvery ? Number(domEvery[1]) : 1,
          atHour: Number(hr),
          atMinute: Number(min),
          daysOfWeek: undefined,
        };
      }
    }
    // week: single hour, specific days, dom=*
    if (/^\d+$/.test(hr) && dom === "*" && days) {
      return {
        ...base,
        frequency: "week",
        interval: 1,
        atHour: Number(hr),
        atMinute: Number(min),
        daysOfWeek: days,
      };
    }
  }

  return null;
}

/** True if `tz` is a valid IANA timezone (croner does not validate timezones). */
export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Validate a raw cron expression. Returns null if valid, else an error message. */
export function validateCron(cron: string, timezone?: string): string | null {
  const tz = timezone ?? DEFAULT_TIMEZONE;
  if (!isValidTimezone(tz)) return `Invalid timezone: ${tz}`;
  try {
    // Cron throws on an unparseable pattern (but not on a bad timezone).
    new Cron(cron, { timezone: tz });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid cron expression";
  }
}

/** Next fire time in the given timezone, or null if the expression never runs. */
export function nextOccurrence(
  cron: string,
  timezone: string = DEFAULT_TIMEZONE,
  from?: Date,
): Date | null {
  try {
    const job = new Cron(cron, { timezone });
    return job.nextRun(from) ?? null;
  } catch {
    return null;
  }
}

function formatTime(h: number, m: number): string {
  const hh = ((h + 11) % 12) + 1;
  const period = h < 12 ? "AM" : "PM";
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
}

function describeDays(days?: number[]): string {
  if (!days || days.length === 0 || days.length === 7) return "every day";
  if (
    days.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => days.includes(d))
  )
    return "weekdays";
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d])
    .join(", ");
}

/** Human-readable summary of a Recurrence, e.g. "Every 10 min, 9–14h, weekdays". */
export function describeRecurrence(r: Recurrence): string {
  const every = r.interval > 1 ? `${r.interval} ` : "";
  const window =
    r.windowStartHour != null && r.windowEndHour != null
      ? `, ${r.windowStartHour}–${r.windowEndHour}h`
      : "";
  switch (r.frequency) {
    case "minute":
      return `Every ${every}min${window}, ${describeDays(r.daysOfWeek)}`;
    case "hour":
      return `Every ${every}hour${window}, ${describeDays(r.daysOfWeek)}`;
    case "day":
      return `Every ${every}day at ${formatTime(r.atHour, r.atMinute)}`;
    case "week":
      return `Weekly on ${describeDays(r.daysOfWeek)} at ${formatTime(r.atHour, r.atMinute)}`;
  }
}
