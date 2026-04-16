'use client';

import { useState } from 'react';
import type { LeadInput } from '@/types/lead';

const initialLead: LeadInput = {
  fullName: '',
  email: '',
  phone: '',
  zipCode: '',
  annualIncome: 45000,
  household: { adults: 1, dependents: 0 },
  preferredTier: 'silver',
  language: 'en',
};

export default function ContactForm() {
  const [lead, setLead] = useState<LeadInput>(initialLead);
  const [message, setMessage] = useState('');

  return (
    <form
      className="grid gap-3 rounded-2xl border border-slate-200 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const response = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lead),
        });
        const body = await response.json();
        setMessage(response.ok ? `Lead saved. Estimated net monthly cost: $${body.netMonthlyCost}` : body.error);
      }}
    >
      <h2 className="text-xl font-semibold">Get a personalized callback</h2>

      <input className="rounded border px-3 py-2" placeholder="Full name" value={lead.fullName} onChange={(e) => setLead({ ...lead, fullName: e.target.value })} required />
      <input className="rounded border px-3 py-2" placeholder="Email" value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} type="email" required />
      <input className="rounded border px-3 py-2" placeholder="Phone" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} />
      <input className="rounded border px-3 py-2" placeholder="ZIP code" value={lead.zipCode} onChange={(e) => setLead({ ...lead, zipCode: e.target.value })} required />
      <input className="rounded border px-3 py-2" placeholder="Annual income" value={lead.annualIncome} onChange={(e) => setLead({ ...lead, annualIncome: Number(e.target.value) })} type="number" min={1} required />

      <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">Submit Lead</button>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </form>
  );
}
