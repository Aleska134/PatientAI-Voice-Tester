import { incomeAsFplPercent } from './aca';

export function estimateSubsidy({
  annualIncome,
  householdSize,
  benchmarkMonthlyPremium,
}: {
  annualIncome: number;
  householdSize: number;
  benchmarkMonthlyPremium: number;
}): number {
  const fplPct = incomeAsFplPercent(annualIncome, householdSize);

  if (fplPct > 400) return 0;

  const contributionRate =
    fplPct <= 150 ? 0 :
    fplPct <= 200 ? 0.02 :
    fplPct <= 250 ? 0.04 :
    fplPct <= 300 ? 0.06 : 0.085;

  const expectedAnnualContribution = annualIncome * contributionRate;
  const expectedMonthlyContribution = expectedAnnualContribution / 12;

  return Math.max(0, benchmarkMonthlyPremium - expectedMonthlyContribution);
}
