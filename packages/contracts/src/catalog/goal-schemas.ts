import { z } from "zod";

export const goalPrioritySchema = z.enum(["high", "medium", "low"]);

/**
 * 목표(objective)·핵심 결과(key_result) 공용 상태 어휘.
 * - "approved": objective 승인 상태 (경영 승인 게이트 통과 — swdl.objective-approved-before-kr-active).
 * - "active": key_result 활성 상태 (승인된 objective 아래에서 측정 시작).
 */
export const goalHealthStatusSchema = z.enum([
  "draft",
  "approved",
  "active",
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

export type GoalHealthStatus = z.infer<typeof goalHealthStatusSchema>;

/** Numeric or string metric values (e.g. "10%", "42"). */
export const metricValueSchema = z.union([z.string(), z.number()]);
