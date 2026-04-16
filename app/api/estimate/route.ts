import { NextResponse } from 'next/server';
import { acaMetalFactor } from '@/lib/rules/aca';
import { isMarketplaceEligible } from '@/lib/rules/eligibility';
import { estimateSubsidy } from '@/lib/rules/subsidy';
import type { EstimateRequest, EstimateResponse } from '@/types/lead';

function basePremium(zipCode: string, householdSize: number): number {
  const zipRisk = Number(zipCode.slice(0, 2)) || 10;
  return 280 + zipRisk * 2 + householdSize * 65;
}

export async function POST(request: Request) {
  const body = (await request.json()) as EstimateRequest;

  const householdSize = body.household.adults + body.household.dependents;
  const eligibility = isMarketplaceEligible({
    annualIncome: body.annualIncome,
    householdSize,
    zipCode: body.zipCode,
  });

  const benchmarkMonthlyPremium = basePremium(body.zipCode, householdSize) * acaMetalFactor(body.preferredTier);
  const estimatedMonthlySubsidy = estimateSubsidy({
    annualIncome: body.annualIncome,
    householdSize,
    benchmarkMonthlyPremium,
  });

  const payload: EstimateResponse = {
    estimatedMonthlyPremium: Math.round(benchmarkMonthlyPremium),
    estimatedMonthlySubsidy: Math.round(estimatedMonthlySubsidy),
    netMonthlyCost: Math.max(0, Math.round(benchmarkMonthlyPremium - estimatedMonthlySubsidy)),
    isEligible: eligibility.eligible,
    notes: eligibility.notes,
  };

  return NextResponse.json(payload);
}
