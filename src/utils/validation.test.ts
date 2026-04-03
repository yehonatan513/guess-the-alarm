import { describe, it, expect } from "vitest";
import { validateUsername } from "./validation";

describe("validateUsername", () => {
  it("should return null for a valid English username", () => {
    expect(validateUsername("johndoe")).toBeNull();
    expect(validateUsername("john_doe")).toBeNull();
    expect(validateUsername("john-doe")).toBeNull();
    expect(validateUsername("john.doe")).toBeNull();
    expect(validateUsername("john123")).toBeNull();
  });

  it("should return null for a valid Hebrew username", () => {
    expect(validateUsername("ישראל")).toBeNull();
    expect(validateUsername("ישראל_ישראלי")).toBeNull();
  });

  it("should return an error for an empty username", () => {
    expect(validateUsername("")).toBe("אנא הזן שם משתמש");
  });

  it("should return an error for a username with spaces", () => {
    expect(validateUsername("john doe")).toBe("שם משתמש חייב להיות 3-15 תווים (ללא רווחים)");
    expect(validateUsername(" ישראל ")).toBe("שם משתמש חייב להיות 3-15 תווים (ללא רווחים)");
  });

  it("should return an error for a username that is too short", () => {
    expect(validateUsername("jo")).toBe("שם משתמש חייב להיות 3-15 תווים (ללא רווחים)");
    expect(validateUsername("א")).toBe("שם משתמש חייב להיות 3-15 תווים (ללא רווחים)");
  });

  it("should return an error for a username that is too long", () => {
    expect(validateUsername("thisusernameistoolong")).toBe("שם משתמש חייב להיות 3-15 תווים (ללא רווחים)");
  });

  it("should return an error for a username with invalid special characters", () => {
    expect(validateUsername("john@doe")).toBe("שם משתמש חייב להיות 3-15 תווים (ללא רווחים)");
    expect(validateUsername("john!doe")).toBe("שם משתמש חייב להיות 3-15 תווים (ללא רווחים)");
    expect(validateUsername("john#doe")).toBe("שם משתמש חייב להיות 3-15 תווים (ללא רווחים)");
    expect(validateUsername("john$doe")).toBe("שם משתמש חייב להיות 3-15 תווים (ללא רווחים)");
    expect(validateUsername("john%doe")).toBe("שם משתמש חייב להיות 3-15 תווים (ללא רווחים)");
  });
});
