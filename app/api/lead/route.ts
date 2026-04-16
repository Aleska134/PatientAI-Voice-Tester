import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { insertLead } from '@/lib/db';
import type { LeadInput, LeadRecord } from '@/types/lead';

export async function POST(request: Request) {
  const body = (await request.json()) as LeadInput;

  const estimateResponse = await fetch(new URL('/api/estimate', request.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      zipCode: body.zipCode,
      annualIncome: body.annualIncome,
      household: body.household,
      preferredTier: body.preferredTier,
    }),
  });

  const estimate = await estimateResponse.json();

  const record: LeadRecord = {
    ...body,
    id: randomUUID(),
    estimatedMonthlyPremium: estimate.estimatedMonthlyPremium,
    estimatedMonthlySubsidy: estimate.estimatedMonthlySubsidy,
    netMonthlyCost: estimate.netMonthlyCost,
    createdAt: new Date().toISOString(),
  };

  insertLead(record);

  return NextResponse.json(record, { status: 201 });
}
