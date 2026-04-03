import { describe, it, expect } from "vitest";
import { parseBetId, BetScope, BetType } from "./bet-generator";

describe("parseBetId", () => {
  it("should parse a valid overunder bet id", () => {
    const id = "city|overunder|Tel Aviv|over|50";
    const result = parseBetId(id);
    expect(result).toEqual({
      scope: "city",
      type: "overunder",
      location: "Tel Aviv",
      direction: "over",
      threshold: 50,
    });
  });

  it("should parse a valid quiet bet id", () => {
    const id = "region|quiet|North|30";
    const result = parseBetId(id);
    expect(result).toEqual({
      scope: "region",
      type: "quiet",
      location: "North",
      minutes: 30,
    });
  });

  it("should parse a valid night bet id", () => {
    const id = "general|night|All|yes";
    const result = parseBetId(id);
    expect(result).toEqual({
      scope: "general",
      type: "night",
      location: "All",
      direction: "yes",
    });
  });

  it("should parse a valid total bet id", () => {
    const id = "city|total|Haifa|10|50";
    const result = parseBetId(id);
    expect(result).toEqual({
      scope: "city",
      type: "total",
      location: "Haifa",
      min: 10,
      max: 50,
    });
  });

  it("should parse a valid total bet id with infinite max", () => {
    const id = "city|total|Haifa|10|inf";
    const result = parseBetId(id);
    expect(result).toEqual({
      scope: "city",
      type: "total",
      location: "Haifa",
      min: 10,
      max: null,
    });
  });

  it("should return null for id with less than 3 parts", () => {
    const id = "city|overunder";
    const result = parseBetId(id);
    expect(result).toBeNull();
  });

  it("should return null for overunder id with less than 5 parts", () => {
    const id = "city|overunder|Tel Aviv|over";
    const result = parseBetId(id);
    expect(result).toBeNull();
  });

  it("should return null for overunder id with invalid threshold", () => {
    const id = "city|overunder|Tel Aviv|over|invalid";
    const result = parseBetId(id);
    expect(result).toBeNull();
  });

  it("should return null for quiet id with less than 4 parts", () => {
    const id = "region|quiet|North";
    const result = parseBetId(id);
    expect(result).toBeNull();
  });

  it("should return null for quiet id with invalid minutes", () => {
    const id = "region|quiet|North|invalid";
    const result = parseBetId(id);
    expect(result).toBeNull();
  });

  it("should return null for total id with less than 5 parts", () => {
    const id = "city|total|Haifa|10";
    const result = parseBetId(id);
    expect(result).toBeNull();
  });

  it("should return null for total id with invalid min", () => {
    const id = "city|total|Haifa|invalid|50";
    const result = parseBetId(id);
    expect(result).toBeNull();
  });

  it("should return null for total id with invalid max", () => {
    const id = "city|total|Haifa|10|invalid";
    const result = parseBetId(id);
    expect(result).toBeNull();
  });

  it("should return null for unknown type", () => {
    const id = "city|unknown|Haifa";
    const result = parseBetId(id);
    expect(result).toBeNull();
  });

  it("should handle exceptions and return null (e.g. malformed object or when split fails)", () => {
    // The only way to trigger the try/catch in parseBetId(id: string) is if id.split throws.
    // For example, if id is somehow not a string at runtime (e.g., null or undefined).
    // TypeScript prevents this at compile time, so we cast to bypass for the test.
    const result = parseBetId(null as unknown as string);
    expect(result).toBeNull();
  });
});
