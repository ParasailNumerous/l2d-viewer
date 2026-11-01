import { expect, test } from "@playwright/test";

test.describe("stellar-field", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.addScriptTag({ type: "module", url: "/l2d-viewer/src/components/field/field.ts" });
  });

  test("renders a labelled text input with start and end slots", async ({ page }) => {
    await page.setContent(`
      <stellar-field label="Name">
        <span slot="start">$</span>
        <button slot="end" type="button">Clear</button>
      </stellar-field>
    `);

    const field = page.locator("stellar-field");
    await expect(field.locator("input")).toHaveAccessibleName("Name");
    await expect(field.locator('[slot="start"]')).toBeVisible();
    await expect(field.locator('[slot="end"]')).toBeVisible();
  });

  test("delegates focus and exposes native input and change events", async ({ page }) => {
    await page.setContent(`
      <stellar-field aria-label="Amount" type="number" min="1" max="10" step="1"></stellar-field>
      <output></output>
    `);

    const field = page.locator("stellar-field");
    await field.evaluate((element) => {
      const output = document.querySelector("output")!;
      element.addEventListener("input", () => { output.textContent += "input "; });
      element.addEventListener("change", () => { output.textContent += "change"; });
      (element as HTMLElement).focus();
    });

    await expect(field.locator("input")).toBeFocused();
    await field.locator("input").fill("5");
    await field.locator("input").blur();
    await expect(page.locator("output")).toHaveText("input change");
  });

  test("passes state and constraints to the native input", async ({ page }) => {
    await page.setContent(`
      <stellar-field
        type="number"
        value="2"
        disabled
        readonly
        required
        min="1"
        max="10"
        step="1"
      ></stellar-field>
    `);

    const input = page.locator("stellar-field input");
    await expect(input).toHaveValue("2");
    await expect(input).toBeDisabled();
    await expect(input).toHaveAttribute("readonly", "");
    await expect(input).toHaveAttribute("required", "");
    await expect(input).toHaveAttribute("min", "1");
    await expect(input).toHaveAttribute("max", "10");
    await expect(input).toHaveAttribute("step", "1");
  });

  test("submits its value and participates in native validity", async ({ page }) => {
    await page.setContent(`
      <form id="form">
        <stellar-field name="amount" type="number" required min="1" max="10" value="2"></stellar-field>
      </form>
    `);

    const form = page.locator("form");
    const field = page.locator("stellar-field");
    await expect.poll(() => field.evaluate((element) => (element as HTMLElement).matches(":defined"))).toBe(true);
    await expect.poll(() => form.evaluate((element) => (element as HTMLFormElement).checkValidity())).toBe(true);

    const submitted = await form.evaluate((element) => {
      const data = new FormData(element as HTMLFormElement);
      return Array.from(data.entries());
    });
    expect(submitted).toEqual([["amount", "2"]]);

    await field.locator("input").fill("11");
    await expect.poll(() => form.evaluate((element) => !(element as HTMLFormElement).checkValidity())).toBe(true);
    await expect.poll(() => field.locator("input").evaluate((element) => !(element as HTMLInputElement).checkValidity())).toBe(true);
  });

  test("restores its initial value when its form is reset", async ({ page }) => {
    await page.setContent(`
      <form>
        <stellar-field name="name" value="Initial"></stellar-field>
        <button type="reset">Reset</button>
      </form>
    `);

    const input = page.locator("stellar-field input");
    await input.fill("Changed");
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(input).toHaveValue("Initial");
  });

  test("follows a disabled fieldset without submitting a value", async ({ page }) => {
    await page.setContent(`
      <form>
        <fieldset disabled>
          <stellar-field name="amount" value="2"></stellar-field>
        </fieldset>
      </form>
    `);

    const field = page.locator("stellar-field");
    await expect(field.locator("input")).toBeDisabled();
    await expect(field).toHaveAttribute("data-fieldset-disabled", "");
    await expect.poll(async () => await field.evaluate((element) => new FormData(element.closest("form") as HTMLFormElement).has("amount"))).toBe(false);

    await page.locator("fieldset").evaluate((element) => { (element as HTMLFieldSetElement).disabled = false; });
    await expect(field.locator("input")).toBeEnabled();
    await expect(field).not.toHaveAttribute("data-fieldset-disabled", "");
  });

});
