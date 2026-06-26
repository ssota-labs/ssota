"use client";

import * as React from "react";
import {
  CaretRightIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  MinusCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import { boundNode } from "../bindings";
import {
  coerceTestRun,
  formatDuration,
  progressShares,
  type TestCase,
  type TestStatus,
  type TestSuite,
  type TestSummary,
} from "../test-run";
import type { CatalogComponent } from "../types";

/**
 * A test-run report: a summary header (passed/failed/skipped counts + total
 * duration), a stacked progress bar, and collapsible suites whose tests show a
 * status icon, duration, and — on failure — an error message + stack. Domain-
 * agnostic — data is supplied via props (`suites`/`tests`) or a bound node.
 */

function StatusIcon({ status, className }: { status: TestStatus; className?: string }) {
  switch (status) {
    case "passed":
      return (
        <CheckCircleIcon
          weight="fill"
          className={cn("text-emerald-500", className)}
        />
      );
    case "failed":
      return (
        <XCircleIcon weight="fill" className={cn("text-red-500", className)} />
      );
    case "skipped":
      return (
        <MinusCircleIcon
          weight="fill"
          className={cn("text-amber-500", className)}
        />
      );
    case "running":
      return (
        <CircleNotchIcon
          className={cn("animate-spin text-blue-500", className)}
        />
      );
  }
}

function CountPill({
  n,
  label,
  color,
}: {
  n: number;
  label: string;
  color: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span className={cn("size-2 rounded-full", color)} />
      <span className="text-foreground font-semibold">{n}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function ProgressBar({ summary }: { summary: TestSummary }) {
  const share = progressShares(summary);
  return (
    <div className="bg-muted flex h-1.5 w-full overflow-hidden rounded-full">
      <div className="bg-emerald-500" style={{ width: `${share.passed}%` }} />
      <div className="bg-red-500" style={{ width: `${share.failed}%` }} />
      <div className="bg-amber-500" style={{ width: `${share.skipped}%` }} />
    </div>
  );
}

function TestRow({ test }: { test: TestCase }) {
  const [showStack, setShowStack] = React.useState(false);
  const duration = formatDuration(test.duration);
  return (
    <div className="border-border/60 border-t first:border-t-0">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <StatusIcon status={test.status} className="size-3.5 shrink-0" />
        <span
          className={cn(
            "flex-1 truncate text-xs",
            test.status === "skipped" && "text-muted-foreground",
          )}
        >
          {test.name}
        </span>
        {duration ? (
          <span className="text-muted-foreground shrink-0 font-mono text-[10px]">
            {duration}
          </span>
        ) : null}
      </div>
      {test.error ? (
        <div className="px-3 pb-2 pl-8">
          <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2">
            {test.error.message ? (
              <p className="font-mono text-[11px] text-red-600 dark:text-red-400">
                {test.error.message}
              </p>
            ) : null}
            {test.error.stack ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowStack((s) => !s)}
                  className="text-muted-foreground hover:text-foreground mt-1 text-[10px] underline"
                >
                  {showStack ? "Hide stack" : "Show stack"}
                </button>
                {showStack ? (
                  <pre className="text-muted-foreground mt-1 overflow-x-auto font-mono text-[10px] whitespace-pre-wrap">
                    {test.error.stack}
                  </pre>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SuiteRow({ suite }: { suite: TestSuite }) {
  const [open, setOpen] = React.useState(suite.defaultOpen ?? false);
  const counts = {
    passed: suite.tests.filter((t) => t.status === "passed").length,
    failed: suite.tests.filter((t) => t.status === "failed").length,
  };
  return (
    <div className="bg-card overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="hover:bg-muted/40 flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <CaretRightIcon
          className={cn(
            "text-muted-foreground size-3 shrink-0 transition-transform",
            open && "rotate-90",
          )}
        />
        <StatusIcon status={suite.status} className="size-4 shrink-0" />
        <span className="flex-1 truncate text-sm font-medium">{suite.name}</span>
        <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
          {counts.failed > 0 ? (
            <span className="text-red-500">{counts.failed} failed · </span>
          ) : null}
          {counts.passed}/{suite.tests.length}
        </span>
      </button>
      {open ? <div className="border-t">{suite.tests.map((t, i) => <TestRow key={`${t.name}-${i}`} test={t} />)}</div> : null}
    </div>
  );
}

export const testResultsComponents: Record<string, CatalogComponent> = {
  TestResults: ({ props, bindingData }) => {
    const node = boundNode(bindingData, props);
    const property =
      typeof props.property === "string" ? props.property : "testRun";
    const raw = node ? node.properties?.[property] : (props.suites ?? props);
    const run = coerceTestRun(raw);
    const { summary } = run;
    const duration = formatDuration(summary.duration);
    const allPassed = summary.failed === 0 && summary.running === 0;

    if (run.suites.length === 0) {
      return (
        <div className="text-muted-foreground border-border rounded border border-dashed p-4 text-xs">
          TestResults: no tests to display.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="bg-card space-y-2.5 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <StatusIcon
                status={allPassed ? "passed" : "failed"}
                className="size-4"
              />
              <span className="text-sm font-semibold">
                {typeof props.title === "string"
                  ? props.title
                  : allPassed
                    ? "All tests passed"
                    : `${summary.failed} failed`}
              </span>
            </div>
            {duration ? (
              <span className="text-muted-foreground font-mono text-[11px]">
                {duration}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <CountPill n={summary.passed} label="passed" color="bg-emerald-500" />
            <CountPill n={summary.failed} label="failed" color="bg-red-500" />
            <CountPill n={summary.skipped} label="skipped" color="bg-amber-500" />
            {summary.running > 0 ? (
              <CountPill n={summary.running} label="running" color="bg-blue-500" />
            ) : null}
            <span className="text-muted-foreground ml-auto text-xs">
              {summary.total} total
            </span>
          </div>
          <ProgressBar summary={summary} />
        </div>
        <div className="space-y-2">
          {run.suites.map((s, i) => (
            <SuiteRow key={`${s.name}-${i}`} suite={s} />
          ))}
        </div>
      </div>
    );
  },
};
