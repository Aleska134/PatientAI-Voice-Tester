import { incomeAsFplPercent } from './aca';

export function isMarketplaceEligible({
  annualIncome,
  householdSize,
  zipCode,
}: {
  annualIncome: number;
  householdSize: number;
  zipCode: string;
}): { eligible: boolean; notes: string[] } {
  const notes: string[] = [];

  if (!/^\d{5}$/.test(zipCode)) {
    return { eligible: false, notes: ['ZIP code must be a valid 5-digit US ZIP code.'] };
  }

  if (annualIncome <= 0) {
    return { eligible: false, notes: ['Annual income must be greater than $0.'] };
  }

  const fplPct = incomeAsFplPercent(annualIncome, householdSize);
  if (fplPct < 100) {
    notes.push('Income appears below 100% FPL. Medicaid eligibility may apply depending on state.');
  }

  notes.push(`Estimated income is ${fplPct.toFixed(0)}% of Federal Poverty Level.`);
  return { eligible: true, notes };
}
