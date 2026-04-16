export type CoverageTier = 'bronze' | 'silver' | 'gold';

export type Household = {
  adults: number;
  dependents: number;
};

export type LeadInput = {
  fullName: string;
  email: string;
  phone?: string;
  zipCode: string;
  annualIncome: number;
  household: Household;
  preferredTier: CoverageTier;
  language: 'en' | 'es';
};

export type LeadRecord = LeadInput & {
  id: string;
  estimatedMonthlyPremium: number;
  estimatedMonthlySubsidy: number;
  netMonthlyCost: number;
  createdAt: string;
};

export type EstimateRequest = Pick<LeadInput, 'zipCode' | 'annualIncome' | 'household' | 'preferredTier'>;

export type EstimateResponse = {
  estimatedMonthlyPremium: number;
  estimatedMonthlySubsidy: number;
  netMonthlyCost: number;
  isEligible: boolean;
  notes: string[];
};
