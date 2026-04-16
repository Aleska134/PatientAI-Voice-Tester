'use client';

import type { Language } from '@/lib/i18n/translations';

type LanguageToggleProps = {
  language: Language;
  onChange: (language: Language) => void;
};

export default function LanguageToggle({ language, onChange }: LanguageToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-slate-300 p-1">
      <button
        className={`rounded px-3 py-1 text-sm ${language === 'en' ? 'bg-slate-900 text-white' : ''}`}
        onClick={() => onChange('en')}
        type="button"
      >
        EN
      </button>
      <button
        className={`rounded px-3 py-1 text-sm ${language === 'es' ? 'bg-slate-900 text-white' : ''}`}
        onClick={() => onChange('es')}
        type="button"
      >
        ES
      </button>
    </div>
  );
}
