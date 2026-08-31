import { test, expect } from "@playwright/test";
import { getLocationByOrgName, getTableByName, getTableById, cleanupOrganizationByName } from "./db";

const NAME_PREFIX = "E2E FloorPlan";

test.describe("E2E — persistance du plan de salle (spec section 97)", () => {
  test.afterEach(async () => {
    await cleanupOrganizationByName(NAME_PREFIX);
  });

  test("moving a table persists its position across a reload", async ({ page }) => {
    const runId = Date.now();
    const restaurantName = `${NAME_PREFIX} ${runId}`;

    await page.goto("/signup");
    await page.getByLabel("Nom").fill("E2E User");
    await page.getByLabel("Email").fill(`e2e-floorplan-${runId}@test.local`);
    await page.getByLabel("Mot de passe").fill("password1234");
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByLabel("Nom du restaurant").fill(restaurantName);
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await page.waitForURL("**/dashboard");

    await page.goto("/plan-de-salle");
    await page.getByRole("button", { name: "Modifier le plan" }).click();
    await page.getByRole("button", { name: "Ajouter une table" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nom *", { exact: true }).fill("T3");
    await dialog.getByLabel("Nombre de places").fill("4");
    await dialog.getByRole("button", { name: "Enregistrer" }).click();
    await expect(dialog).toBeHidden();

    const location = await getLocationByOrgName(restaurantName);
    const before = await getTableByName(location.id, "T3");

    const node = page.getByText("T3", { exact: true }).locator("..");
    const box = await node.boundingBox();
    if (!box) throw new Error("Table node not found");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 180, box.y + 120, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    const afterDrag = await getTableById(before.id);
    expect(afterDrag.x !== before.x || afterDrag.y !== before.y).toBe(true);

    await page.reload();
    await page.waitForTimeout(300);

    const node2 = page.getByText("T3", { exact: true });
    await expect(node2).toBeVisible();
    const afterReload = await getTableById(before.id);
    expect(afterReload.x).toBe(afterDrag.x);
    expect(afterReload.y).toBe(afterDrag.y);
  });
});
