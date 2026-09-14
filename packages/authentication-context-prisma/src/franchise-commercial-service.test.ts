import { describe, expect, it } from "vitest";
import {
  resolveMG,
  calculateNetSales,
  calculateVariableReturn,
  applyPayoutRule,
  calculatePayout,
  calculateRoyalty,
  splitRoyaltyEqually,
  validateRevenueDistribution,
  buildTermsSnapshot,
  isTermsApplicable,
  COMMERCIAL_DEFAULTS,
} from "./franchise-commercial-service";

describe("franchise-commercial-service: MG", () => {
  it("fixed MG from agreement", () => {
    const result = resolveMG({ minimumGuaranteeCents: 1500000, mgFormulaRateBp: null, mgFormulaBase: null }, null);
    expect(result.fixedMGCents).toBe(1500000);
    expect(result.source).toBe("fixed");
  });

  it("formula MG: 3% of ₹3,10,000 = ₹9,300", () => {
    const result = resolveMG({ minimumGuaranteeCents: null, mgFormulaRateBp: 300, mgFormulaBase: "INITIAL_INVESTMENT" }, 31000000);
    expect(result.fixedMGCents).toBe(930000);
    expect(result.source).toBe("formula");
  });

  it("formula MG: 3% of ₹10,00,000 = ₹30,000", () => {
    const result = resolveMG({ minimumGuaranteeCents: null, mgFormulaRateBp: 300, mgFormulaBase: "INITIAL_INVESTMENT" }, 100000000);
    expect(result.fixedMGCents).toBe(3000000);
    expect(result.source).toBe("formula");
  });

  it("formula MG without explicit base still calculates", () => {
    const result = resolveMG({ minimumGuaranteeCents: null, mgFormulaRateBp: 300, mgFormulaBase: null }, 31000000);
    expect(result.fixedMGCents).toBe(930000);
    expect(result.source).toBe("formula");
  });

  it("fixed MG takes precedence over formula", () => {
    const result = resolveMG({ minimumGuaranteeCents: 1500000, mgFormulaRateBp: 300, mgFormulaBase: "INITIAL_INVESTMENT" }, 100000000);
    expect(result.fixedMGCents).toBe(1500000);
    expect(result.source).toBe("fixed");
  });

  it("default MG when all fields null", () => {
    const result = resolveMG({ minimumGuaranteeCents: null, mgFormulaRateBp: null, mgFormulaBase: null }, null);
    expect(result.fixedMGCents).toBe(COMMERCIAL_DEFAULTS.MG_CENTS);
    expect(result.source).toBe("default");
  });

  it("default MG when formula rate set but no investment", () => {
    const result = resolveMG({ minimumGuaranteeCents: null, mgFormulaRateBp: 300, mgFormulaBase: null }, null);
    expect(result.fixedMGCents).toBe(COMMERCIAL_DEFAULTS.MG_CENTS);
    expect(result.source).toBe("default");
  });

  it("integer-cent rounding: 3% of ₹3,10,500", () => {
    const result = resolveMG({ minimumGuaranteeCents: null, mgFormulaRateBp: 300, mgFormulaBase: "INITIAL_INVESTMENT" }, 31050000);
    expect(result.fixedMGCents).toBe(931500);
    expect(Number.isInteger(result.fixedMGCents)).toBe(true);
  });
});

describe("franchise-commercial-service: Net Sales", () => {
  it("net sales excludes GST", () => {
    expect(calculateNetSales(100000, 18000)).toBe(82000);
  });

  it("net sales with zero GST", () => {
    expect(calculateNetSales(100000, 0)).toBe(100000);
  });
});

describe("franchise-commercial-service: Variable Return", () => {
  it("30% of net sales (3000 bp)", () => {
    expect(calculateVariableReturn(100000, 3000)).toBe(30000);
  });

  it("20% of net sales (2000 bp)", () => {
    expect(calculateVariableReturn(100000, 2000)).toBe(20000);
  });

  it("integer rounding", () => {
    expect(calculateVariableReturn(100001, 3000)).toBe(30000);
    expect(calculateVariableReturn(100003, 3000)).toBe(30001);
  });
});

describe("franchise-commercial-service: Payout Rule", () => {
  it("HIGHER_OF: MG > variable return", () => {
    expect(applyPayoutRule(1500000, 500000, "HIGHER_OF_FIXED_AND_VARIABLE")).toBe(1500000);
  });

  it("HIGHER_OF: variable return > MG", () => {
    expect(applyPayoutRule(1500000, 2000000, "HIGHER_OF_FIXED_AND_VARIABLE")).toBe(2000000);
  });

  it("HIGHER_OF: default when payoutRule null", () => {
    expect(applyPayoutRule(1500000, 500000, null)).toBe(1500000);
  });

  it("VARIABLE_ONLY", () => {
    expect(applyPayoutRule(1500000, 500000, "VARIABLE_ONLY")).toBe(500000);
  });
});

describe("franchise-commercial-service: Full Payout Calculation", () => {
  it("₹0 revenue → MG floor applies", () => {
    const result = calculatePayout(
      { minimumGuaranteeCents: 1500000, mgFormulaRateBp: null, mgFormulaBase: null, variableReturnRateBp: null, payoutRule: null },
      null,
      0,
    );
    expect(result.fixedMGCents).toBe(1500000);
    expect(result.variableReturnCents).toBe(0);
    expect(result.payableCents).toBe(1500000);
    expect(result.mgSource).toBe("fixed");
  });

  it("₹50,000 net sales → MG floor applies (30% = ₹15,000)", () => {
    const result = calculatePayout(
      { minimumGuaranteeCents: 1500000, mgFormulaRateBp: null, mgFormulaBase: null, variableReturnRateBp: null, payoutRule: null },
      null,
      5000000,
    );
    expect(result.fixedMGCents).toBe(1500000);
    expect(result.variableReturnCents).toBe(1500000);
    expect(result.payableCents).toBe(1500000);
  });

  it("₹1,00,000 net sales → variable return exceeds MG", () => {
    const result = calculatePayout(
      { minimumGuaranteeCents: 1500000, mgFormulaRateBp: null, mgFormulaBase: null, variableReturnRateBp: null, payoutRule: null },
      null,
      10000000,
    );
    expect(result.fixedMGCents).toBe(1500000);
    expect(result.variableReturnCents).toBe(3000000);
    expect(result.payableCents).toBe(3000000);
  });

  it("formula MG for ₹10L product: 3% of ₹10L = ₹30,000", () => {
    const result = calculatePayout(
      { minimumGuaranteeCents: null, mgFormulaRateBp: 300, mgFormulaBase: "INITIAL_INVESTMENT", variableReturnRateBp: null, payoutRule: null },
      100000000,
      0,
    );
    expect(result.fixedMGCents).toBe(3000000);
    expect(result.mgSource).toBe("formula");
    expect(result.payableCents).toBe(3000000);
  });

  it("uses agreement variableReturnRateBp when set", () => {
    const result = calculatePayout(
      { minimumGuaranteeCents: 1500000, mgFormulaRateBp: null, mgFormulaBase: null, variableReturnRateBp: 2000, payoutRule: null },
      null,
      10000000,
    );
    expect(result.variableReturnCents).toBe(2000000);
  });
});

describe("franchise-commercial-service: Royalty", () => {
  it("default 2% royalty", () => {
    const result = calculateRoyalty(10000000, null);
    expect(result.rateBp).toBe(200);
    expect(result.poolCents).toBe(200000);
  });

  it("agreement override 3%", () => {
    const result = calculateRoyalty(10000000, 300);
    expect(result.rateBp).toBe(300);
    expect(result.poolCents).toBe(300000);
  });

  it("split equally among partners", () => {
    expect(splitRoyaltyEqually(200000, 2)).toBe(100000);
  });

  it("split with zero partners", () => {
    expect(splitRoyaltyEqually(200000, 0)).toBe(0);
  });

  it("integer rounding on split", () => {
    expect(splitRoyaltyEqually(100001, 3)).toBe(33334);
  });
});

describe("franchise-commercial-service: Revenue Distribution Validation (RD-03)", () => {
  it("exactly 100% accepted", () => {
    const result = validateRevenueDistribution([{ percentage: 20 }, { percentage: 50 }, { percentage: 10 }, { percentage: 5 }, { percentage: 15 }]);
    expect(result.valid).toBe(true);
    expect(result.totalPercentage).toBe(100);
    expect(result.error).toBeNull();
  });

  it("single row at 100% accepted", () => {
    const result = validateRevenueDistribution([{ percentage: 100 }]);
    expect(result.valid).toBe(true);
  });

  it("below 100% rejected", () => {
    const result = validateRevenueDistribution([{ percentage: 20 }, { percentage: 50 }]);
    expect(result.valid).toBe(false);
    expect(result.totalPercentage).toBe(70);
    expect(result.error).toContain("70%");
  });

  it("above 100% rejected", () => {
    const result = validateRevenueDistribution([{ percentage: 60 }, { percentage: 60 }]);
    expect(result.valid).toBe(false);
    expect(result.totalPercentage).toBe(120);
    expect(result.error).toContain("120%");
  });

  it("empty array rejected", () => {
    const result = validateRevenueDistribution([]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("At least one");
  });

  it("negative percentage rejected", () => {
    const result = validateRevenueDistribution([{ percentage: -10 }, { percentage: 110 }]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid percentage");
  });
});

describe("franchise-commercial-service: Terms Snapshot (HR-02)", () => {
  it("builds snapshot with resolved MG", () => {
    const snapshot = buildTermsSnapshot(
      { minimumGuaranteeCents: 1500000, mgFormulaRateBp: null, mgFormulaBase: null, variableReturnRateBp: null, variableReturnBasis: null, payoutRule: null, territoryRoyaltyRateBp: null },
      31000000,
    );
    expect(snapshot.resolvedMGCents).toBe(1500000);
    expect(snapshot.mgSource).toBe("fixed");
    expect(snapshot.variableReturnRateBp).toBe(3000);
    expect(snapshot.payoutRule).toBe("HIGHER_OF_FIXED_AND_VARIABLE");
    expect(snapshot.territoryRoyaltyRateBp).toBe(200);
    expect(snapshot.capturedAt).toBeDefined();
  });

  it("builds snapshot with formula MG", () => {
    const snapshot = buildTermsSnapshot(
      { minimumGuaranteeCents: null, mgFormulaRateBp: 300, mgFormulaBase: "INITIAL_INVESTMENT", variableReturnRateBp: null, variableReturnBasis: null, payoutRule: null, territoryRoyaltyRateBp: null },
      100000000,
    );
    expect(snapshot.resolvedMGCents).toBe(3000000);
    expect(snapshot.mgSource).toBe("formula");
  });
});

describe("franchise-commercial-service: Effective Dating (HR-03)", () => {
  it("applicable when no dates set", () => {
    expect(isTermsApplicable({ effectiveFrom: null, effectiveTo: null }, new Date("2026-09-01"), new Date("2026-09-30"))).toBe(true);
  });

  it("applicable when period starts after effectiveFrom", () => {
    expect(isTermsApplicable({ effectiveFrom: new Date("2026-08-01"), effectiveTo: null }, new Date("2026-09-01"), new Date("2026-09-30"))).toBe(true);
  });

  it("not applicable when period starts before effectiveFrom", () => {
    expect(isTermsApplicable({ effectiveFrom: new Date("2026-10-01"), effectiveTo: null }, new Date("2026-09-01"), new Date("2026-09-30"))).toBe(false);
  });

  it("applicable when period starts before effectiveTo", () => {
    expect(isTermsApplicable({ effectiveFrom: null, effectiveTo: new Date("2026-12-31") }, new Date("2026-09-01"), new Date("2026-09-30"))).toBe(true);
  });

  it("not applicable when period starts after effectiveTo", () => {
    expect(isTermsApplicable({ effectiveFrom: null, effectiveTo: new Date("2026-08-01") }, new Date("2026-09-01"), new Date("2026-09-30"))).toBe(false);
  });
});
