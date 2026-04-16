import { translations, type Language } from '@/lib/i18n/translations';

type HeroProps = {
  language: Language;
};

export default function Hero({ language }: HeroProps) {
  const t = translations[language];
  return (
    <header className="space-y-4">
      <h1 className="text-4xl font-bold text-slate-900">{t.headline}</h1>
      <p className="max-w-2xl text-slate-600">{t.subheadline}</p>
      <a href="/chat" className="inline-block rounded-xl bg-blue-600 px-5 py-3 font-medium text-white">
        {t.cta}
      </a>
    </header>
  );
}
