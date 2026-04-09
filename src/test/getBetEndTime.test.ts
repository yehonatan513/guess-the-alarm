import { describe, it, expect } from "vitest";
import { getBetEndTime } from "../lib/bet-generator";

describe("getBetEndTime", () => {
  it("should calculate correct end time for a night bet created before 6 AM", () => {
    // 2024-01-01 04:00:00 local time
    const createdDate = new Date();
    createdDate.setFullYear(2024, 0, 1);
    createdDate.setHours(4, 0, 0, 0);
    const createdMs = createdDate.getTime();

    const endTime = getBetEndTime("city|night|תל אביב|yes", createdMs);
    const endDate = new Date(endTime);

    expect(endDate.getHours()).toBe(6);
    expect(endDate.getMinutes()).toBe(0);
    expect(endDate.getSeconds()).toBe(0);
    // Should be same day because created at 4 AM
    expect(endDate.getDate()).toBe(1);
  });

  it("should calculate correct end time for a quiet bet", () => {
    // 2024-01-01 12:00:00
    const createdMs = new Date("2024-01-01T12:00:00").getTime();
    const endTime = getBetEndTime("city|quiet|תל אביב|30", createdMs);
    expect(endTime).toBe(createdMs + 30 * 60 * 1000);
  });

  it("should calculate correct end time for a normal daily bet", () => {
    // 2024-01-01 12:00:00 local
    const createdDate = new Date();
    createdDate.setFullYear(2024, 0, 1);
    createdDate.setHours(12, 0, 0, 0);
    const createdMs = createdDate.getTime();

    const endTime = getBetEndTime("city|total|תל אביב|0|50", createdMs);
    const endDate = new Date(endTime);

    expect(endDate.getHours()).toBe(23);
    expect(endDate.getMinutes()).toBe(59);
    expect(endDate.getSeconds()).toBe(59);
    expect(endDate.getMilliseconds()).toBe(999);
    expect(endDate.getDate()).toBe(1);
  });
});
