import { describe, expect, it } from "vitest";

import { formatPercent, formatUSD } from "@/lib/utils";

describe("format helpers", () => {
  it("formats USD with no fractional digits", () => {
    expect(formatUSD(1250.49)).toBe("$1,250");
  });

  it("formats decimal values as percentages", () => {
    expect(formatPercent(0.72)).toBe("72%");
  });
});
