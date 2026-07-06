import { describe, expect, it } from "vitest";
import { toWorkerKey, uniquifyWorkerKey } from "./worker-key.js";

describe("toWorkerKey", () => {
  it("slugifies display names", () => {
    expect(toWorkerKey("Echo worker")).toBe("echo-worker");
    expect(toWorkerKey("E2E Sync")).toBe("e2e-sync");
  });

  it("uniquifies on collision", () => {
    expect(uniquifyWorkerKey("echo-worker", ["echo-worker"])).toBe(
      "echo-worker-2",
    );
  });
});
