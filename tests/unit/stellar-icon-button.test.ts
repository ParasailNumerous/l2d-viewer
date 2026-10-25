import { describe, expect, it } from "vitest";
import {
  getStellarIconButtonAccessibleLabel,
  isStellarIconButtonVariant,
  type StellarIconButtonVariant,
} from "../../src/components/icon-button/icon-button";

describe("stellar icon button contract", () => {
  it("supports every documented visual variant", () => {
    const variants: StellarIconButtonVariant[] = [
      "surface",
      "base",
      "primary",
      "selected",
      "text",
    ];

    expect(variants.every(isStellarIconButtonVariant)).toBe(true);
    expect(isStellarIconButtonVariant("unknown")).toBe(false);
  });

  it("uses an explicit accessible name and supplies a safe fallback", () => {
    expect(getStellarIconButtonAccessibleLabel("Close", "", "")).toBe("Close");
    expect(getStellarIconButtonAccessibleLabel("", "label-id", "")).toBeUndefined();
    expect(getStellarIconButtonAccessibleLabel("", "", "Close")).toBe("Close");
    expect(getStellarIconButtonAccessibleLabel("", "", "")).toBe("Icon button");
  });
});
