import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

/**
 * Ontology 페이지 (ADR-aip-console-concepts C) — explorer + 정의 편집 폼.
 * 시드 데이터에 의존하지 않도록 테스트마다 unique key로 타입을 만든다.
 */

const RUN = Date.now().toString(36).slice(-6);

test.describe("Ontology", () => {
  // 새 라우트의 dev 콜드 컴파일이 기본 30s를 넘길 수 있다.
  test.slow();

  test("explorer와 4개 섹션이 보인다", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "ontology");
    const explorer = page.getByTestId("ontology-explorer");
    await expect(explorer).toBeVisible();
    for (const section of ["Objects", "Links", "Actions", "Functions"]) {
      await expect(explorer.getByRole("button", { name: new RegExp(`^${section}`) })).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Ontology" })).toBeVisible();
  });

  test("object type을 필드 빌더로 만들고 다시 열 수 있다", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "ontology");

    await page.getByTestId("ontology-explorer").getByRole("button", { name: "New object type" }).click();
    const form = page.getByTestId("object-type-form");
    await expect(form).toBeVisible();

    const key = `e2e_${RUN}.invoice`;
    await form.getByLabel("Key", { exact: true }).fill(key);
    await form.getByLabel("Label", { exact: true }).fill("E2E Invoice");

    await form.getByRole("button", { name: "Add field" }).click();
    const row = form.getByTestId("property-field-row").first();
    await row.getByLabel("Field name").fill("amount");
    await row.getByLabel("Field type").selectOption("integer");
    await row.getByLabel("Required").click();

    await form.getByRole("button", { name: "Save" }).click();

    // 저장 후 explorer에 나타나고, 다시 선택하면 필드가 복원된다.
    const item = page.getByTestId("ontology-explorer").getByRole("button", { name: /E2E Invoice/ });
    await expect(item).toBeVisible();
    await page.getByTestId("ontology-explorer").getByPlaceholder("Search types…").fill("E2E Invoice");
    await item.click();
    await expect(page.getByTestId("object-type-form").getByLabel("Key", { exact: true })).toHaveValue(key);
    await expect(page.getByTestId("object-type-form").getByTestId("property-field-row").first().getByLabel("Field name")).toHaveValue("amount");
  });

  test("잘못된 key는 서버 검증 오류를 폼에 보여준다", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "ontology");
    await page.getByTestId("ontology-explorer").getByRole("button", { name: "New object type" }).click();
    const form = page.getByTestId("object-type-form");
    await form.getByLabel("Key", { exact: true }).fill("Not A Key");
    await form.getByLabel("Label", { exact: true }).fill("Bad");
    await form.getByRole("button", { name: "Save" }).click();
    await expect(form.getByRole("alert")).toContainText("snake_case");
  });

  test("action 폼이 파라미터·writes·edits를 편집한다", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "ontology");
    await page.getByTestId("ontology-explorer").getByRole("button", { name: "New action" }).click();
    const form = page.getByTestId("action-type-form");
    await expect(form).toBeVisible();
    await expect(form.getByLabel("Declarative edits JSON")).toBeVisible();
    await form.getByLabel("Edits kind").selectOption("function");
    await expect(form.getByLabel("Worker")).toBeVisible();
  });
});
