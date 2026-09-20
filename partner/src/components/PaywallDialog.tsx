'use client';

// IL PAYWALL (19/09, richiesta dell'utente). Si apre dal distintivo viola
// «Pro» e dal «Salva Pro» dell'editor: cioè nel momento in cui il ristoratore
// ha appena provato qualcosa e vuole tenerla. È l'unico posto dove si racconta
// il piano — la pagina degli abbonamenti resta pulita.
//
// È una pagina di vendita, e segue le poche regole che valgono davvero:
//   - si apre col BENEFICIO, e col beneficio di QUELLO che stava facendo
//     (l'aspetto o la scheda), non con il nome del prodotto;
//   - tre righe concrete di cosa ottiene, non un elenco di funzioni;
//   - il prezzo in due riquadri, col PREZZO AL MESE a confronto (5 € contro
//     7,99 €): l'annuale vince da solo, senza gridare uno sconto;
//   - toglie il rischio: si disdice quando si vuole;
//   - risponde all'obiezione vera — «e il mio menù?» — dicendo cosa resta
//     gratis per sempre;
//   - UN solo bottone che conta, e la via d'uscita in grigio accanto.
//
// ⚠️ Niente conti alla rovescia, niente «offerta che scade», nessun numero
// sui ristoranti iscritti: di ristoratori veri non ce ne sono ancora, e una
// prova sociale finta si paga con la fiducia — che qui è il prodotto.
//
// Il bottone porta agli abbonamenti, dove si paga davvero. Finché i pagamenti
// sono spenti (SUBSCRIPTIONS) l'etichetta lo dice senza promettere: «Vai agli
// abbonamenti» invece di «Attiva il Piano Pro».
import { useId, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { useModal } from '@/lib/useModal';
import { SUBSCRIPTIONS } from '@/lib/features';
import { apriPagamento } from '@/lib/subscriptions';

export default function PaywallDialog({
  onClose,
  // Da dove arriva: cambia solo il titolo e la riga sotto, perché la prima
  // cosa che si legge deve parlare di quello che si stava facendo
  contesto = 'look',
  // Il locale che si abbonerebbe: con questo i due riquadri del prezzo
  // portano DRITTI al pagamento, senza passare da Abbonamenti (19/09: ogni
  // schermata in mezzo perde gente). Senza — non si sa di quale locale si
  // parla — si torna al rimando alla pagina, che è sempre giusto.
  venueId,
}: {
  onClose: () => void;
  contesto?: 'look' | 'card';
  venueId?: string;
}) {
  const { d } = useI18n();
  const panel = useModal<HTMLDivElement>(onClose);
  const titleId = useId();
  const [inCorso, setInCorso] = useState<'monthly' | 'yearly' | null>(null);
  const [errore, setErrore] = useState(false);
  // Si paga da qui solo quando i pagamenti sono accesi e sappiamo il locale
  const siPaga = SUBSCRIPTIONS && venueId !== undefined;

  async function paga(plan: 'monthly' | 'yearly') {
    if (!venueId) return;
    setErrore(false);
    setInCorso(plan);
    const err = await apriPagamento(venueId, plan);
    // Senza errore la pagina sta già andando su Stripe: il bottone resta in
    // attesa, o lampeggerebbe «pronto» un istante prima di sparire.
    if (err) {
      setErrore(true);
      setInCorso(null);
    }
  }

  const voci = [
    { testo: d.paywall.look, arriva: false },
    { testo: d.paywall.card, arriva: true },
    { testo: d.paywall.replies, arriva: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="backdrop-enter absolute inset-0 bg-black/40" />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="dialog-enter relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* La testata col viola del distintivo: chi arriva qui ha appena
            premuto una pastiglia di quel colore, e ritrovarlo dice che è
            finito nel posto giusto */}
        <div className="bg-violet-50 px-6 pb-5 pt-6">
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
            {d.pro.label}
          </span>
          <h2 id={titleId} className="mt-3 text-xl font-semibold leading-snug text-gray-900">
            {contesto === 'card' ? d.paywall.cardTitle : d.paywall.lookTitle}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
            {contesto === 'card' ? d.paywall.cardLead : d.paywall.lookLead}
          </p>
        </div>

        <div className="px-6 py-5">
          <ul className="space-y-2.5 text-sm text-gray-700">
            {voci.map(({ testo, arriva }) => (
              <li key={testo} className="flex gap-2.5">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#4CAF50]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                <span>
                  {testo}
                  {arriva && (
                    <span className="ml-1.5 whitespace-nowrap rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                      {d.paywall.soon}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {/* IL PREZZO: due riquadri accostati, e l'annuale vince da solo.
              Non uno sconto gridato ma il PREZZO AL MESE messo a confronto —
              5 € contro 7,99 € — col totale annuale piccolo sotto, perché è
              l'unica cifra che spaventa. Qui non si sceglie: si sceglie in
              Abbonamenti, dove si paga. */}
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {([
              {
                plan: 'monthly' as const,
                nome: d.paywall.monthlyName,
                prezzo: d.paywall.monthlyPrice,
                sotto: d.paywall.perVenue,
                risparmio: null,
                meglio: false,
              },
              {
                plan: 'yearly' as const,
                nome: d.paywall.yearlyName,
                prezzo: d.paywall.yearlyPrice,
                sotto: d.paywall.yearlyBilled,
                risparmio: d.paywall.yearlySave,
                meglio: true,
              },
            ]).map(({ plan, nome, prezzo, sotto, risparmio, meglio }) => {
              const dentro = (
                <>
                  {meglio && (
                    <span className="absolute -top-2 right-3 rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      {d.paywall.yearlyBest}
                    </span>
                  )}
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{nome}</p>
                  <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                    <span className="text-lg font-semibold text-gray-900">
                      {inCorso === plan ? d.paywall.opening : prezzo}
                    </span>
                    {inCorso !== plan && <span className="text-xs text-gray-500">{d.paywall.perMonth}</span>}
                  </p>
                  <p className={`mt-0.5 text-xs ${meglio ? 'text-gray-500' : 'text-gray-400'}`}>{sotto}</p>
                  {risparmio && <p className="mt-1 text-xs font-medium text-[#2E7D32]">{risparmio}</p>}
                </>
              );
              const classe = `relative rounded-xl px-4 py-3 text-left ${
                meglio ? 'border-2 border-gray-900' : 'border border-gray-200'
              }`;
              return siPaga ? (
                <button
                  key={plan}
                  type="button"
                  onClick={() => void paga(plan)}
                  disabled={inCorso !== null}
                  className={`${classe} transition-colors hover:bg-gray-50 disabled:opacity-60`}
                >
                  {dentro}
                </button>
              ) : (
                <div key={plan} className={classe}>
                  {dentro}
                </div>
              );
            })}
          </div>

          {errore && <p className="mt-3 text-sm text-[#C0392B]">{d.paywall.payError}</p>}

          {/* PRIMA DI PAGARE si dice che si rinnova da solo: verso le
              imprese è anche dovuto (P2B), e saltando la pagina degli
              abbonamenti quella frase la deve dire questa finestra. */}
          <p className="mt-3 text-xs leading-relaxed text-gray-500">
            {siPaga ? d.paywall.renewal : d.paywall.noLock}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{d.paywall.free}</p>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
            >
              {d.paywall.later}
            </button>
            {/* Pagando da qui il bottone scuro non serve più: la scelta sta
                nei due riquadri, e questo resta un rimando piccolo per chi ha
                più locali o vuole guardare prima. */}
            {siPaga ? (
              <Link
                href="/abbonamenti"
                className="text-sm font-medium text-gray-600 underline underline-offset-2 transition-colors hover:text-gray-900"
              >
                {d.paywall.seeAll}
              </Link>
            ) : (
              <Link
                href="/abbonamenti"
                className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
              >
                {d.paywall.ctaSoon}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
