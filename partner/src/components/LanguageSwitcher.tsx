'use client';

import { Fragment } from 'react';
import { useI18n, type Locale } from '@/lib/i18n';

// La sigla accanto al nome per esteso: servono a due posti diversi. In Account
// la lingua è un'impostazione fra le altre e si legge "Italiano"; sulla porta
// del portale è una cosa da fare col mignolo se serve, e "it / en" occupa
// l'angolo senza pretendere attenzione. La sigla resta comunque leggibile a
// chi usa un lettore di schermo: il nome intero è nell'aria-label.
const options: { value: Locale; label: string; short: string }[] = [
  { value: 'it', label: 'Italiano', short: 'it' },
  { value: 'en', label: 'English', short: 'en' },
];

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n();

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-sm">
        {options.map(({ value, label, short }, i) => (
          <Fragment key={value}>
            {i > 0 && <span className="text-gray-300">/</span>}
            <button
              onClick={() => setLocale(value)}
              aria-label={label}
              aria-pressed={locale === value}
              className={`transition-colors ${
                locale === value
                  ? 'font-semibold text-gray-900'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              {short}
            </button>
          </Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
      {options.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => setLocale(value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            locale === value
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
