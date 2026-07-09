import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";
import {
  clearInboundKakao,
  seedInboundKakaoConnected,
  INBOUND_KAKAO_BOT_ID,
  INBOUND_KAKAO_BOT_NAME,
} from "../helpers/kakao-channels";

const SCREENSHOT_DIR = "/opt/cursor/artifacts/screenshots";

test.describe("kakao-channel-ui", () => {
  test.setTimeout(60_000);

  test("card + manual link form (no OAuth)", async ({ page }) => {
    await clearInboundKakao();
    await loginAsSmoke(page);

    await gotoProject(page, "channels");
    const kakaoCard = page.getByTestId("channel-card-kakao");
    await expect(kakaoCard).toBeVisible();
    await expect(kakaoCard.getByText("Connected")).toHaveCount(0);

    await kakaoCard.click();
    await expect(page.getByTestId("card-list-sheet-panel")).toBeVisible();
    // No OAuth "Connect" — a manual bot-id form + webhook URL guidance instead.
    await expect(page.getByTestId("channel-detail-kakao")).toContainText(
      "/api/chat/kakao",
    );
    await expect(page.getByTestId("channel-kakao-bot-id-input")).toBeVisible();
    await expect(page.getByTestId("channel-add-connection-kakao")).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/channels-kakao-disconnected.png`,
      fullPage: true,
    });
  });

  test("link a bot id, then it shows Connected", async ({ page }) => {
    await clearInboundKakao();
    await loginAsSmoke(page);

    await gotoProject(page, "channels");
    await page.getByTestId("channel-card-kakao").click();

    await page
      .getByTestId("channel-kakao-bot-id-input")
      .fill(INBOUND_KAKAO_BOT_ID);
    await page
      .getByTestId("channel-kakao-bot-label-input")
      .fill(INBOUND_KAKAO_BOT_NAME);
    await page.getByTestId("channel-add-connection-kakao").click();

    const linkedItem = page.getByTestId(
      `channel-workspace-kakao-${INBOUND_KAKAO_BOT_ID}`,
    );
    await expect(linkedItem).toContainText(INBOUND_KAKAO_BOT_ID);
    await expect(
      page.getByTestId(`channel-disconnect-kakao-${INBOUND_KAKAO_BOT_ID}`),
    ).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/channels-kakao-linked.png`,
      fullPage: true,
    });
  });

  test("connected card + disconnect from sheet", async ({ page }) => {
    await seedInboundKakaoConnected();
    await loginAsSmoke(page);

    await gotoProject(page, "channels");
    const kakaoCard = page.getByTestId("channel-card-kakao");
    await expect(kakaoCard.getByText("Connected")).toBeVisible();
    await expect(kakaoCard.getByText(INBOUND_KAKAO_BOT_NAME)).toBeVisible();

    await kakaoCard.click();
    const disconnectBtn = page.getByTestId(
      `channel-disconnect-kakao-${INBOUND_KAKAO_BOT_ID}`,
    );
    await expect(disconnectBtn).toBeVisible();
    await disconnectBtn.click();
    await expect(page.getByTestId("channel-disconnect-dialog")).toBeVisible();
    await page.getByTestId("channel-disconnect-confirm").click();

    await expect(kakaoCard.getByText("Connected")).toHaveCount(0);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/channels-kakao-after-disconnect.png`,
      fullPage: true,
    });
  });
});
