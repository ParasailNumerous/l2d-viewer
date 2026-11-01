import { expect, test } from "@playwright/test";

test.describe("stellar-tile-grid and stellar-tile-item", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.addScriptTag({ type: "module", url: "/l2d-viewer/src/components/tile-grid/tile-grid.ts" });
    await page.addScriptTag({ type: "module", url: "/l2d-viewer/src/components/tile-item/tile-item.ts" });
  });

  test("provides an accessible standalone tile button", async ({ page }) => {
    await page.setContent(`<stellar-tile-item label="Portrait"></stellar-tile-item>`);

    const item = page.locator("stellar-tile-item");
    await expect(item.getByRole("button", { name: "Portrait" })).toBeVisible();
    await item.getByRole("button").focus();
    await expect(item.getByRole("button")).toBeFocused();

    await page.setContent(`<stellar-tile-item label="Portrait" disabled></stellar-tile-item>`);
    await expect(page.locator("stellar-tile-item").getByRole("button")).toBeDisabled();
  });

  test("supports grid semantics, roving focus, and arrow-key navigation", async ({ page }) => {
    await page.setContent(`
      <stellar-tile-grid label="Models" columns="2">
        <stellar-tile-item label="One"></stellar-tile-item>
        <stellar-tile-item label="Two"></stellar-tile-item>
        <stellar-tile-item label="Three"></stellar-tile-item>
        <stellar-tile-item label="Four"></stellar-tile-item>
      </stellar-tile-grid>
    `);

    const grid = page.getByRole("grid", { name: "Models" });
    const items = page.locator("stellar-tile-item");
    await expect(grid).toBeVisible();
    await expect(items.nth(0)).toHaveAttribute("role", "gridcell");
    await expect(items.nth(0)).toHaveAttribute("aria-rowindex", "1");
    await expect(items.nth(0)).toHaveAttribute("aria-colindex", "1");
    await expect(items.nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(items.nth(0)).toHaveAttribute("tabindex", "0");
    await expect(items.nth(1)).toHaveAttribute("tabindex", "-1");

    await items.nth(0).focus();
    await expect(items.nth(0)).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(items.nth(1)).toBeFocused();
    await expect(items.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(items.nth(0)).toHaveAttribute("aria-selected", "false");

    await page.keyboard.press("ArrowDown");
    await expect(items.nth(3)).toBeFocused();
    await expect(items.nth(3)).toHaveAttribute("aria-rowindex", "2");
    await expect(items.nth(3)).toHaveAttribute("aria-colindex", "2");
  });
});
