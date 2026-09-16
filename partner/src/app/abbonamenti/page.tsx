'use client';

// Gli abbonamenti dei locali: stato vero, e il bottone che apre il pagamento.
//
// L'ordine della pagina è quello in cui si fanno le cose (15/09): prima
// l'abbonamento, poi l'associazione al ristorante su AllergiApp — che non
// esiste ancora ed è dichiarata come futura, non promessa.
//
// Qui non si scrive niente sull'abbonamento: le righe le porta il webhook di
// Stripe. Questa pagina le legge e basta (v. lib/subscriptions.ts).
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fill, useI18n } from '@/lib/i18n';
import { useVenues } from '@/lib/venues';
import {
  abbonamentoDi,
  apriPagamento,
  apriPannelloCliente,
  useSubscriptions,
  type Plan,
  type Subscription,
} from '@/lib/subscriptions';
import { SUBSCRIPTIONS } from '@/lib/features';
import { PageIntro, PageTitle } from '@/components/PageHeading';
import StatusPill from '@/components/StatusPill';

// Tornando da Stripe la riga non c'è ancora: la scrive il webhook, che arriva
// un attimo dopo il ritorno del browser. Invece di mostrare "nessun
// abbonamento" a chi ha appena pagato, si riprova per qualche secondo.
const TENTATIVI = 6;
const PAUSA = 2000;

function dataLeggibile(iso: string, locale: 'it' | 'en'): string {
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-GB' : 'it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// L'esito del pagamento torna da Stripe come parametro nell'indirizzo, e
// leggerlo obbliga a un confine di attesa: senza, la compilazione si ferma.
export default function SubscriptionsPage() {
  return (
    <Suspense fallback={null}>
      <Abbonamenti />
    </Suspense>
  );
}

function Abbonamenti() {
  const { d, locale } = useI18n();
  const { venues } = useVenues();
  const { subs, reload } = useSubscriptions();
  const router = useRouter();
  const params = useSearchParams();
  const esito = params.get('pagamento');

  const [inCorso, setInCorso] = useState<string | null>(null);
  const [errore, setErrore] = useState(false);
  const [attesa, setAttesa] = useState(esito === 'fatto');

  // Si torna da dove si è venuti. Ci si arriva da Account, dalla home (il
  // riquadro della scheda) e dalla pagina della scheda (in cima e in fondo):
  // un "← Account" fisso riportava in Account anche chi arrivava dalla scheda.
  // Aperta da un link esterno o in una scheda nuova non c'è un "prima", e si
  // ripiega su Account, che è la voce della barra laterale che la contiene.
  function indietro() {
    if (window.history.length > 1) router.back();
    else router.push('/account');
  }

  // L'attesa dopo il pagamento: si rilegge finché l'abbonamento non compare,
  // poi si smette. Se non arriva entro i tentativi, la pagina resta quella di
  // prima — il pagamento non è perso, il webhook riproverà da solo.
  useEffect(() => {
    if (!attesa) return;
    let giri = 0;
    const id = setInterval(() => {
      giri += 1;
      reload();
      if (giri >= TENTATIVI) {
        clearInterval(id);
        setAttesa(false);
      }
    }, PAUSA);
    return () => clearInterval(id);
  }, [attesa, reload]);

  // Appena un abbonamento valido compare, l'attesa finisce senza aspettare
  // l'ultimo giro.
  useEffect(() => {
    if (attesa && subs?.some((s) => s.status !== 'canceled')) setAttesa(false);
  }, [attesa, subs]);

  async function paga(venueId: string, plan: Plan) {
    setErrore(false);
    setInCorso(`${venueId}:${plan}`);
    const err = await apriPagamento(venueId, plan);
    if (err) {
      setErrore(true);
      setInCorso(null);
    }
    // Senza errore la pagina sta già andando su Stripe: si lascia il bottone
    // in attesa, o lampeggerebbe "pronto" un istante prima di sparire.
  }

  async function gestisci() {
    setErrore(false);
    setInCorso('portale');
    const err = await apriPannelloCliente();
    if (err) {
      setErrore(true);
      setInCorso(null);
    }
  }

  function statoDi(sub: Subscription | null) {
    if (!sub) return { stato: 'todo' as const, label: d.subs.noSubscription, nota: '' };
    if (sub.status === 'past_due') {
      return { stato: 'draft' as const, label: d.subs.pastDue, nota: d.subs.pastDueHint };
    }
    const quando = sub.endsAt ? dataLeggibile(sub.endsAt, locale) : '';
    const nota = !sub.endsAt
      ? d.subs.noEnd
      : sub.cancelAtPeriodEnd || sub.source === 'manual'
        ? fill(d.subs.endsOn, { data: quando })
        : fill(d.subs.renewsOn, { data: quando });
    return {
      stato: 'ready' as const,
      label: sub.source === 'manual' ? d.subs.granted : d.subs.active,
      nota,
    };
  }

  return (
    <div>
      {/* La via del ritorno va detta, o si resta in una pagina senza uscite */}
      <button
        type="button"
        onClick={indietro}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        {d.subs.back}
      </button>
      <PageTitle>{d.subs.title}</PageTitle>
      <PageIntro className="mb-8">{d.subs.intro}</PageIntro>

      {esito === 'fatto' && attesa && (
        <p className="mb-6 max-w-xl rounded-xl bg-[#FDF3E3] px-4 py-3 text-sm text-[#7A5418]">
          {d.subs.paidWait}
        </p>
      )}
      {esito === 'annullato' && (
        <p className="mb-6 max-w-xl text-sm text-gray-500">{d.subs.canceledPayment}</p>
      )}
      {errore && (
        <p className="mb-6 max-w-xl text-sm text-[#C0392B]">{d.subs.openError}</p>
      )}

      {!venues ? (
        <p className="text-sm text-gray-500">{d.common.loading}</p>
      ) : venues.length === 0 ? (
        <p className="max-w-xl text-sm text-gray-500">{d.subs.empty}</p>
      ) : (
        <div className="max-w-xl space-y-3">
          {venues.map((v) => {
            const sub = abbonamentoDi(subs, v.id);
            const { stato, label, nota } = statoDi(sub);
            return (
              <div key={v.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                    {v.venueName.trim() || d.home.unnamed}
                  </p>
                  <StatusPill stato={stato} label={label} />
                </div>
                {nota && <p className="mt-1 text-xs text-gray-500">{nota}</p>}

                {sub ? (
                  // L'abbonamento offerto da noi non ha niente da gestire su
                  // Stripe: non c'è una carta dietro.
                  sub.source === 'stripe' && (
                    <button
                      type="button"
                      onClick={gestisci}
                      disabled={inCorso !== null}
                      className="mt-4 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-400 disabled:opacity-40"
                    >
                      {d.subs.manage}
                    </button>
                  )
                ) : !SUBSCRIPTIONS ? (
                  // Interruttore spento: si dice al futuro, invece di mostrare
                  // un pagamento che oggi non darebbe niente.
                  <p className="mt-4 text-sm text-gray-500">{d.subs.soon}</p>
                ) : (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => paga(v.id, 'monthly')}
                      disabled={inCorso !== null}
                      className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                    >
                      {d.subs.monthly}
                    </button>
                    <button
                      type="button"
                      onClick={() => paga(v.id, 'yearly')}
                      disabled={inCorso !== null}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-400 disabled:opacity-40"
                    >
                      {d.subs.yearly}
                    </button>
                    <span className="text-xs text-gray-500">{d.subs.yearlyHint}</span>
                  </div>
                )}
                {!sub && SUBSCRIPTIONS && (
                  <p className="mt-2 text-xs text-gray-500">{d.subs.renewalNote}</p>
                )}

                {/* L'associazione al ristorante su AllergiApp non è ancora
                    costruita: si dice al futuro invece di promettere un
                    bottone che non farebbe niente. */}
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
                  <span className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                    {d.subs.notLinked}
                  </span>
                  <span className="text-xs text-gray-400">{d.common.comingSoon}</span>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-gray-500">{d.subs.billingHint}</p>
          <p className="text-xs text-gray-500">{d.subs.notFoundBridge}</p>
        </div>
      )}
    </div>
  );
}
