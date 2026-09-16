'use client';

// I LINK DEL RISTORATORE, che vanno in fondo al menù al tavolo.
//
// Sta nel gruppo «L'identità» della scatola dell'aspetto, accanto a logo e
// copertina, perché è la stessa cosa: il locale che si presenta. Ed è anche
// il motivo per cui è premium — e stando qui dentro eredita quel confine
// senza inventarne un secondo da spiegare.
//
// ⚠️ NON SI CHIEDE QUALE SERVIZIO SIA: si deduce dall'indirizzo (socials.ts).
// Nessuna tendina, e soprattutto un'etichetta che non può mentire.
//
// ⚠️ Quello che al tavolo NON deve comparire — prenotazione, delivery, menù
// esterno, telefono — non si aggiunge da qui e non c'entra: quelli stanno
// sulla scheda AllergiApp, che serve a chi sceglie un ristorante da lontano.
import { useI18n } from '@/lib/i18n';
import { socialName } from '@/lib/socials';
import { normalizeUrl, type SocialLink } from '@/lib/venues';

export default function SocialLinks({
  socials,
  onChange,
}: {
  socials: SocialLink[];
  onChange: (next: SocialLink[]) => void;
}) {
  const { d } = useI18n();

  function cambia(i: number, next: Partial<SocialLink>) {
    onChange(socials.map((s, k) => (k === i ? { ...s, ...next } : s)));
  }

  return (
    <div>
      {/* Nessun titolino qui dentro: lo dice il gruppo che lo contiene, e due
          titoli uno sopra l'altro sarebbero due gradi dello stesso rango. */}
      <div className="space-y-2">
        {socials.map((social, i) => {
          const nome = socialName(social.url);
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <input
                  value={social.url}
                  onChange={(e) => cambia(i, { url: e.target.value })}
                  // Lo schema si completa (e quello che non è http si butta)
                  // quando si esce dal campo, non a ogni tasto: correggere
                  // sotto le dita è il modo di rendere un campo inservibile.
                  onBlur={() => cambia(i, { url: normalizeUrl(social.url) })}
                  placeholder={d.menuEditor.socialsPlaceholder}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  aria-label={d.menuEditor.socialsTitle}
                />
                {/* Il nome dedotto si vede SOTTO il campo, mentre si scrive:
                    è il controllo che l'indirizzo sia quello giusto, fatto da
                    chi lo sta incollando invece che dai suoi clienti. */}
                {social.url.trim() !== '' && nome !== '' && (
                  <p className="mt-1 text-xs text-gray-500">{nome}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onChange(socials.filter((_, k) => k !== i))}
                aria-label={d.common.delete}
                title={d.common.delete}
                className="shrink-0 self-start rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onChange([...socials, { url: '', label: '' }])}
        className="mt-2 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:border-gray-400 hover:text-gray-900"
      >
        {d.menuEditor.socialsAdd}
      </button>

      <p className="mt-2 text-xs text-gray-500">{d.menuEditor.socialsHint}</p>
    </div>
  );
}
