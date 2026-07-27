'use client';

import { useI18n, type Locale } from '@/lib/i18n';

const options: { value: Locale; label: string }[] = [
  { value: 'it', label: 'Italiano' },
  { value: 'en', label: 'English' },
];

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

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
