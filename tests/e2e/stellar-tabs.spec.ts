import { expect, test } from "@playwright/test";

test.describe("stellar-tabs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.addScriptTag({ type: "module", url: "/l2d-viewer/src/components/tabs/tabs.ts" });
  });

  test("exposes tab semantics and uses manual keyboard activation", async ({ page }) => {
    await page.setContent(`
      <stellar-tabs aria-label="Sections">
        <stellar-tab label="One" value="one">One panel</stellar-tab>
        <stellar-tab label="Two" value="two">Two panel</stellar-tab>
        <stellar-tab label="Three" value="three" disabled>Three panel</stellar-tab>
      </stellar-tabs>
    `);

    const tabs = page.locator("stellar-tab");
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(0)).toHaveAttribute("role", "tab");
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(0)).toHaveAttribute("tabindex", "0");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "false");
    await expect(tabs.nth(2)).toHaveAttribute("aria-disabled", "true");
    await expect(tabs.nth(0)).toHaveAccessibleName("One");

    await tabs.nth(0).focus();
    await expect(tabs.nth(0)).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "false");

    await page.keyboard.press("Enter");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(1)).toHaveAttribute("tabindex", "0");

    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(0)).toBeFocused();
  });
});
