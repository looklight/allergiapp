'use client';

// IL RIQUADRO IN CIMA ALLA SCHEDA quando qualcosa impedisce che si veda
// nell'app, o aspetta noi. Uno solo per volta — quello che dice cardState()
// in lib/association.ts, la stessa regola della home e di Abbonamenti — e
// sempre nello stesso posto: chi apre la scheda trova lì la risposta a
// «perché non si vede?».
//
// Colore per chi deve muoversi: ambra quando si aspetta qualcosa (noi, o un
// piatto), rosso per la sospensione, grigio per quello che dipende dal
// ristoratore. Un solo gesto dentro, quando c'è quello che sblocca: riattivare
// la pausa, rinnovare l'abbonamento, riprovare dopo una richiesta respinta.
// Il resto (scollegare, mettere in pausa) sta nel riquadro in fondo alla
// pagina, dove si gestisce l'associazione.
//
// Non compare per 'none' (lo fa la riga «Associa il ristorante», che ha il
// suo bottone) né per 'live' (non c'è niente da dire).
import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { withdrawRequest, type CardState } from '@/lib/association';
import ConfirmDialog from './menus/ConfirmDialog';
import type { Venue } from '@/lib/venues';
import RestaurantPhrase from './RestaurantPhrase';

const TONI = {
  amber: 'border-amber-200 bg-[#FDF3E3] text-[#7A5418]',
  red: 'border-red-200 bg-red-50 text-red-800',
  gray: 'border-gray-200 bg-white text-gray-700',
};

export default function CardStateNotice({
  state,
  venue,
  linkHref,
  onResume,
  onChanged,
  busy,
}: {
  state: CardState;
  venue: Venue;
  // Dove porta «Associa il ristorante»: la ricerca, o prima gli abbonamenti
  linkHref: string;
  onResume: () => void;
  // Dopo un gesto fatto da qui (ritirare la richiesta): rileggere i locali
  onChanged: () => void;
  busy: boolean;
}) {
  const { d } = useI18n();
  const [ritira, setRitira] = useState(false);
  const [ritirando, setRitirando] = useState(false);
  const [errore, setErrore] = useState(false);

  async function confermaRitiro() {
    setRitira(false);
    if (!venue.request) return;
    setRitirando(true);
    setErrore(false);
    const esito = await withdrawRequest(venue.request.id);
    setRitirando(false);
    if ('error' in esito) setErrore(true);
    else onChanged();
  }
  const n = d.cardState.notice;
  const ristorante = {
    name: venue.cardRestaurant?.name ?? venue.request?.restaurantName ?? '',
    slug: venue.cardRestaurant?.slug ?? '',
  };

  let tono: keyof typeof TONI;
  let titolo: string;
  let testo: React.ReactNode;
  let dopo: React.ReactNode = null;

  switch (state) {
    case 'requested':
      tono = 'amber';
      titolo = n.requestedTitle;
      testo = <RestaurantPhrase template={n.requestedText} {...ristorante} />;
      // Il ripensamento (726): una richiesta in attesa tiene il locale, e
      // senza questo bottone lo terrebbe fino alla nostra decisione
      dopo = (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => setRitira(true)}
            disabled={ritirando}
            className="rounded-lg border border-current/30 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/50 disabled:opacity-40"
          >
            {d.cardState.withdraw}
          </button>
        </div>
      );
      break;
    case 'rejected':
      tono = 'gray';
      titolo = n.rejectedTitle;
      testo = <RestaurantPhrase template={n.rejectedText} {...ristorante} />;
      dopo = (
        <>
          <Motivo nota={venue.request?.note ?? ''} etichetta={n.reason} />
          <div className="mt-3 flex justify-end">
            <Link
              href={linkHref}
              className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            >
              {d.editor.linkBoxCta}
            </Link>
          </div>
        </>
      );
      break;
    case 'suspended':
      tono = 'red';
      titolo = n.suspendedTitle;
      testo = n.suspendedText;
      dopo = (
        <>
          <Motivo nota={venue.cardNote} etichetta={n.reason} />
          <p className="mt-2 text-sm">
            {n.contact}{' '}
            <a href="mailto:info@allergiapp.com" className="font-medium underline">
              info@allergiapp.com
            </a>
          </p>
        </>
      );
      break;
    case 'review':
      tono = 'amber';
      titolo = d.editor.reviewTitle;
      testo = <RestaurantPhrase template={d.editor.reviewText} {...ristorante} />;
      break;
    case 'paused':
      tono = 'gray';
      titolo = n.pausedTitle;
      testo = n.pausedText;
      dopo = (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onResume}
            disabled={busy}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
          >
            {d.cardState.resume}
          </button>
        </div>
      );
      break;
    case 'expired':
      tono = 'gray';
      titolo = n.expiredTitle;
      testo = <RestaurantPhrase template={n.expiredText} {...ristorante} />;
      dopo = (
        <div className="mt-3 flex justify-end">
          <Link
            href="/abbonamenti"
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            {d.dashboard.cardSubsManage}
          </Link>
        </div>
      );
      break;
    case 'noDishes':
      tono = 'amber';
      titolo = n.noDishesTitle;
      testo = n.noDishesText;
      break;
    default:
      return null;
  }

  return (
    <div className={`mb-6 rounded-2xl border p-4 ${TONI[tono]}`}>
      <p className="text-sm font-medium">{titolo}</p>
      <p className="mt-1 text-sm">{testo}</p>
      {dopo}
      {errore && <p className="mt-2 text-sm text-[#C0392B]">{d.cardState.actionError}</p>}
      {ritira && (
        <ConfirmDialog
          title={d.cardState.withdrawTitle}
          subject={venue.request?.restaurantName}
          body={d.cardState.withdrawBody}
          confirmLabel={d.cardState.withdraw}
          tone="neutral"
          onCancel={() => setRitira(false)}
          onConfirm={() => void confermaRitiro()}
        />
      )}
    </div>
  );
}

// Il motivo scritto dall'admin (DSA art. 17): si mostra intero, così com'è.
function Motivo({ nota, etichetta }: { nota: string; etichetta: string }) {
  if (!nota.trim()) return null;
  return (
    <p className="mt-2 text-sm">
      <span className="font-medium">{etichetta}</span> {nota}
    </p>
  );
}
