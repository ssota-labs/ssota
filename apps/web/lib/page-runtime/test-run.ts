/**
 * Test-run model for the `TestResults` catalog component. Domain-agnostic: a set
 * of suites, each holding test cases with a pass/fail/skip/run status, optional
 * duration, and (for failures) an error message + stack. A summary (counts +
 * total duration) is derived when not supplied.
 *
 * Mirrors the ai-sdk "test-results" element (summary header, progress bar,
 * collapsible suites, per-test status, error details).
 */

export type TestStatus = "passed" | "failed" | "skipped" | "running";

export type TestError = {
  message?: string;
  stack?: string;
};

export type TestCase = {
  name: string;
  status: TestStatus;
  duration?: number;
  error?: TestError;
};

export type TestSuite = {
  name: string;
  status: TestStatus;
  defaultOpen?: boolean;
  tests: TestCase[];
};

export type TestSummary = {
  passed: number;
  failed: number;
  skipped: number;
  running: number;
  total: number;
  duration?: number;
};

export type TestRun = {
  summary: TestSummary;
  suites: TestSuite[];
};

const STATUSES: readonly TestStatus[] = [
  "passed",
  "failed",
  "skipped",
  "running",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function asStatus(v: unknown, fallback: TestStatus = "passed"): TestStatus {
  return typeof v === "string" && STATUSES.includes(v as TestStatus)
    ? (v as TestStatus)
    : fallback;
}

function coerceTest(raw: unknown): TestCase | null {
  if (!isRecord(raw)) return null;
  const name = typeof raw.name === "string" ? raw.name : undefined;
  if (!name) return null;
  const test: TestCase = { name, status: asStatus(raw.status) };
  if (typeof raw.duration === "number") test.duration = raw.duration;
  if (isRecord(raw.error)) {
    const error: TestError = {};
    if (typeof raw.error.message === "string") error.message = raw.error.message;
    if (typeof raw.error.stack === "string") error.stack = raw.error.stack;
    if (error.message || error.stack) test.error = error;
  }
  return test;
}

/** Derive a suite's status from its tests: any fail → failed, any run → running. */
function deriveSuiteStatus(tests: TestCase[]): TestStatus {
  if (tests.some((t) => t.status === "failed")) return "failed";
  if (tests.some((t) => t.status === "running")) return "running";
  if (tests.length > 0 && tests.every((t) => t.status === "skipped"))
    return "skipped";
  return "passed";
}

function coerceSuite(raw: unknown, index: number): TestSuite | null {
  if (!isRecord(raw)) return null;
  const name =
    typeof raw.name === "string" ? raw.name : `Suite ${index + 1}`;
  const tests = (Array.isArray(raw.tests) ? raw.tests : [])
    .map(coerceTest)
    .filter((t): t is TestCase => t !== null);
  const status = STATUSES.includes(raw.status as TestStatus)
    ? (raw.status as TestStatus)
    : deriveSuiteStatus(tests);
  const suite: TestSuite = { name, status, tests };
  if (raw.defaultOpen === true) suite.defaultOpen = true;
  // Default-open a suite that has a failure, so failures are visible up-front.
  else if (status === "failed") suite.defaultOpen = true;
  return suite;
}

function computeSummary(
  suites: TestSuite[],
  raw: unknown,
): TestSummary {
  const all = suites.flatMap((s) => s.tests);
  const count = (st: TestStatus) => all.filter((t) => t.status === st).length;
  const summary: TestSummary = {
    passed: count("passed"),
    failed: count("failed"),
    skipped: count("skipped"),
    running: count("running"),
    total: all.length,
  };
  const totalDuration = all.reduce((sum, t) => sum + (t.duration ?? 0), 0);
  // Prefer an explicit summary.duration; else sum test durations (if any).
  if (isRecord(raw) && isRecord(raw.summary) && typeof raw.summary.duration === "number") {
    summary.duration = raw.summary.duration;
  } else if (totalDuration > 0) {
    summary.duration = totalDuration;
  }
  return summary;
}

/**
 * Normalize an unknown value into a TestRun. Accepts `{ suites: [...] }`, a bare
 * array of suites, or `{ tests: [...] }` (wrapped into a single "Tests" suite).
 */
export function coerceTestRun(value: unknown): TestRun {
  let rawSuites: unknown[];
  if (Array.isArray(value)) rawSuites = value;
  else if (isRecord(value) && Array.isArray(value.suites)) rawSuites = value.suites;
  else if (isRecord(value) && Array.isArray(value.tests))
    rawSuites = [{ name: "Tests", tests: value.tests }];
  else rawSuites = [];
  const suites = rawSuites
    .map((s, i) => coerceSuite(s, i))
    .filter((s): s is TestSuite => s !== null);
  return { summary: computeSummary(suites, value), suites };
}

/** Format a millisecond duration compactly (e.g. "12ms", "1.4s"). */
export function formatDuration(ms: number | undefined): string | undefined {
  if (ms === undefined) return undefined;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)}s`;
}

/** Percentage breakdown for the progress bar (passed/failed/skipped of total). */
export function progressShares(summary: TestSummary): {
  passed: number;
  failed: number;
  skipped: number;
} {
  const denom = summary.total || 1;
  return {
    passed: (summary.passed / denom) * 100,
    failed: (summary.failed / denom) * 100,
    skipped: (summary.skipped / denom) * 100,
  };
}
