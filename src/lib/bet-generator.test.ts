import { describe, it, expect } from "vitest";
import { alertMatchesLocation } from "./bet-generator";

describe("alertMatchesLocation", () => {
  it("should return true for general scope regardless of areas or location", () => {
    expect(alertMatchesLocation(["תל אביב"], "general", "חיפה")).toBe(true);
    expect(alertMatchesLocation([], "general", "any")).toBe(true);
  });

  it("should return true if location is 'כללי' regardless of scope", () => {
    expect(alertMatchesLocation(["תל אביב"], "city", "כללי")).toBe(true);
    expect(alertMatchesLocation([], "region", "כללי")).toBe(true);
  });

  it("should correctly match city scope", () => {
    expect(alertMatchesLocation(["תל אביב", "רמת גן"], "city", "תל אביב")).toBe(true);
    expect(alertMatchesLocation(["תל אביב - מזרח"], "city", "תל אביב")).toBe(true);
    expect(alertMatchesLocation(["חיפה"], "city", "תל אביב")).toBe(false);
  });

  it("should correctly match region scope", () => {
    // Assuming "דן" region contains "תל אביב - דרום העיר ויפו" from cities-data.ts
    // We'll mock the data or just use real data since it imports it.
    expect(alertMatchesLocation(["תל אביב - מזרח"], "region", "דן")).toBe(true);
    expect(alertMatchesLocation(["אילת"], "region", "דן")).toBe(false);

    // Testing with a region that might not exist or empty region
    expect(alertMatchesLocation(["תל אביב"], "region", "non-existent-region")).toBe(false);
  });

  it("should handle edge cases", () => {
    // Unknown scope (not really possible with type system, but good to test if it defaults to false)
    expect(alertMatchesLocation(["תל אביב"], "unknown" as any, "תל אביב")).toBe(false);
    expect(alertMatchesLocation([], "city", "תל אביב")).toBe(false);
  });
});
