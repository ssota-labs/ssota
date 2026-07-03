export type PeriodRange = {
  start: Date;
  end: Date;
};

const QUARTER_END_MONTH: Record<number, number> = {
  1: 2,
  2: 5,
  3: 8,
  4: 11,
};

/** Parse preset strings like `Q2 2026` into an inclusive UTC date range. */
export function parsePeriodPreset(preset: string): PeriodRange | null {
  const match = /^Q([1-4])\s+(\d{4})$/i.exec(preset.trim());
  if (!match) return null;

  const quarter = Number(match[1]);
  const year = Number(match[2]);
  const endMonth = QUARTER_END_MONTH[quarter];
  if (!endMonth) return null;

  const startMonth = endMonth - 2;
  const start = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, endMonth + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

/** Returns true when `capturedAt` falls inside `range`, or when `range` is null. */
export function isCapturedAtInPeriod(
  capturedAt: string | undefined,
  range: PeriodRange | null,
): boolean {
  if (!range) return true;
  if (!capturedAt) return false;

  const date = new Date(capturedAt);
  if (Number.isNaN(date.getTime())) return false;

  return date >= range.start && date <= range.end;
}
