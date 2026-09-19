'use client';

// LE ASSOCIAZIONI FRA LOCALI PARTNER E RISTORANTI DELL'APP (parte 3 del
// collegamento; design in MONETIZATION.md «Associazione locale ↔ ristorante»).
//
// È un lavoro da smaltire, non un elenco da consultare: per questo è una
// pagina sua e non una sezione di Partner (che parla di locali e
// abbonamenti), e in cima c'è quello che aspetta noi.
//
//   Da approvare    ogni associazione nasce qui, anche quelle automatiche
//                   (721): la scheda compare in app solo dopo l'approvazione
//                   (724). Il controllo È la certificazione: la P.IVA sul
//                   sito dell'Agenzia delle Entrate (o l'esito di VIES), il
//                   nome dell'azienda accanto a quello del locale.
//   Richieste       ristorante già gestito da un altro account, o ritorno
//                   dopo una revoca: le due aziende affiancate (nodo 2).
//   Approvate       quelle in corso, per sospendere o revocare.
//   Chiuse          rifiutate, revocate, scollegate: lo storico.
//
// PARLA DA ADMIN, NON DA DATABASE (richiesta dell'utente, 19/09): una sola
// etichetta per associazione, detta per quello che significa per chi decide
// («Da approvare», «Visibile nell'app», «Approvata, non visibile…»), e non lo
// stato tecnico della riga — «Attiva» accanto a «Da controllare» sembrava
// «è online». Il gesto è «Approva», non «Visto». E «Rifiuta» è la revoca
// detta per quello che è quando l'associazione non era mai stata approvata.
//
// Le righe arrivano da due funzioni della 725 (l'email sta in auth.users).
// I gesti sono scritture dirette su partner_cards, sotto la policy admin:
// i trigger del database pretendono il motivo per sospendere e revocare,
// rifiutano il visto al proprio collegamento, e registrano tutto.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/safeQuery';

interface CardRow {
  card_id: string;
  status: 'active' | 'paused' | 'suspended' | 'revoked' | 'unlinked';
  status_note: string | null;
  status_changed_at: string;
  created_at: string;
  reviewed_at: string | null;
  visible: boolean;
  subscription_active: boolean;
  card_dishes_total: number;
  venue_id: string;
  venue_name: string | null;
  owner_user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string | null;
  restaurant_address: string | null;
  company_id: string;
  legal_name: string;
  country_code: string;
  vat_number: string;
  vat_status: 'vies_valid' | 'admin_verified' | 'vies_not_found' | 'unverified';
  vies_name: string | null;
  vies_address: string | null;
  vat_checked_at: string | null;
  same_vat_other_accounts: number;
}

interface RequestRow {
  request_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  message: string;
  decision_note: string | null;
  created_at: string;
  decided_at: string | null;
  venue_id: string;
  venue_name: string | null;
  owner_user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string | null;
  restaurant_address: string | null;
  legal_name: string;
  country_code: string;
  vat_number: string;
  vat_status: CardRow['vat_status'];
  vies_name: string | null;
  vies_address: string | null;
  reason: 'taken' | 'revoked';
  holder_venue_name: string | null;
  holder_first_name: string | null;
  holder_last_name: string | null;
  holder_email: string | null;
  holder_legal_name: string | null;
  holder_vat_number: string | null;
  holder_since: string | null;
  holder_status: string | null;
}

interface AuditRow {
  id: number;
  actor_user_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

// La pagina pubblica del ristorante, la stessa che l'app usa per condividerlo
const RISTORANTE = 'https://allergiapp.com/r/';
// Il servizio dell'Agenzia delle Entrate per controllare una P.IVA italiana
// (quello usato dall'utente il 19/09): VIES non conosce chi non fa scambi UE.
const VERIFICA_PIVA = 'https://telematici.agenziaentrate.gov.it/VerificaPIVA/Scegli.jsp';

const LIVE = ['active', 'paused', 'suspended'];

// Le sezioni di un'associazione (ristoratore, azienda, chi chiede, chi la
// tiene oggi): un contorno sottile e l'etichetta in maiuscoletto, come le
// caselle dei numeri (richiesta dell'utente, 19/09). Sobrie, ma si vede
// dove finisce l'una e comincia l'altra.
const SEZIONE = 'rounded-md border border-border p-3';
const ETICHETTA = 'text-xs text-faint uppercase tracking-wide mb-1';

// Le righe del registro, nelle parole dell'admin
const AZIONI: Record<string, string> = {
  card_created: 'Associato',
  card_status_changed: 'Stato cambiato',
  card_reviewed: 'Approvata',
  request_created: 'Richiesta inviata',
  request_decided: 'Richiesta decisa',
  request_withdrawn: 'Richiesta ritirata',
  company_changed: 'Dati aziendali cambiati',
  subscription_created: 'Abbonamento nato',
  subscription_changed: 'Abbonamento cambiato',
};

function data(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

function dataOra(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// UNA SOLA ETICHETTA PER ASSOCIAZIONE, dal punto di vista di chi decide.
// Stesse regole del portale (cardState) e del database
// (partner_card_visible): si dice la cosa che conta per prima.
//
// «Rifiutata» e «Revocata» sono lo stesso stato nel database (revoked):
// rifiutata è quella chiusa nel momento stesso in cui la si guardava per la
// prima volta — «Rifiuta» scrive stato e approvazione nella stessa
// istruzione, quindi le due date coincidono.
const TONI = {
  attesa: 'bg-warning-soft text-warning-soft-foreground',
  ok: 'bg-success-soft text-success-soft-foreground',
  neutro: 'bg-muted text-foreground',
  male: 'bg-danger-soft text-danger-strong',
};

function statoAdmin(r: CardRow): { label: string; tono: keyof typeof TONI; dettaglio?: string } {
  if (r.status === 'revoked') {
    const rifiutata =
      r.reviewed_at !== null &&
      Math.abs(new Date(r.reviewed_at).getTime() - new Date(r.status_changed_at).getTime()) < 1000;
    return { label: rifiutata ? 'Rifiutata' : 'Revocata', tono: 'male' };
  }
  if (r.status === 'unlinked') {
    return {
      label: 'Scollegata',
      tono: 'neutro',
      dettaglio: r.reviewed_at ? undefined : 'Scollegata dal ristoratore prima dell’approvazione',
    };
  }
  if (r.status === 'suspended') return { label: 'Sospesa', tono: 'male' };
  if (!r.reviewed_at) return { label: 'Da approvare', tono: 'attesa' };
  if (r.status === 'paused') return { label: 'In pausa', tono: 'neutro', dettaglio: 'Messa in pausa dal ristoratore' };
  if (r.visible) return { label: 'Visibile nell’app', tono: 'ok' };
  return {
    label: 'Approvata, non visibile',
    tono: 'neutro',
    dettaglio: !r.subscription_active
      ? 'L’abbonamento è finito'
      : r.card_dishes_total === 0
        ? 'Nessun piatto sulla scheda'
        : undefined,
  };
}

type Vista = 'approvare' | 'richieste' | 'approvate' | 'chiuse';

// Il gesto che chiede un motivo: sospendere, revocare, accogliere o
// respingere una richiesta. Il motivo lo legge il ristoratore (DSA art. 17).
type Gesto =
  | { tipo: 'sospendi' | 'revoca' | 'rifiuta'; card: CardRow }
  | { tipo: 'accogli' | 'respingi'; richiesta: RequestRow };

export default function AssociationsPage() {
  const [cards, setCards] = useState<CardRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState<Vista>('approvare');
  const [me, setMe] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [gesto, setGesto] = useState<Gesto | null>(null);
  const [motivo, setMotivo] = useState('');
  // Lo storico aperto: un locale alla volta, letto quando si apre
  const [storico, setStorico] = useState<{ venueId: string; righe: AuditRow[] | null } | null>(null);

  const load = useCallback(async () => {
    const [c, r, u] = await Promise.all([
      safeQuery(() => supabase.rpc('get_partner_cards_admin'), 'Associazioni'),
      safeQuery(() => supabase.rpc('get_partner_requests_admin'), 'Richieste'),
      supabase.auth.getUser(),
    ]);
    setCards((c as CardRow[]) ?? []);
    setRequests((r as RequestRow[]) ?? []);
    setMe(u.data.user?.id ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const daApprovare = cards.filter((c) => !c.reviewed_at);
  const inAttesa = requests.filter((r) => r.status === 'pending');
  const approvate = cards.filter((c) => c.reviewed_at && LIVE.includes(c.status));
  const chiuse = cards.filter((c) => c.reviewed_at && !LIVE.includes(c.status));

  // APPROVARE: una data, e il resto lo fanno i trigger (registro, azienda
  // verificata). Rifiutato dal database sul proprio collegamento (724).
  // Lo stesso gesto «archivia» un'associazione scollegata dal ristoratore
  // prima dell'approvazione: la toglie dalla coda, e i trigger non
  // verificano l'azienda di un collegamento chiuso (724, punto 8).
  async function approva(c: CardRow) {
    setBusy(true);
    const { error } = await supabase
      .from('partner_cards')
      .update({ reviewed_at: new Date().toISOString(), reviewed_by: me })
      .eq('id', c.card_id);
    setBusy(false);
    if (error) {
      alert(
        error.message === 'own_review'
          ? 'Non puoi approvare una tua associazione: lo deve fare un altro admin.'
          : `Errore: ${error.message}`,
      );
      return;
    }
    load();
  }

  // Togliere una sospensione: la scheda torna attiva, la nota se ne va da
  // sola (trigger della 721).
  async function togliSospensione(c: CardRow) {
    setBusy(true);
    const { error } = await supabase.from('partner_cards').update({ status: 'active' }).eq('id', c.card_id);
    setBusy(false);
    if (error) alert(`Errore: ${error.message}`);
    load();
  }

  async function conferma() {
    if (!gesto || !motivo.trim()) return;
    setBusy(true);
    let error: { message: string } | null = null;
    if ('card' in gesto) {
      // Rifiutare = revocare mentre la si approva: stato e data insieme, così
      // esce dalla coda e resta riconoscibile come «rifiutata».
      ({ error } = await supabase
        .from('partner_cards')
        .update({
          status: gesto.tipo === 'sospendi' ? 'suspended' : 'revoked',
          status_note: motivo.trim(),
          ...(gesto.tipo === 'rifiuta' ? { reviewed_at: new Date().toISOString(), reviewed_by: me } : {}),
        })
        .eq('id', gesto.card.card_id));
    } else {
      ({ error } = await supabase.rpc('admin_decide_card_request', {
        p_request_id: gesto.richiesta.request_id,
        p_accept: gesto.tipo === 'accogli',
        p_note: motivo.trim(),
      }));
    }
    setBusy(false);
    if (error) {
      alert(
        error.message === 'own_request'
          ? 'Non puoi decidere una tua richiesta: lo deve fare un altro admin.'
          : error.message === 'own_review'
            ? 'Non puoi rifiutare una tua associazione: lo deve fare un altro admin.'
            : `Errore: ${error.message}`,
      );
      return;
    }
    setGesto(null);
    setMotivo('');
    load();
  }

  async function apriStorico(venueId: string) {
    if (storico?.venueId === venueId) {
      setStorico(null);
      return;
    }
    setStorico({ venueId, righe: null });
    const righe = await safeQuery(
      () =>
        supabase
          .from('partner_audit_log')
          .select('id, actor_user_id, action, details, created_at')
          .eq('venue_id', venueId)
          .order('created_at', { ascending: false })
          .limit(50),
      'Storico',
    );
    setStorico({ venueId, righe: (righe as AuditRow[]) ?? [] });
  }

  const VISTE: { id: Vista; label: string; n: number }[] = [
    { id: 'approvare', label: 'Da approvare', n: daApprovare.length },
    { id: 'richieste', label: 'Richieste', n: inAttesa.length },
    { id: 'approvate', label: 'Approvate', n: approvate.length },
    { id: 'chiuse', label: 'Chiuse', n: chiuse.length },
  ];

  const elenco =
    vista === 'approvare' ? daApprovare : vista === 'approvate' ? approvate : vista === 'chiuse' ? chiuse : [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Associazioni</h1>
      <p className="text-sm text-muted-foreground mb-6">
        I locali partner collegati ai ristoranti dell&apos;app. Una scheda compare nell&apos;app solo dopo il
        approvazione: controlla l&apos;azienda e che il locale sia davvero il suo.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {VISTE.map((v) => (
          <button
            key={v.id}
            onClick={() => setVista(v.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${
              vista === v.id
                ? 'bg-selected text-selected-foreground border-selected'
                : 'bg-card text-foreground-secondary border-border'
            }`}
          >
            {v.label}
            <span className="ml-1.5 opacity-60">{v.n}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Caricamento...</p>
      ) : vista === 'richieste' ? (
        requests.length === 0 ? (
          <p className="text-muted-foreground">Nessuna richiesta.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((q) => (
              <Richiesta
                key={q.request_id}
                q={q}
                mia={q.owner_user_id === me}
                busy={busy}
                onDecidi={(tipo) => {
                  setMotivo('');
                  setGesto({ tipo, richiesta: q });
                }}
              />
            ))}
          </div>
        )
      ) : elenco.length === 0 ? (
        <p className="text-muted-foreground">
          {vista === 'approvare' ? 'Niente da approvare.' : 'Nessuna associazione qui.'}
        </p>
      ) : (
        <div className="space-y-3">
          {elenco.map((c) => (
            <div key={c.card_id} className="bg-card rounded-lg shadow p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {c.venue_name?.trim() || 'Locale senza nome'}
                    <span className="text-faint font-normal"> → </span>
                    {c.restaurant_slug ? (
                      <a
                        href={`${RISTORANTE}${c.restaurant_slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {c.restaurant_name}
                      </a>
                    ) : (
                      c.restaurant_name
                    )}
                  </p>
                  {/* Sulla riga dell'indirizzo, piccolo ma riconoscibile come
                      bottone, e in una scheda nuova (richiesta dell'utente,
                      19/09): si guarda il ristorante e si torna qui a
                      decidere, senza perdere il punto della coda. */}
                  <p className="text-xs text-faint mt-0.5">
                    {c.restaurant_address}
                    <a
                      href={`/restaurants/${c.restaurant_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 inline-block px-1.5 py-px rounded border border-border text-[11px] font-medium text-foreground hover:bg-muted"
                    >
                      Scheda del ristorante ↗
                    </a>
                  </p>
                </div>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TONI[statoAdmin(c).tono]}`}
                >
                  {statoAdmin(c).label}
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-3 mt-3 text-sm">
                <div className={SEZIONE}>
                  <p className={ETICHETTA}>Ristoratore</p>
                  <p>
                    {`${c.first_name} ${c.last_name}`.trim()}
                    {c.email && <span className="text-muted-foreground"> · {c.email}</span>}
                  </p>
                  <p className="text-xs text-faint mt-1">
                    Associato il {data(c.created_at)}
                    {c.status_changed_at !== c.created_at && ` · stato cambiato il ${data(c.status_changed_at)}`}
                  </p>
                  {statoAdmin(c).dettaglio && <p className="text-xs text-faint">{statoAdmin(c).dettaglio}</p>}
                  {c.status_note && (
                    <p className="text-xs mt-1">
                      <span className="text-faint">Motivo: </span>
                      {c.status_note}
                    </p>
                  )}
                </div>
                <Azienda
                  legal={c.legal_name}
                  country={c.country_code}
                  vat={c.vat_number}
                  status={c.vat_status}
                  viesName={c.vies_name}
                  viesAddress={c.vies_address}
                  altri={c.same_vat_other_accounts}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={() => apriStorico(c.venue_id)}
                  className="mr-auto text-xs text-faint hover:text-foreground"
                  aria-expanded={storico?.venueId === c.venue_id}
                >
                  {storico?.venueId === c.venue_id ? 'Chiudi storico' : 'Storico del locale'}
                </button>
                <Gesti
                  c={c}
                  mia={c.owner_user_id === me}
                  busy={busy}
                  onApprova={() => approva(c)}
                  onTogliSospensione={() => togliSospensione(c)}
                  onMotivo={(tipo) => {
                    setMotivo('');
                    setGesto({ tipo, card: c });
                  }}
                />
              </div>

              {storico?.venueId === c.venue_id && (
                <Storico righe={storico.righe} owner={c.owner_user_id} />
              )}
            </div>
          ))}
        </div>
      )}

      {gesto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setGesto(null)}
        >
          <div className="bg-card rounded-xl shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold mb-1">
              {gesto.tipo === 'sospendi'
                ? 'Sospendi la scheda'
                : gesto.tipo === 'rifiuta'
                  ? "Rifiuta l'associazione"
                  : gesto.tipo === 'revoca'
                  ? "Revoca l'associazione"
                  : gesto.tipo === 'accogli'
                    ? 'Accogli la richiesta'
                    : 'Respingi la richiesta'}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {'card' in gesto
                ? `${gesto.card.venue_name?.trim() || 'Locale senza nome'} → ${gesto.card.restaurant_name}`
                : `${gesto.richiesta.venue_name?.trim() || 'Locale senza nome'} → ${gesto.richiesta.restaurant_name}`}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              {gesto.tipo === 'sospendi'
                ? 'La scheda sparisce dall’app finché non togli la sospensione. Il ristoratore legge il motivo nel portale e non può scollegarsi.'
                : gesto.tipo === 'rifiuta'
                  ? 'L’associazione si chiude senza essere mai stata visibile, e il ristorante torna libero. Il ristoratore legge il motivo e non può riassociarlo da solo: servirà una richiesta.'
                  : gesto.tipo === 'revoca'
                  ? 'L’associazione si chiude e il ristorante torna libero. Il ristoratore legge il motivo e non può riassociarlo da solo: servirà una richiesta.'
                  : gesto.tipo === 'accogli'
                    ? gesto.richiesta.reason === 'taken'
                      ? 'Il gestore attuale viene revocato con questo motivo, e chi ha chiesto è associato subito, già controllato.'
                      : 'Chi ha chiesto è associato di nuovo, già controllato.'
                    : 'La richiesta si chiude. Chi l’ha fatta legge il motivo nel portale.'}
            </p>
            <label className="block text-xs text-faint mb-1">
              Motivo (obbligatorio: lo legge il ristoratore
              {'richiesta' in gesto &&
                gesto.tipo === 'accogli' &&
                gesto.richiesta.reason === 'taken' &&
                ', e anche il gestore revocato'}
              )
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              className="w-full mb-4 px-3 py-2 rounded border border-border bg-card text-sm"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setGesto(null)} className="px-3 py-1.5 rounded border border-border text-sm">
                Annulla
              </button>
              <button
                onClick={conferma}
                disabled={busy || !motivo.trim()}
                className={`px-3 py-1.5 rounded text-white text-sm font-medium disabled:opacity-40 ${
                  gesto.tipo === 'accogli' ? 'bg-primary' : 'bg-danger'
                }`}
              >
                {gesto.tipo === 'sospendi'
                  ? 'Sospendi'
                  : gesto.tipo === 'rifiuta'
                    ? 'Rifiuta'
                    : gesto.tipo === 'revoca'
                      ? 'Revoca'
                      : gesto.tipo === 'accogli'
                        ? 'Accogli'
                        : 'Respingi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// I PULSANTI GIUSTI PER OGNI SITUAZIONE, e solo quelli:
//   da approvare             Rifiuta · Approva
//   scollegata prima         Archivia (la toglie dalla coda)
//   approvata                Sospendi · Revoca
//   sospesa                  Togli la sospensione · Revoca
// Sulla propria associazione approvare e rifiutare sono spenti: il database
// li rifiuterebbe comunque (724), e il pulsante spento dice perché.
function Gesti({
  c,
  mia,
  busy,
  onApprova,
  onTogliSospensione,
  onMotivo,
}: {
  c: CardRow;
  mia: boolean;
  busy: boolean;
  onApprova: () => void;
  onTogliSospensione: () => void;
  onMotivo: (tipo: 'sospendi' | 'revoca' | 'rifiuta') => void;
}) {
  const secondario = 'px-3 py-1.5 rounded border border-border text-xs font-medium disabled:opacity-40';
  const primario = 'px-3 py-1.5 rounded bg-primary text-white text-xs font-medium disabled:opacity-40';
  const perMia = mia ? 'Una tua associazione: la decide un altro admin' : undefined;

  if (!c.reviewed_at && c.status === 'unlinked') {
    return (
      <button onClick={onApprova} disabled={busy || mia} title={perMia} className={secondario}>
        Archivia
      </button>
    );
  }
  if (c.status === 'suspended') {
    return (
      <>
        <button onClick={onTogliSospensione} disabled={busy} className={secondario}>
          Togli la sospensione
        </button>
        <button onClick={() => onMotivo(c.reviewed_at ? 'revoca' : 'rifiuta')} disabled={busy} className={`${secondario} text-danger`}>
          {c.reviewed_at ? 'Revoca' : 'Rifiuta'}
        </button>
      </>
    );
  }
  if (!c.reviewed_at) {
    return (
      <>
        <button onClick={() => onMotivo('rifiuta')} disabled={busy || mia} title={perMia} className={`${secondario} text-danger`}>
          Rifiuta
        </button>
        <button onClick={onApprova} disabled={busy || mia} title={perMia} className={primario}>
          Approva
        </button>
      </>
    );
  }
  if (LIVE.includes(c.status)) {
    return (
      <>
        <button onClick={() => onMotivo('sospendi')} disabled={busy} className={secondario}>
          Sospendi
        </button>
        <button onClick={() => onMotivo('revoca')} disabled={busy} className={`${secondario} text-danger`}>
          Revoca
        </button>
      </>
    );
  }
  return null;
}

// L'azienda che ha dichiarato il collegamento, con quello che serve a
// controllarla: l'esito di VIES (nome e sede, se li ha dati) e il servizio
// dell'Agenzia delle Entrate per le P.IVA italiane che VIES non conosce.
function Azienda({
  legal,
  country,
  vat,
  status,
  viesName,
  viesAddress,
  altri,
  sezione = true,
}: {
  legal: string;
  country: string;
  vat: string;
  status: CardRow['vat_status'];
  viesName: string | null;
  viesAddress: string | null;
  altri: number;
  sezione?: boolean;
}) {
  const esito =
    status === 'vies_valid'
      ? { label: 'Confermata da VIES', stile: 'text-success' }
      : status === 'admin_verified'
        ? { label: 'Verificata da un admin', stile: 'text-success' }
        : status === 'vies_not_found'
          ? { label: 'Non trovata in VIES', stile: 'text-warning' }
          : { label: 'Non verificata', stile: 'text-warning' };
  return (
    <div className={sezione ? SEZIONE : ''}>
      <p className={ETICHETTA}>Azienda</p>
      <p>
        {legal}
        <span className="text-muted-foreground">
          {' · '}
          {country} {vat}
        </span>
      </p>
      <p className={`text-xs mt-1 ${esito.stile}`}>{esito.label}</p>
      {/* ⚠️ Per una ditta individuale la sede è spesso la casa del
          titolare: si guarda qui e basta (MONETIZATION.md, 19/09). */}
      {(viesName || viesAddress) && (
        <p className="text-xs text-faint">
          VIES: {viesName}
          {viesAddress && ` · ${viesAddress}`}
        </p>
      )}
      {country === 'IT' && status !== 'vies_valid' && (
        <a href={VERIFICA_PIVA} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
          Verifica la P.IVA sull&apos;Agenzia delle Entrate
        </a>
      )}
      {altri > 0 && (
        <p className="text-xs text-warning mt-1">
          La stessa P.IVA è dichiarata da {altri} {altri === 1 ? 'altro account' : 'altri account'}
        </p>
      )}
    </div>
  );
}

function Richiesta({
  q,
  mia,
  busy,
  onDecidi,
}: {
  q: RequestRow;
  mia: boolean;
  busy: boolean;
  onDecidi: (tipo: 'accogli' | 'respingi') => void;
}) {
  const stato =
    q.status === 'pending'
      ? { label: 'In attesa', stile: 'bg-warning-soft text-warning-soft-foreground' }
      : q.status === 'accepted'
        ? { label: 'Accolta', stile: 'bg-success-soft text-success-soft-foreground' }
        : q.status === 'withdrawn'
          ? { label: 'Ritirata', stile: 'bg-muted text-foreground' }
          : { label: 'Respinta', stile: 'bg-muted text-foreground' };
  return (
    <div className="bg-card rounded-lg shadow p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="font-medium min-w-0">
          {q.venue_name?.trim() || 'Locale senza nome'}
          <span className="text-faint font-normal"> chiede </span>
          {q.restaurant_slug ? (
            <a
              href={`${RISTORANTE}${q.restaurant_slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {q.restaurant_name}
            </a>
          ) : (
            q.restaurant_name
          )}
        </p>
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${stato.stile}`}>{stato.label}</span>
      </div>
      <p className="text-xs text-faint mt-0.5">
        {q.reason === 'taken' ? 'Il ristorante è gestito da un altro account' : 'Il ristorante era stato revocato a chi chiede'}
        {' · '}il {data(q.created_at)}
      </p>

      <blockquote className="mt-3 border-l-2 border-border pl-3 text-sm whitespace-pre-line">{q.message}</blockquote>

      <div className="grid md:grid-cols-2 gap-3 mt-3 text-sm">
        <div className={SEZIONE}>
          <p className={ETICHETTA}>Chi chiede</p>
          <p>
            {`${q.first_name} ${q.last_name}`.trim()}
            {q.email && <span className="text-muted-foreground"> · {q.email}</span>}
          </p>
          <div className="mt-3 border-t border-border pt-3">
            <Azienda
              legal={q.legal_name}
              country={q.country_code}
              vat={q.vat_number}
              status={q.vat_status}
              viesName={q.vies_name}
              viesAddress={q.vies_address}
              altri={0}
              sezione={false}
            />
          </div>
        </div>
        {q.reason === 'taken' && (
          <div className={SEZIONE}>
            {/* Non avvisato della richiesta (nodo 2): lo sarà solo della
                decisione, se va contro di lui. */}
            <p className={ETICHETTA}>Chi lo gestisce oggi</p>
            <p>
              {q.holder_venue_name?.trim() || 'Locale senza nome'}
              <span className="text-muted-foreground">
                {' · '}
                {`${q.holder_first_name ?? ''} ${q.holder_last_name ?? ''}`.trim()}
                {q.holder_email && ` · ${q.holder_email}`}
              </span>
            </p>
            <p className="text-xs text-faint mt-1">
              {q.holder_legal_name} · {q.holder_vat_number} · dal {data(q.holder_since)}
            </p>
          </div>
        )}
      </div>

      {q.status !== 'pending' && q.decision_note && (
        <p className="text-xs mt-3">
          <span className="text-faint">Motivo della decisione ({data(q.decided_at)}): </span>
          {q.decision_note}
        </p>
      )}

      {q.status === 'pending' && (
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={() => onDecidi('respingi')}
            disabled={busy || mia}
            className="px-3 py-1.5 rounded border border-border text-xs font-medium disabled:opacity-40"
          >
            Respingi
          </button>
          <button
            onClick={() => onDecidi('accogli')}
            disabled={busy || mia}
            title={mia ? 'Una tua richiesta: la decide un altro admin' : undefined}
            className="px-3 py-1.5 rounded bg-primary text-white text-xs font-medium disabled:opacity-40"
          >
            Accogli
          </button>
        </div>
      )}
    </div>
  );
}

// Lo storico del locale dal registro (721): chi ha fatto cosa, e il motivo.
// Chi: il ristoratore (è il proprietario del locale), il sistema (Stripe, il
// giro notturno: nessun utente), oppure un admin.
function Storico({ righe, owner }: { righe: AuditRow[] | null; owner: string }) {
  if (righe === null) return <p className="mt-3 text-xs text-faint">Caricamento...</p>;
  if (righe.length === 0) return <p className="mt-3 text-xs text-faint">Nessuna riga nel registro.</p>;
  return (
    <ul className="mt-3 border-t border-border pt-3 space-y-1.5">
      {righe.map((r) => {
        const chi = r.actor_user_id === null ? 'sistema' : r.actor_user_id === owner ? 'ristoratore' : 'admin';
        const dettagli = r.details ?? {};
        // I dati aziendali cambiano come «prima → dopo» (726); gli stati come
        // «da → a». Una P.IVA cambiata rimanda l'associazione da approvare.
        const azienda = r.action === 'company_changed';
        const prima = dettagli.from as { legal_name?: string; vat?: string } | string | undefined;
        const dopo = dettagli.to as { legal_name?: string; vat?: string } | string | undefined;
        const stato = azienda
          ? `${typeof prima === 'object' ? `${prima?.legal_name} (${prima?.vat})` : ''} → ${
              typeof dopo === 'object' ? `${dopo?.legal_name} (${dopo?.vat})` : ''
            }${dettagli.back_to_review ? ' · torna da approvare' : ''}`
          : [prima, dopo].filter(Boolean).join(' → ');
        const nota = (dettagli.note ?? dettagli.decision_note) as string | undefined;
        return (
          <li key={r.id} className="text-xs flex flex-wrap gap-x-2">
            <span className="text-faint w-36 shrink-0">{dataOra(r.created_at)}</span>
            <span className="font-medium">{AZIONI[r.action] ?? r.action}</span>
            {stato && <span className="text-muted-foreground">{stato}</span>}
            {typeof dettagli.restaurant_name === 'string' && (
              <span className="text-muted-foreground">{dettagli.restaurant_name}</span>
            )}
            <span className="text-faint">· {chi}</span>
            {nota && <span className="basis-full pl-38 text-muted-foreground italic">{nota}</span>}
          </li>
        );
      })}
    </ul>
  );
}
