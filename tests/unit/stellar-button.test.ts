import { describe, expect, it } from "vitest";
import type { StellarButtonVariant } from "../../src/components/button/button";

describe("stellar button contract", () => {
  it("supports every documented visual variant", () => {
    const variants: StellarButtonVariant[] = [
      "surface",
      "base",
      "primary",
      "selected",
      "text",
    ];

    expect(variants).toHaveLength(5);
    expect(new Set(variants).size).toBe(5);
  });
});
