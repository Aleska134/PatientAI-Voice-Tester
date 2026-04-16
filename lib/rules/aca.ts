const FPL_BASE = 15510;
const FPL_PER_ADDITIONAL_MEMBER = 5500;

export function federalPovertyLevel(householdSize: number): number {
  if (householdSize <= 1) return FPL_BASE;
  return FPL_BASE + (householdSize - 1) * FPL_PER_ADDITIONAL_MEMBER;
}

export function incomeAsFplPercent(annualIncome: number, householdSize: number): number {
  const fpl = federalPovertyLevel(householdSize);
  return (annualIncome / fpl) * 100;
}

export function acaMetalFactor(tier: 'bronze' | 'silver' | 'gold'): number {
  if (tier === 'bronze') return 0.86;
  if (tier === 'silver') return 1;
  return 1.2;
}
