import { expect, test } from "@playwright/test";

import { buildVisualTestUrl } from "../design-lab/helpers/url";
import { VISUAL_MANIFEST } from "../../packages/ui/src/design-lab/visual-manifest";

for (const target of VISUAL_MANIFEST) {
  test(`design-lab visual: ${target.label}`, async ({ page }) => {
    await page.goto(buildVisualTestUrl(target));
    await page.getByTestId("design-lab-canvas").waitFor({ state: "visible" });
    await expect(page.getByTestId("design-lab-canvas")).toHaveScreenshot(
      `${target.label}.png`,
    );
  });
}
