import type { LeadInput } from '@/types/lead';

const tierMap: Record<string, LeadInput['preferredTier']> = {
  bronze: 'bronze',
  silver: 'silver',
  gold: 'gold',
};

export function parseLeadIntent(text: string): Partial<LeadInput> {
  const normalized = text.toLowerCase();

  const email = normalized.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/)?.[0];
  const zipCode = normalized.match(/\b\d{5}\b/)?.[0];
  const annualIncome = normalized.match(/\$?\s?(\d{2,6})\s?(k|000)?/)?.[1];
  const tier = Object.keys(tierMap).find((k) => normalized.includes(k));

  return {
    ...(email ? { email } : {}),
    ...(zipCode ? { zipCode } : {}),
    ...(annualIncome ? { annualIncome: Number(annualIncome) } : {}),
    ...(tier ? { preferredTier: tierMap[tier] } : {}),
  };
}
