import { z } from "zod";

export const goalPrioritySchema = z.enum(["high", "medium", "low"]);

export const goalHealthStatusSchema = z.enum([
  "draft",
  "on_track",
  "at_risk",
  "achieved",
  "partial",
  "missed",
  "baseline_pending",
]);

export const measurementDirectionSchema = z.enum([
  "increase",
  "decrease",
  "maintain",
]);

export const measurementCadenceSchema = z.enum([
  "daily",
  "weekly",
  "monthly",
  "quarterly",
]);

export const snapshotKindSchema = z.enum([
  "baseline",
  "checkpoint",
  "period_end",
  "launch_before",
  "launch_after",
]);

export const snapshotSourceSchema = z.enum(["manual", "integration", "import"]);

export const krJudgmentSchema = z.enum(["achieved", "partial", "missed"]);

export const kpiStatusSchema = z.enum(["active", "archived"]);

/** Numeric or string metric values (e.g. "10%", "42"). */
export const metricValueSchema = z.union([z.string(), z.number()]);
