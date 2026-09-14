export interface CommercialTerms {
  readonly minimumGuaranteeCents: number;
  readonly variableReturnRateBp: number;
  readonly territoryRoyaltyRateBp: number;
  readonly payoutRule: string;
  readonly effectiveFrom: Date | null;
  readonly effectiveTo: Date | null;
}

export interface ResolvedMG {
  readonly fixedMGCents: number;
  readonly source: "fixed" | "formula" | "default";
}

export interface PayoutCalculation {
  readonly netSalesCents: number;
  readonly fixedMGCents: number;
  readonly variableReturnCents: number;
  readonly payableCents: number;
  readonly mgSource: "fixed" | "formula" | "default";
}

export interface RoyaltyCalculation {
  readonly territorySalesCents: number;
  readonly rateBp: number;
  readonly poolCents: number;
  readonly eligiblePartnerCount: number;
  readonly individualCents: number;
}

export interface RevenueDistributionValidation {
  readonly valid: boolean;
  readonly totalPercentage: number;
  readonly error: string | null;
}

const DEFAULT_MG_CENTS = 1500000;
const DEFAULT_VARIABLE_RETURN_BP = 3000;
const DEFAULT_TERRITORY_ROYALTY_BP = 200;

export function resolveMG(
  agreement: { minimumGuaranteeCents: number | null; mgFormulaRateBp: number | null; mgFormulaBase: string | null },
  investmentCents: number | null,
): ResolvedMG {
  if (agreement.minimumGuaranteeCents != null) {
    return { fixedMGCents: agreement.minimumGuaranteeCents, source: "fixed" };
  }
  if (agreement.mgFormulaRateBp != null && investmentCents != null && agreement.mgFormulaBase === "INITIAL_INVESTMENT") {
    return { fixedMGCents: Math.round((investmentCents * agreement.mgFormulaRateBp) / 10000), source: "formula" };
  }
  if (agreement.mgFormulaRateBp != null && investmentCents != null) {
    return { fixedMGCents: Math.round((investmentCents * agreement.mgFormulaRateBp) / 10000), source: "formula" };
  }
  return { fixedMGCents: DEFAULT_MG_CENTS, source: "default" };
}

export function calculateNetSales(totalCents: number, gstCents: number): number {
  return totalCents - gstCents;
}

export function calculateVariableReturn(netSalesCents: number, variableReturnRateBp: number): number {
  return Math.round((netSalesCents * variableReturnRateBp) / 10000);
}

export function applyPayoutRule(
  mgCents: number,
  variableReturnCents: number,
  payoutRule: string | null,
): number {
  if (payoutRule === "VARIABLE_ONLY") {
    return variableReturnCents;
  }
  return Math.max(mgCents, variableReturnCents);
}

export function calculatePayout(
  agreement: { minimumGuaranteeCents: number | null; mgFormulaRateBp: number | null; mgFormulaBase: string | null; variableReturnRateBp: number | null; payoutRule: string | null },
  investmentCents: number | null,
  netSalesCents: number,
): PayoutCalculation {
  const mg = resolveMG(agreement, investmentCents);
  const variableReturnRateBp = agreement.variableReturnRateBp ?? DEFAULT_VARIABLE_RETURN_BP;
  const variableReturnCents = calculateVariableReturn(netSalesCents, variableReturnRateBp);
  const payableCents = applyPayoutRule(mg.fixedMGCents, variableReturnCents, agreement.payoutRule);
  return {
    netSalesCents,
    fixedMGCents: mg.fixedMGCents,
    variableReturnCents,
    payableCents,
    mgSource: mg.source,
  };
}

export function calculateRoyalty(
  territorySalesCents: number,
  royaltyRateBp: number | null,
): { poolCents: number; rateBp: number } {
  const rateBp = royaltyRateBp ?? DEFAULT_TERRITORY_ROYALTY_BP;
  return { poolCents: Math.round((territorySalesCents * rateBp) / 10000), rateBp };
}

export function splitRoyaltyEqually(poolCents: number, eligibleCount: number): number {
  return eligibleCount > 0 ? Math.round(poolCents / eligibleCount) : 0;
}

export function validateRevenueDistribution(distributions: ReadonlyArray<{ percentage: number }>): RevenueDistributionValidation {
  if (distributions.length === 0) {
    return { valid: false, totalPercentage: 0, error: "At least one distribution row is required" };
  }
  const totalPercentage = distributions.reduce((sum, d) => sum + d.percentage, 0);
  if (totalPercentage !== 100) {
    return { valid: false, totalPercentage, error: `Distribution percentages must sum to 100%, got ${totalPercentage}%` };
  }
  for (const d of distributions) {
    if (d.percentage < 0 || d.percentage > 100) {
      return { valid: false, totalPercentage, error: `Invalid percentage: ${d.percentage}%. Each percentage must be between 0 and 100.` };
    }
  }
  return { valid: true, totalPercentage, error: null };
}

export function buildTermsSnapshot(
  agreement: { minimumGuaranteeCents: number | null; mgFormulaRateBp: number | null; mgFormulaBase: string | null; variableReturnRateBp: number | null; variableReturnBasis: string | null; payoutRule: string | null; territoryRoyaltyRateBp: number | null },
  investmentCents: number | null,
): Record<string, unknown> {
  const mg = resolveMG(agreement, investmentCents);
  return {
    minimumGuaranteeCents: agreement.minimumGuaranteeCents,
    mgFormulaRateBp: agreement.mgFormulaRateBp,
    mgFormulaBase: agreement.mgFormulaBase,
    resolvedMGCents: mg.fixedMGCents,
    mgSource: mg.source,
    variableReturnRateBp: agreement.variableReturnRateBp ?? DEFAULT_VARIABLE_RETURN_BP,
    variableReturnBasis: agreement.variableReturnBasis ?? "NET_SALES_GST_EXCLUDED",
    payoutRule: agreement.payoutRule ?? "HIGHER_OF_FIXED_AND_VARIABLE",
    territoryRoyaltyRateBp: agreement.territoryRoyaltyRateBp ?? DEFAULT_TERRITORY_ROYALTY_BP,
    investmentCents,
    capturedAt: new Date().toISOString(),
  };
}

export function isTermsApplicable(
  terms: { effectiveFrom: Date | null; effectiveTo: Date | null },
  periodStart: Date,
  _periodEnd: Date,
): boolean {
  if (terms.effectiveFrom != null && periodStart < terms.effectiveFrom) {
    return false;
  }
  if (terms.effectiveTo != null && periodStart > terms.effectiveTo) {
    return false;
  }
  return true;
}

export const COMMERCIAL_DEFAULTS = {
  MG_CENTS: DEFAULT_MG_CENTS,
  VARIABLE_RETURN_BP: DEFAULT_VARIABLE_RETURN_BP,
  TERRITORY_ROYALTY_BP: DEFAULT_TERRITORY_ROYALTY_BP,
} as const;
