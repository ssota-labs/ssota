import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { expect, test } from "@playwright/test";

test.describe("Pax Humana / SSOTA pitch deck", () => {
  test("renders product slides and can export to PDF", async ({ page }, testInfo) => {
    await page.goto("/labs/pitch-deck");

    await expect(page.getByTestId("pitch-slide-1")).toContainText(
      "Pax Humana builds SSOTA",
    );
    await expect(page.getByTestId("pitch-slide-9")).toContainText(
      "UI catalog",
    );
    await expect(page.getByTestId("pitch-slide-10")).toContainText(
      "Agent work queue",
    );
    await expect(page.getByTestId("pitch-slide-14")).toContainText(
      "The company is early",
    );

    const pdfPath = testInfo.outputPath("pax-humana-ssota-pitch-deck.pdf");
    await mkdir(dirname(pdfPath), { recursive: true });
    await page.pdf({
      path: pdfPath,
      printBackground: true,
      preferCSSPageSize: true,
      width: "13.333in",
      height: "7.5in",
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    await testInfo.attach("pitch-deck-pdf", {
      path: pdfPath,
      contentType: "application/pdf",
    });
  });
});
