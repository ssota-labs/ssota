import { test, expect } from "@playwright/test";

const bffUrl = process.env.EMBEDDER_BFF_URL ?? "http://127.0.0.1:3200";

test.describe("Embedder BFF proxy", () => {
  test("X-Embedder-User-Id → create_node(HomepageProject) via BFF", async ({
    request,
  }) => {
    const embedderUserId = `e2e_bff_${Date.now()}`;

    const res = await request.post(`${bffUrl}/ssota/execute`, {
      headers: { "X-Embedder-User-Id": embedderUserId },
      data: {
        actionType: "create_node",
        input: { nodeType: "HomepageProject", title: "BFF E2E Homepage" },
      },
    });

    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      embedderUserId: string;
      result: { status: string };
    };
    expect(body.embedderUserId).toBe(embedderUserId);
    expect(body.result.status).toBe("committed");
  });

  test("거부: X-Embedder-User-Id 없이 401", async ({ request }) => {
    const res = await request.post(`${bffUrl}/ssota/execute`, {
      data: {
        actionType: "create_node",
        input: { nodeType: "HomepageProject", title: "No embedder user" },
      },
    });

    expect(res.status()).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("X-Embedder-User-Id");
  });
});
