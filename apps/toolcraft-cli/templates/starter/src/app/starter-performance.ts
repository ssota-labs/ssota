import {
  defineToolcraftPerformance,
  type ToolcraftPerformanceConfig,
} from "@repo/toolcraft-runtime";

export const starterPerformance: ToolcraftPerformanceConfig = defineToolcraftPerformance({
  browserCheckPolicy: {
    fallbackRunner: "playwright",
    fallbackWhen: ["agent-browser-unavailable", "ci"],
    preferredRunner: "agent-browser",
  },
  rendererStrategy: "none",
  rendererWorkload: "none",
  scenarios: [],
  usesCustomRenderer: false,
  workloadTargets: [],
});
