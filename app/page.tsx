'use client';

import { useState } from 'react';
import ContactForm from '@/components/ContactForm';
import Hero from '@/components/Hero';
import LanguageToggle from '@/components/LanguageToggle';
import PricingCard from '@/components/PricingCard';
import Services from '@/components/Services';
import type { Language } from '@/lib/i18n/translations';

export default function HomePage() {
  const [language, setLanguage] = useState<Language>('en');

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-6 py-10">
      <LanguageToggle language={language} onChange={setLanguage} />
      <Hero language={language} />
      <Services />
      <section className="grid gap-4 md:grid-cols-3">
        <PricingCard title="Bronze" monthly={289} note="Lower premium, higher deductible" />
        <PricingCard title="Silver" monthly={369} note="Most popular with subsidy support" />
        <PricingCard title="Gold" monthly={459} note="Higher premium, lower out-of-pocket" />
      </section>
      <ContactForm />
    </main>
  );
}
