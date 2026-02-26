import { describe, it, expect } from "vitest";
import { calculatePrice, suggestStayType } from "@/lib/db/pricing";
import type { Rate } from "@/types";

const baseRate: Rate = {
  id: "test-rate-1",
  room_type_id: "rt-1",
  property_id: null,
  stay_type: "daily",
  price: 350000,
  min_stay: 1,
  deposit_percentage: 100,
  tax_percentage: 11,
  service_fee: 25000,
  is_active: true,
  valid_from: null,
  valid_until: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("calculatePrice", () => {
  it("calculates daily rate for 3 nights", () => {
    const result = calculatePrice(
      baseRate,
      new Date("2026-03-01"),
      new Date("2026-03-04"),
      "daily"
    );

    expect(result.units).toBe(3);
    expect(result.basePrice).toBe(350000 * 3); // 1,050,000
    expect(result.tax).toBe(Math.round(1050000 * 0.11)); // 115,500
    expect(result.serviceFee).toBe(25000);
    expect(result.discount).toBe(0);
    expect(result.total).toBe(1050000 + 115500 + 25000); // 1,190,500
    expect(result.deposit).toBe(1190500); // 100% deposit for daily
  });

  it("calculates weekly rate for 10 nights (2 weeks)", () => {
    const weeklyRate: Rate = {
      ...baseRate,
      stay_type: "weekly",
      price: 2000000,
      min_stay: 7,
      deposit_percentage: 50,
      service_fee: 50000,
    };

    const result = calculatePrice(
      weeklyRate,
      new Date("2026-03-01"),
      new Date("2026-03-11"),
      "weekly"
    );

    expect(result.units).toBe(2); // ceil(10/7) = 2
    expect(result.basePrice).toBe(2000000 * 2);
  });

  it("calculates monthly rate for 35 days (2 months)", () => {
    const monthlyRate: Rate = {
      ...baseRate,
      stay_type: "monthly",
      price: 5500000,
      min_stay: 30,
      deposit_percentage: 30,
      service_fee: 100000,
    };

    const result = calculatePrice(
      monthlyRate,
      new Date("2026-03-01"),
      new Date("2026-04-05"),
      "monthly"
    );

    expect(result.units).toBe(2); // ceil(35/30) = 2
    expect(result.basePrice).toBe(5500000 * 2);
    expect(result.deposit).toBe(
      Math.round(result.total * 0.3)
    );
  });

  it("correctly applies tax and service fee", () => {
    const result = calculatePrice(
      baseRate,
      new Date("2026-03-01"),
      new Date("2026-03-02"),
      "daily"
    );

    expect(result.units).toBe(1);
    expect(result.basePrice).toBe(350000);
    expect(result.tax).toBe(Math.round(350000 * 0.11));
    expect(result.serviceFee).toBe(25000);
    const expectedTotal = 350000 + Math.round(350000 * 0.11) + 25000;
    expect(result.total).toBe(expectedTotal);
  });
});

describe("suggestStayType", () => {
  it("suggests daily for 1-6 nights", () => {
    expect(suggestStayType(1)).toBe("daily");
    expect(suggestStayType(3)).toBe("daily");
    expect(suggestStayType(6)).toBe("daily");
  });

  it("suggests weekly for 7-27 nights", () => {
    expect(suggestStayType(7)).toBe("weekly");
    expect(suggestStayType(14)).toBe("weekly");
    expect(suggestStayType(27)).toBe("weekly");
  });

  it("suggests monthly for 28+ nights", () => {
    expect(suggestStayType(28)).toBe("monthly");
    expect(suggestStayType(30)).toBe("monthly");
    expect(suggestStayType(90)).toBe("monthly");
  });
});
