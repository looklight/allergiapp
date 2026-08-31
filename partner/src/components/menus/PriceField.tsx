'use client';

// Il campo del prezzo. Piccolo, ma è quello che si tocca più spesso di tutti:
// la stella polare del menù digitale è che cambiare un prezzo costi dieci
// secondi dal telefono (DIGITAL_MENU.md, Tema 7).
//
// Tiene il TESTO mentre si scrive e i centesimi quando si esce. Senza, chi
// scrive "12," se lo vedrebbe riscrivere sotto le dita a ogni tasto — il
// valore risalirebbe a 12,00 e tornerebbe giù formattato, mangiandosi la
// virgola appena battuta. Alla perdita del fuoco il testo si riallinea al
// valore vero, così "12" diventa "12,00" e due decimali ci sono sempre.
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { formatPrice, parsePrice } from '@/lib/menus';

export default function PriceField({
  cents,
  currency,
  label,
  onChange,
}: {
  cents: number | null;
  currency: string;
  // Descrizione per chi non vede il campo: da solo, "Prezzo" ripetuto
  // quaranta volte non dice a quale piatto appartiene
  label: string;
  onChange: (cents: number | null) => void;
}) {
  const { d, locale } = useI18n();
  const [text, setText] = useState(() => formatPrice(cents, locale));
  const focused = useRef(false);

  // Il valore può cambiare da fuori: la riga si sposta, il menù si ricarica.
  // Mentre si sta scrivendo però no, o si torna al problema della virgola.
  useEffect(() => {
    if (!focused.current) setText(formatPrice(cents, locale));
  }, [cents, locale]);

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 focus-within:border-gray-900">
      <input
        type="text"
        // "decimal" e non "numeric": sul telefono apre il tastierino con la
        // virgola, che per un prezzo serve sempre
        inputMode="decimal"
        value={text}
        aria-label={label}
        placeholder={d.menuEditor.pricePlaceholder}
        onFocus={() => {
          focused.current = true;
        }}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parsePrice(e.target.value));
        }}
        onBlur={() => {
          focused.current = false;
          setText(formatPrice(cents, locale));
        }}
        className="w-16 bg-transparent py-1.5 text-right text-sm tabular-nums focus:outline-none"
      />
      <span className="shrink-0 text-sm text-gray-400">{currencySign(currency, locale)}</span>
    </div>
  );
}

// Il simbolo così come lo scrive la lingua dell'utente, preso dallo stesso
// formattatore che compone i prezzi: scriverne una tabella a mano vorrebbe
// dire tenerla allineata a CURRENCIES per sempre.
function currencySign(currency: string, locale: string): string {
  const parti = new Intl.NumberFormat(locale, { style: 'currency', currency }).formatToParts(0);
  return parti.find((p) => p.type === 'currency')?.value ?? currency;
}
