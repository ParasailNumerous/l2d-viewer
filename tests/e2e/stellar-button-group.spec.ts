import { expect, test } from "@playwright/test";

test.describe("stellar-button-group", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.addScriptTag({
      type: "module",
      url: "/l2d-viewer/src/components/button-group/button-group.ts",
    });
  });

  test("selects one radio and emits change", async ({ page }) => {
    await page.setContent(`
      <stellar-button-group aria-label="Resolution" selected-value="1080p">
        <stellar-button value="720p">720p</stellar-button>
        <stellar-button value="1080p">1080p</stellar-button>
        <stellar-button value="1440p">1440p</stellar-button>
        <stellar-button value="4k">4K</stellar-button>
      </stellar-button-group>
    `);

    const group = page.getByRole("radiogroup", { name: "Resolution" });
    const buttons = page.locator("stellar-button");

    await expect(group).toBeVisible();
    await expect(buttons).toHaveCount(4);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const element = document.querySelector("stellar-button-group")!;
          const container = element.shadowRoot!.querySelector(".group")!;
          const style = getComputedStyle(container);
          return `${style.display} ${style.flexWrap} ${style.gap}`;
        }),
      )
      .toBe("flex wrap 2px");
    await expect(buttons.nth(1)).toHaveAttribute("selected", "");
    await expect(buttons.nth(1).locator("button")).toHaveAttribute(
      "role",
      "radio",
    );
    await expect(buttons.nth(1).locator("button")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(buttons.nth(0).locator("button")).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await expect(buttons.nth(0).locator("button")).not.toHaveAttribute(
      "aria-pressed",
    );

    await page.evaluate(() => {
      const changes: string[] = [];
      (
        window as unknown as { buttonGroupChanges: string[] }
      ).buttonGroupChanges = changes;
      document
        .querySelector("stellar-button-group")
        ?.addEventListener("change", (event) => {
          changes.push((event as CustomEvent<{ value: string }>).detail.value);
        });
    });

    await buttons.nth(2).click();
    await expect(buttons.nth(2)).toHaveAttribute("selected", "");
    await expect(buttons.nth(2).locator("button")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(buttons.nth(1)).not.toHaveAttribute("selected", "");
    await expect(buttons.nth(1).locator("button")).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { buttonGroupChanges: string[] })
              .buttonGroupChanges,
        ),
      )
      .toEqual(["1440p"]);
  });

  test("keeps only the selected radio in the tab order", async ({ page }) => {
    await page.setContent(`
      <stellar-button-group aria-label="Resolution" selected-value="1080p">
        <stellar-button value="720p">720p</stellar-button>
        <stellar-button value="1080p">1080p</stellar-button>
        <stellar-button value="1440p">1440p</stellar-button>
        <stellar-button value="4k">4K</stellar-button>
      </stellar-button-group>
    `);

    const buttons = page.locator("stellar-button");
    const innerButtons = page.locator("stellar-button button");

    await expect(innerButtons.nth(0)).toHaveAttribute("tabindex", "-1");
    await expect(innerButtons.nth(1)).toHaveAttribute("tabindex", "0");
    await expect(innerButtons.nth(2)).toHaveAttribute("tabindex", "-1");
    await expect(innerButtons.nth(3)).toHaveAttribute("tabindex", "-1");

    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await page.keyboard.press("Tab");
    await expect(innerButtons.nth(1)).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(innerButtons.nth(1)).not.toBeFocused();

    await buttons.nth(2).click();
    await expect(innerButtons.nth(2)).toHaveAttribute("tabindex", "0");
    await expect(innerButtons.nth(1)).toHaveAttribute("tabindex", "-1");
  });

  test("moves focus and selection with arrow keys", async ({ page }) => {
    await page.setContent(`
      <stellar-button-group aria-label="Resolution" selected-value="720p">
        <stellar-button value="720p">720p</stellar-button>
        <stellar-button value="1080p">1080p</stellar-button>
        <stellar-button value="1440p">1440p</stellar-button>
        <stellar-button value="4k">4K</stellar-button>
      </stellar-button-group>
    `);

    const buttons = page.locator("stellar-button");
    await buttons.nth(0).focus();
    await expect(buttons.nth(0)).toBeFocused();

    await page.keyboard.press("ArrowRight");
    await expect(buttons.nth(1)).toBeFocused();
    await expect(buttons.nth(1)).toHaveAttribute("selected", "");
    await expect(buttons.nth(1).locator("button")).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await page.keyboard.press("End");
    await expect(buttons.nth(3)).toBeFocused();
    await expect(buttons.nth(3)).toHaveAttribute("selected", "");

    await page.keyboard.press("ArrowRight");
    await expect(buttons.nth(0)).toBeFocused();
    await expect(buttons.nth(0)).toHaveAttribute("selected", "");

    await page.keyboard.press("ArrowLeft");
    await expect(buttons.nth(3)).toBeFocused();
    await expect(buttons.nth(3)).toHaveAttribute("selected", "");
  });
});
