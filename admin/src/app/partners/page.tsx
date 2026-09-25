'use client';

// I PARTNER: chi si è iscritto al portale, cosa ha costruito, e l'abbonamento.
//
// Una riga per LOCALE e non per iscritto, perché è il locale che si abbona
// (1 abbonamento = 1 locale, MONETIZATION.md) ed è lì che cade il gesto.
// Gli iscritti senza nemmeno un locale non hanno una riga: si contano nella
// casella in cima, che è il primo gradino del percorso.
//
// Le righe arrivano da due funzioni del database (migration 717): l'email
// dell'iscritto sta in auth.users e dal browser non si legge.
//
// Niente paginazione, di proposito: i partner sono poche decine e lo saranno
// per un pezzo. Il giorno che non basta, si copia il pattern di Ristoranti.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/safeQuery';
import { confirmDestructive } from '@/lib/confirm';
import StatCard from '@/components/StatCard';
import Link from 'next/link';

interface PartnerVenue {
  venue_id: string;
  venue_name: string | null;
  slug: string | null;
  created_at: string;
  owner_user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  signed_up_at: string;
  menus_total: number;
  published_at: string | null;
  dishes_total: number;
  card_dishes_total: number;
  card_id: string | null;
  sub_id: string | null;
  sub_source: 'stripe' | 'manual' | null;
  sub_status: 'active' | 'past_due' | null;
  sub_plan: 'monthly' | 'yearly' | null;
  sub_started_at: string | null;
  sub_ends_at: string | null;
  sub_cancel_at_period_end: boolean | null;
  sub_note: string | null;
  sub_customer_id: string | null;
  past_subs: number;
  ex_canceled_at: string | null;
  ex_source: 'stripe' | 'manual' | null;
  ex_started_at: string | null;
  ex_ends_at: string | null;
  // Com'è la scheda nell'app (729): la stessa regola del portale
  card_state: 'none' | 'requested' | 'review' | 'suspended' | 'paused' | 'live' | 'expired';
  // Chi è ancora vivo (730): ultimo accesso al portale, ultima modifica qui
  last_sign_in_at: string | null;
  last_edit_at: string | null;
  // Ultima attività sul portale (735), letta a parte da partner_accounts
  last_seen_at?: string | null;
}

// «Ultimo accesso» come nella pagina Utenti: l'ultima volta che ha USATO il
// portale (735, aggiornata al massimo ogni ora), non l'ultimo login — che con
// la sessione aperta resta fermo per settimane. Il più recente dei due: anche
// un login è attività, e per chi non ha ancora riaperto il portale dopo la
// 735 resta almeno quello.
function ultimoAccesso(r: PartnerVenue): string | null {
  const date = [r.last_seen_at, r.last_sign_in_at].filter((x): x is string => !!x);
  if (date.length === 0) return null;
  return date.reduce((a, b) => (new Date(a) > new Date(b) ? a : b));
}

// Chi si è iscritto e non ha ancora creato un locale (725): nella tabella,
// che ha una riga per locale, non ci sarebbe.
interface AccountWithoutVenue {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  signed_up_at: string;
}

interface PartnerStats {
  accounts: number;
  accounts_with_venue: number;
  venues: number;
  venues_published: number;
  subs_paid: number;
  subs_granted: number;
  subs_past_due: number;
  mrr_cents: number;
  expiring_30d: number;
  new_accounts_30d: number;
  new_subs_30d: number;
  canceled_subs_30d: number;
  venues_churned: number;
}

// Il menù pubblico del locale, quello che si apre col QR.
const SITO = 'https://allergiapp.com';

// ⚠️ La dashboard di Stripe cambia indirizzo fra la prova e i pagamenti veri:
// oggi siamo nella sandbox, e il link va costruito col suo identificativo.
// Al passaggio in reale diventa 'https://dashboard.stripe.com/customers/'.
const STRIPE_CLIENTI = 'https://dashboard.stripe.com/acct_1T8Pk3AWJFZcd82B/test/customers/';

// IL PALLINO DELLO STATO, con gli stessi colori del portale partner
// (components/StatusPill.tsx là): verde in sala, ambra preparato ma non
// pubblicato, grigio niente. Gli esadecimali sono scritti a mano di
// proposito — i due progetti non condividono i token, e quello che deve
// combaciare è il COLORE visto da chi guarda le due schermate.
//
// ⚠️ Il colore non è mai l'unico canale: accanto resta scritto "pubblicato il…"
// o "mai pubblicato", per chi quei due colori non li distingue.
const COLORI_STATO = { ready: '#4CAF50', draft: '#E8A33D', todo: '#D1D5DB' };

function statoMenu(r: { published_at: string | null; menus_total: number }) {
  if (r.published_at) return { colore: COLORI_STATO.ready, titolo: 'Menù pubblicato' };
  if (r.menus_total > 0) return { colore: COLORI_STATO.draft, titolo: 'Menù preparato, non pubblicato' };
  return { colore: COLORI_STATO.todo, titolo: 'Nessun menù' };
}

function Pallino({ r }: { r: PartnerVenue }) {
  const { colore, titolo } = statoMenu(r);
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full inline-block"
      style={{ backgroundColor: colore }}
      title={titolo}
      aria-hidden="true"
    />
  );
}

// LA SCHEDA NELL'APP, una riga sola sotto il menù: pallino e parola. Verde
// solo se si vede davvero; ambra quando aspetta noi; rosso se l'abbiamo
// sospesa; grigio il resto. Il dettaglio sta nella pagina Associazioni.
const STATO_SCHEDA: Record<PartnerVenue['card_state'], { label: string; colore: string }> = {
  live: { label: 'attiva nell’app', colore: COLORI_STATO.ready },
  review: { label: 'in verifica', colore: COLORI_STATO.draft },
  requested: { label: 'richiesta in attesa', colore: COLORI_STATO.draft },
  suspended: { label: 'sospesa', colore: '#C0392B' },
  paused: { label: 'in pausa', colore: COLORI_STATO.todo },
  expired: { label: 'abbonamento finito', colore: COLORI_STATO.todo },
  none: { label: 'non associata', colore: COLORI_STATO.todo },
};

function RigaScheda({ r }: { r: PartnerVenue }) {
  // Prima della 729 la funzione non lo diceva: niente riga, invece di una sbagliata
  const stato = STATO_SCHEDA[r.card_state];
  if (!stato) return null;
  return (
    <p className="text-xs text-faint flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full inline-block" style={{ backgroundColor: stato.colore }} aria-hidden="true" />
      Scheda {stato.label}
    </p>
  );
}

function data(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Da quanto dura, detto come lo direbbe una persona. È il senso della
// colonna: "dal 3 marzo" non risponde da solo alla domanda sulla permanenza.
function daQuando(iso: string | null): string {
  if (!iso) return '';
  const giorni = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (giorni < 1) return 'da oggi';
  if (giorni < 30) return `da ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}`;
  const mesi = Math.floor(giorni / 30);
  if (mesi < 12) return `da ${mesi} ${mesi === 1 ? 'mese' : 'mesi'}`;
  const anni = Math.floor(giorni / 365);
  return `da ${anni} ${anni === 1 ? 'anno' : 'anni'}`;
}

function euro(cents: number): string {
  return `${(cents / 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

// L'intestazione che ordina. La freccia sta solo sulla colonna attiva: una
// freccia su ognuna direbbe "ordinate per quattro cose insieme", che non
// vuol dire niente.
type Campo = 'locale' | 'iscritto' | 'menu' | 'abbonamento';

function Intestazione({
  campo,
  attivo,
  crescente,
  onClick,
  children,
}: {
  campo: Campo;
  attivo: Campo;
  crescente: boolean;
  onClick: (campo: Campo) => void;
  children: React.ReactNode;
}) {
  const scelta = campo === attivo;
  // Stesso bottone e stesse frecce della pagina Utenti: due tabelle che si
  // ordinano allo stesso modo non devono sembrare due prodotti diversi.
  return (
    <th className="px-4 py-3 font-medium">
      <button
        type="button"
        onClick={() => onClick(campo)}
        className="inline-flex items-center gap-1 -mx-2 px-2 py-1 rounded hover:bg-muted"
      >
        {children}
        <span className="text-faint text-xs w-3 text-center">
          {scelta ? (crescente ? '▲' : '▼') : ''}
        </span>
      </button>
    </th>
  );
}

export default function PartnersPage() {
  const [rows, setRows] = useState<PartnerVenue[]>([]);
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [search, setSearch] = useState('');
  // Filtro e ordinamento vivono QUI e non nella funzione del database: le
  // righe sono poche e già scaricate, quindi si riordinano senza un viaggio
  // in più, e aggiungere un modo di guardarle non è una migration.
  const [filtro, setFiltro] = useState<
    | 'tutti'
    | 'paganti'
    | 'offerti'
    | 'senza'
    | 'ritardo'
    | 'pubblicati'
    | 'nonPubblicati'
    | 'disdetti'
  >('tutti');
  // DUE COSE DIVERSE, DUE LINGUETTE (richiesta dell'utente, 19/09): i locali,
  // con i loro filtri, e le persone iscritte che un locale non l'hanno
  // ancora. Stavano nella stessa fila di filtri, e «Tutti» sembrava dire
  // tutti gli iscritti mentre voleva dire tutti i locali.
  const [sezione, setSezione] = useState<'locali' | 'iscritti'>('locali');
  const [senzaLocale, setSenzaLocale] = useState<AccountWithoutVenue[]>([]);
  // L'ordinamento si comanda dalle intestazioni della tabella, come in ogni
  // tabella che si rispetti: il verso si inverte ripremendo la stessa.
  // Di partenza, i locali più recenti in cima.
  const [ordine, setOrdine] = useState<'locale' | 'iscritto' | 'menu' | 'abbonamento'>('iscritto');
  const [crescente, setCrescente] = useState(false);
  const [loading, setLoading] = useState(true);
  // Il locale a cui si sta concedendo l'abbonamento: null = nessun modulo aperto
  const [granting, setGranting] = useState<PartnerVenue | null>(null);
  // Ritirare dal web o liberare l'indirizzo: due gesti col loro motivo (730)
  const [azione, setAzione] = useState<{ tipo: 'ritira' | 'libera'; r: PartnerVenue } | null>(null);
  const [motivoAzione, setMotivoAzione] = useState('');
  const [note, setNote] = useState('');
  const [mesi, setMesi] = useState('12');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [venues, stat, iscritti] = await Promise.all([
      safeQuery(
        () => supabase.rpc('get_partner_venues_admin', { search_query: search.trim() || null }),
        'Partner',
      ),
      safeQuery(() => supabase.rpc('get_partner_stats_admin'), 'Numeri partner'),
      safeQuery(() => supabase.rpc('get_partner_accounts_without_venue_admin'), 'Iscritti senza locale'),
    ]);
    // L'ultima attività sul portale (735): da partner_accounts, che l'admin
    // legge direttamente. Se la colonna non c'è ancora, o la lettura fallisce,
    // resta l'ultimo login — non si rompe la pagina per un dato in più.
    const venueRows = (venues as PartnerVenue[]) ?? [];
    const ids = [...new Set(venueRows.map((r) => r.owner_user_id))];
    const visti = new Map<string, string | null>();
    if (ids.length > 0) {
      const { data: accounts } = await supabase
        .from('partner_accounts')
        .select('user_id, last_seen_at')
        .in('user_id', ids);
      for (const a of (accounts ?? []) as { user_id: string; last_seen_at: string | null }[]) {
        visti.set(a.user_id, a.last_seen_at);
      }
    }
    setRows(venueRows.map((r) => ({ ...r, last_seen_at: visti.get(r.owner_user_id) ?? null })));
    // La ricerca vale anche qui: nome, cognome, email
    const q = search.trim().toLowerCase();
    setSenzaLocale(
      ((iscritti as AccountWithoutVenue[]) ?? []).filter(
        (a) =>
          !q ||
          `${a.first_name} ${a.last_name} ${a.email ?? ''}`.toLowerCase().includes(q),
      ),
    );
    setStats(((stat as PartnerStats[]) ?? [])[0] ?? null);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    // Si rilegge mentre si scrive nella ricerca, ma non a ogni tasto
    const id = setTimeout(load, 300);
    return () => clearTimeout(id);
  }, [load]);

  const visibili = rows
    .filter((r) => {
      switch (filtro) {
        case 'paganti':
          return r.sub_source === 'stripe';
        case 'offerti':
          return r.sub_source === 'manual';
        case 'senza':
          return !r.sub_id;
        // Ex abbonati: l'abbonamento l'hanno avuto e oggi non ce l'hanno. È
        // la lista da cui si riparte, non un doppione di "senza abbonamento".
        case 'disdetti':
          return !r.sub_id && r.past_subs > 0;
        case 'ritardo':
          return r.sub_status === 'past_due';
        case 'pubblicati':
          return r.published_at !== null;
        // Chi il menù l'ha preparato e non l'ha mai portato al tavolo: è la
        // lista su cui si può fare qualcosa, più di "non pubblicati" in
        // generale, che comprende anche chi non ha ancora scritto un piatto.
        case 'nonPubblicati':
          return r.published_at === null && r.menus_total > 0;
        default:
          return true;
      }
    })
    .sort((a, b) => {
      // Chi non ha il dato finisce in fondo in tutt'e due i versi: un locale
      // senza abbonamento non è "il più vecchio", semplicemente non c'entra
      // con quella domanda.
      const vuoti = (x: string | null, y: string | null) =>
        !x && !y ? 0 : !x ? 1 : !y ? -1 : null;
      const verso = crescente ? 1 : -1;
      let cmp = 0;
      switch (ordine) {
        case 'locale':
          cmp = (a.venue_name ?? '').localeCompare(b.venue_name ?? '', 'it');
          break;
        case 'menu': {
          const v = vuoti(a.published_at, b.published_at);
          if (v !== null) return v;
          cmp = a.published_at!.localeCompare(b.published_at!);
          break;
        }
        case 'abbonamento': {
          const v = vuoti(a.sub_started_at, b.sub_started_at);
          if (v !== null) return v;
          cmp = a.sub_started_at!.localeCompare(b.sub_started_at!);
          break;
        }
        default:
          cmp = a.signed_up_at.localeCompare(b.signed_up_at);
      }
      return cmp * verso;
    });

  function ordina(campo: typeof ordine) {
    if (campo === ordine) setCrescente((c) => !c);
    else {
      setOrdine(campo);
      // Le date partono dalla più recente, i nomi dalla A: è quello che si
      // aspetta chi preme.
      setCrescente(campo === 'locale');
    }
  }

  const FILTRI: { id: typeof filtro; label: string }[] = [
    { id: 'tutti', label: 'Tutti' },
    { id: 'paganti', label: 'Paganti' },
    { id: 'offerti', label: 'Offerti' },
    { id: 'senza', label: 'Senza abbonamento' },
    { id: 'disdetti', label: 'Ex abbonati' },
    { id: 'ritardo', label: 'In ritardo' },
    { id: 'pubblicati', label: 'Menù pubblicato' },
    { id: 'nonPubblicati', label: 'Pronto, non pubblicato' },
  ];

  async function concedi() {
    if (!granting) return;
    setBusy(true);
    const n = parseInt(mesi, 10);
    const ends =
      Number.isFinite(n) && n > 0
        ? new Date(new Date().setMonth(new Date().getMonth() + n)).toISOString()
        : null; // senza mesi = senza scadenza
    // Il registro lo scrive il database (trigger della 721): qui niente.
    const { error } = await supabase
      .from('partner_subscriptions')
      .insert({
        venue_id: granting.venue_id,
        owner_user_id: granting.owner_user_id,
        source: 'manual',
        status: 'active',
        note: note.trim() || null,
        ends_at: ends,
      });
    setBusy(false);
    if (error) {
      alert(`Errore: ${error.message}`);
      return;
    }
    setGranting(null);
    setNote('');
    setMesi('12');
    load();
  }

  // RITIRA DAL WEB / LIBERA L'INDIRIZZO (730): il motivo è obbligatorio e
  // finisce nel registro, come ogni gesto dell'admin su un locale.
  async function confermaAzione() {
    if (!azione || !motivoAzione.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc(
      azione.tipo === 'ritira' ? 'admin_unpublish_menu' : 'admin_release_slug',
      { p_venue_id: azione.r.venue_id, p_note: motivoAzione.trim() },
    );
    setBusy(false);
    if (error) {
      alert(
        error.message === 'still_online'
          ? 'Prima ritira il menù dal web: un menù online non può restare senza indirizzo.'
          : `Errore: ${error.message}`,
      );
      return;
    }
    setAzione(null);
    setMotivoAzione('');
    load();
  }

  async function revoca(r: PartnerVenue) {
    if (!r.sub_id) return;
    if (!confirmDestructive(`Revocare l'abbonamento offerto a "${r.venue_name || 'locale senza nome'}"?`)) return;
    const { error } = await supabase
      .from('partner_subscriptions')
      .update({ status: 'canceled', canceled_at: new Date().toISOString() })
      .eq('id', r.sub_id);
    if (error) {
      alert(`Errore: ${error.message}`);
      return;
    }
    load();
  }

  // IL REGISTRO NON SI SCRIVE PIÙ DA QUI (19/09). Concedere e revocare sono
  // decisioni e vanno registrate, ma dalla 721 lo fa il database con un
  // trigger su partner_subscriptions, con l'identità di chi ha agito: non
  // dipende più dal fatto che il browser si ricordi di farlo, e la policy
  // che lasciava scrivere nel registro a qualunque utente non c'è più.

  // Quanto è durato l'abbonamento che si è chiuso: dice se quel ristoratore
  // ha provato una settimana o è stato con noi un anno, cioè quanto vale
  // riprovare a parlargli.
  function durataPassata(r: PartnerVenue): string {
    if (!r.ex_started_at) return '';
    const fine = new Date(r.ex_ends_at ?? r.ex_canceled_at ?? Date.now()).getTime();
    const giorni = Math.max(0, Math.floor((fine - new Date(r.ex_started_at).getTime()) / 86400000));
    if (giorni < 30) return `${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}`;
    const mesi = Math.round(giorni / 30);
    return `${mesi} ${mesi === 1 ? 'mese' : 'mesi'}`;
  }

  function abbonamento(r: PartnerVenue) {
    if (!r.sub_id) {
      // Un ex abbonato non è "nessuno": è qualcuno che c'era e se n'è andato.
      if (r.past_subs > 0) {
        const durata = durataPassata(r);
        return (
          <div>
            {/* La coppia usata nell'admin per il rosso tenue: il token
                danger-soft-foreground non esiste. */}
            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-danger-soft text-danger-strong">
              Disdetto
            </span>
            {r.ex_canceled_at && (
              <p className="text-xs text-faint mt-0.5">il {data(r.ex_canceled_at)}</p>
            )}
            <p className="text-xs text-faint">
              {r.ex_source === 'manual' ? 'era offerto' : 'aveva pagato'}
              {durata && ` · ${durata}`}
            </p>
          </div>
        );
      }
      return <span className="text-faint">Nessuno</span>;
    }
    if (r.sub_status === 'past_due') {
      return (
        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-warning-soft text-warning-soft-foreground">
          Pagamento in ritardo
        </span>
      );
    }
    const quando = r.sub_ends_at
      ? `${r.sub_cancel_at_period_end || r.sub_source === 'manual' ? 'fino al' : 'rinnovo'} ${data(r.sub_ends_at)}`
      : 'senza scadenza';
    // Da quando dura, e da qui la permanenza: "da 7 mesi" dice in un colpo
    // quello che una data da sola costringe a calcolare.
    const durata = daQuando(r.sub_started_at);
    if (r.sub_source === 'manual') {
      return (
        <div>
          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">Offerto</span>
          {durata && <p className="text-xs mt-0.5">{durata}</p>}
          <p className="text-xs text-faint">{quando}</p>
          {r.sub_note && <p className="text-xs text-faint italic">{r.sub_note}</p>}
        </div>
      );
    }
    return (
      <div>
        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-success-soft text-success-soft-foreground">
          {r.sub_plan === 'yearly' ? 'Annuale' : 'Mensile'}
        </span>
        {durata && <p className="text-xs mt-0.5">{durata}</p>}
        <p className="text-xs text-faint">{quando}</p>
        {r.sub_started_at && (
          <p className="text-xs text-faint">dal {data(r.sub_started_at)}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Partner</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {/* Il movimento sta dentro la casella del totale, non in una fila a
            parte: sono la stessa cosa guardata da vicino, e una riga di
            caselle in più per dire "+2" occupava mezzo schermo. */}
        {/* Dal numero ai nomi: porta alla linguetta di chi un locale non
            l'ha ancora (19/09) */}
        <StatCard
          label="Iscritti al portale"
          value={stats?.accounts ?? 0}
          hint={`· ${stats?.accounts_with_venue ?? 0} con un locale${
            stats?.new_accounts_30d ? ` · +${stats.new_accounts_30d} in 30g` : ''
          }`}
          onClick={() => setSezione('iscritti')}
        />
        <StatCard
          label="Locali"
          value={stats?.venues ?? 0}
          color="text-primary"
          hint={`· ${stats?.venues_published ?? 0} col menù pubblicato`}
        />
        <StatCard
          label="Abbonati paganti"
          value={stats?.subs_paid ?? 0}
          color="text-success"
          // Guadagni e perdite in una clausola sola ("+2 −1 in 30g"): sono
          // la stessa notizia, e separarle con un punto le faceva leggere
          // come due dati indipendenti.
          hint={`· ${stats?.subs_granted ?? 0} offerti${
            stats?.new_subs_30d || stats?.canceled_subs_30d
              ? ` · ${[
                  stats.new_subs_30d ? `+${stats.new_subs_30d}` : '',
                  stats.canceled_subs_30d ? `−${stats.canceled_subs_30d}` : '',
                ]
                  .filter(Boolean)
                  .join(' ')} in 30g`
              : ''
          }`}
        />
        {/* Ricavo mensile ricorrente: l'annuale conta un dodicesimo al mese,
            o un mese con due annuali sembrerebbe un'impennata. */}
        <StatCard
          label="Ricavo mensile"
          value={euro(stats?.mrr_cents ?? 0)}
          color="text-purple-600"
          hint={stats?.expiring_30d ? `· ${stats.expiring_30d} in scadenza 30g` : undefined}
        />
      </div>

      {/* Una riga sola per le due linguette e la ricerca: lo spazio sopra la
          tabella resta quello di prima, e la ricerca vale per tutt'e due. */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5" role="tablist">
          {(
            [
              { id: 'locali', label: 'Locali', n: rows.length },
              { id: 'iscritti', label: 'Iscritti senza locale', n: senzaLocale.length },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={sezione === t.id}
              onClick={() => setSezione(t.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
                sezione === t.id ? 'bg-selected text-selected-foreground' : 'text-foreground-secondary hover:bg-muted'
              }`}
            >
              {t.label}
              <span className="ml-1.5 opacity-60">{t.n}</span>
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={sezione === 'locali' ? 'Cerca per locale, nome o email…' : 'Cerca per nome o email…'}
          className="w-full md:w-80 px-3 py-2 rounded border border-border bg-card text-sm"
        />
      </div>

      {sezione === 'locali' && (
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTRI.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${
              filtro === f.id
                ? 'bg-selected text-selected-foreground border-selected'
                : 'bg-card text-foreground-secondary border-border'
            }`}
          >
            {f.label}
            {/* Il numero accanto evita il filtro che non mostra niente: si
                vede prima di premere quanto c'è dentro. */}
            {f.id !== 'tutti' && (
              <span className="ml-1.5 opacity-60">
                {rows.filter((r) =>
                  f.id === 'paganti' ? r.sub_source === 'stripe'
                  : f.id === 'offerti' ? r.sub_source === 'manual'
                  : f.id === 'senza' ? !r.sub_id
                  : f.id === 'disdetti' ? !r.sub_id && r.past_subs > 0
                  : f.id === 'ritardo' ? r.sub_status === 'past_due'
                  : f.id === 'nonPubblicati' ? r.published_at === null && r.menus_total > 0
                  : r.published_at !== null,
                ).length}
              </span>
            )}
          </button>
        ))}
      </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Caricamento...</p>
      ) : sezione === 'iscritti' ? (
        // Persone e non locali: una lista a sé, con quello che serve per
        // ricontattarle. Il più recente in cima.
        senzaLocale.length === 0 ? (
          <p className="text-muted-foreground">Nessun iscritto senza locale.</p>
        ) : (
          <div className="bg-card rounded-lg shadow overflow-hidden">
            <ul className="divide-y divide-border">
              {senzaLocale.map((a) => (
                // Nome sopra, contatti sotto: in fila finivano attaccati
                // appena la riga si stringeva (segnalato dall'utente, 20/09)
                <li key={a.user_id} className="px-4 py-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-1 text-sm">
                  <div className="min-w-0">
                    <Link href={`/users/${a.user_id}`} className="font-medium text-primary hover:underline">
                      {`${a.first_name} ${a.last_name}`.trim()}
                    </Link>
                    <p className="text-xs text-muted-foreground break-all">
                      {a.email}
                      {a.phone && ` · ${a.phone}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-faint">
                    iscritto il {data(a.signed_up_at)} · {daQuando(a.signed_up_at)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )
      ) : visibili.length === 0 ? (
        <p className="text-muted-foreground">
          {rows.length === 0 ? 'Nessun locale partner.' : 'Nessun locale con questo filtro.'}
        </p>
      ) : (
        <>
        {/* Desktop: tabella */}
        <div className="hidden md:block bg-card rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background text-left">
              <tr>
                <Intestazione campo="locale" attivo={ordine} crescente={crescente} onClick={ordina}>
                  Locale
                </Intestazione>
                <Intestazione campo="iscritto" attivo={ordine} crescente={crescente} onClick={ordina}>
                  Iscritto
                </Intestazione>
                <Intestazione campo="menu" attivo={ordine} crescente={crescente} onClick={ordina}>
                  Menù
                </Intestazione>
                <Intestazione campo="abbonamento" attivo={ordine} crescente={crescente} onClick={ordina}>
                  Abbonamento
                </Intestazione>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {visibili.map((r) => (
                <tr key={r.venue_id} className="border-t hover:bg-background">
                  <td className="px-4 py-3">
                    <p className="font-medium flex items-center gap-2">
                      <Pallino r={r} />
                      {r.venue_name?.trim() || 'Locale senza nome'}
                    </p>
                    {/* Il menù pubblico si apre solo se è stato pubblicato:
                        prima di allora quell'indirizzo non risponde a nessuno. */}
                    {r.slug && r.published_at ? (
                      <a
                        href={`${SITO}/menu/${r.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        /menu/{r.slug}
                      </a>
                    ) : (
                      <p className="text-xs text-faint">{r.slug ? `/menu/${r.slug}` : 'nessun indirizzo'}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {/* Nome e email su due righe: sono due link in linea, e
                        senza `block` finivano attaccati sulla stessa riga */}
                    <Link href={`/users/${r.owner_user_id}`} className="block text-primary hover:underline">
                      {`${r.first_name} ${r.last_name}`.trim()}
                    </Link>
                    {r.email ? (
                      <a href={`mailto:${r.email}`} className="flex items-start gap-1 text-xs text-primary hover:underline">
                        {/* La busta: dice che il link apre una mail */}
                        <svg className="mt-px h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <path d="M3.5 6.5L12 13l8.5-6.5" />
                        </svg>
                        <span className="min-w-0 break-all">{r.email}</span>
                      </a>
                    ) : (
                      <p className="text-xs text-faint">—</p>
                    )}
                    <p className="text-xs text-faint">iscritto il {data(r.signed_up_at)}</p>
                    {/* Chi ha mollato si riconosce da qui (730): se l'ultimo
                        accesso è vecchio e non ha mai pubblicato, è andato.
                        «Modificato il…» tolto il 25/09 (scelta dell'utente):
                        contava solo locale e menù, non catalogo, scheda e
                        risposte, e faceva sembrare fermo chi non lo era.
                        `last_edit_at` resta nella funzione, non letto. */}
                    <p className="text-xs text-faint">
                      ultimo accesso {ultimoAccesso(r) ? data(ultimoAccesso(r)!) : 'mai'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>
                      {r.menus_total} {r.menus_total === 1 ? 'menù' : 'menù'}
                    </p>
                    <p className="text-xs text-faint">
                      {r.published_at ? `pubblicato il ${data(r.published_at)}` : 'mai pubblicato'}
                    </p>
                    {/* Cosa ha costruito: il catalogo è dell'iscritto, i piatti
                        scelti sono di questo locale. */}
                    <p className="text-xs text-faint">
                      {r.dishes_total} {r.dishes_total === 1 ? 'piatto' : 'piatti'}
                      {r.card_dishes_total > 0 && ` (${r.card_dishes_total} sulla scheda)`}
                    </p>
                    <RigaScheda r={r} />
                  </td>
                  <td className="px-4 py-3">{abbonamento(r)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {!r.sub_id && (
                      <button
                        onClick={() => setGranting(r)}
                        className="px-3 py-1.5 rounded border border-border text-xs font-medium hover:bg-muted"
                      >
                        Concedi
                      </button>
                    )}
                    {/* Un abbonamento pagato non si revoca da qui: la disdetta
                        e il rimborso stanno su Stripe, e toccare solo la nostra
                        riga lascerebbe la carta a pagare ogni mese. */}
                    {r.sub_id && r.sub_source === 'manual' && (
                      <button
                        onClick={() => revoca(r)}
                        className="px-3 py-1.5 rounded border border-border text-xs font-medium text-danger hover:bg-muted"
                      >
                        Revoca
                      </button>
                    )}
                    {/* QUANDO UN RISTORATORE MOLLA (730): il menù esce dal
                        web e l'indirizzo torna disponibile. Uno alla volta e
                        in quest'ordine: il database non lascia liberare
                        l'indirizzo di un menù ancora online. */}
                    {r.published_at !== null && (
                      <button
                        onClick={() => setAzione({ tipo: 'ritira', r })}
                        className="px-3 py-1.5 rounded border border-border text-xs font-medium hover:bg-muted"
                      >
                        Ritira dal web
                      </button>
                    )}
                    {r.published_at === null && r.slug && (
                      <button
                        onClick={() => setAzione({ tipo: 'libera', r })}
                        className="px-3 py-1.5 rounded border border-border text-xs font-medium hover:bg-muted"
                      >
                        Libera indirizzo
                      </button>
                    )}
                    {r.sub_id && r.sub_source === 'stripe' && (
                      r.sub_customer_id ? (
                        <a
                          href={`${STRIPE_CLIENTI}${r.sub_customer_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded border border-border text-xs font-medium hover:bg-muted inline-block"
                        >
                          Apri su Stripe
                        </a>
                      ) : (
                        <span className="text-xs text-faint">su Stripe</span>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        {/* Mobile: card. Stessa scelta della pagina Utenti — una tabella a
            cinque colonne su un telefono si legge solo trascinandola. */}
        <div className="md:hidden space-y-2">
          {visibili.map((r) => (
            <div key={r.venue_id} className="bg-card rounded-lg shadow p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate flex items-center gap-2">
                    <Pallino r={r} />
                    {r.venue_name?.trim() || 'Locale senza nome'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    <Link href={`/users/${r.owner_user_id}`} className="text-primary hover:underline">
                      {`${r.first_name} ${r.last_name}`.trim()}
                    </Link>
                    {r.email && ` · ${r.email}`}
                  </p>
                  <p className="text-xs text-faint mt-0.5">
                    {r.menus_total} menù ·{' '}
                    {r.published_at ? `pubblicato il ${data(r.published_at)}` : 'mai pubblicato'}
                  </p>
                  <div className="mt-0.5">
                    <RigaScheda r={r} />
                  </div>
                </div>
                <div className="shrink-0 text-right">{abbonamento(r)}</div>
              </div>
              <div className="mt-2 flex justify-end gap-2">
                {!r.sub_id && (
                  <button
                    onClick={() => setGranting(r)}
                    className="px-3 py-1.5 rounded border border-border text-xs font-medium"
                  >
                    Concedi
                  </button>
                )}
                {r.sub_id && r.sub_source === 'manual' && (
                  <button
                    onClick={() => revoca(r)}
                    className="px-3 py-1.5 rounded border border-border text-xs font-medium text-danger"
                  >
                    Revoca
                  </button>
                )}
                {r.sub_id && r.sub_source === 'stripe' && r.sub_customer_id && (
                  <a
                    href={`${STRIPE_CLIENTI}${r.sub_customer_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded border border-border text-xs font-medium"
                  >
                    Apri su Stripe
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {azione && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAzione(null)}
        >
          <div className="bg-card rounded-xl shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold mb-1">
              {azione.tipo === 'ritira' ? 'Ritira il menù dal web' : 'Libera l’indirizzo'}
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              {azione.r.venue_name?.trim() || 'Locale senza nome'}
              {azione.r.slug ? ` · /menu/${azione.r.slug}` : ''}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              {azione.tipo === 'ritira'
                ? 'Chi inquadra il QR leggerà che il menù non è al momento disponibile. Menù, piatti e indirizzo restano al ristoratore, che può rimetterlo online.'
                : 'L’indirizzo resta riservato per 30 giorni, poi torna disponibile per tutti. Il ristoratore può sceglierne un altro quando vuole.'}
            </p>
            <label className="block text-xs text-faint mb-1">Motivo (obbligatorio: resta nel registro)</label>
            <input
              value={motivoAzione}
              onChange={(e) => setMotivoAzione(e.target.value)}
              placeholder="es. account abbandonato da mesi"
              className="w-full mb-4 px-3 py-2 rounded border border-border bg-card text-sm"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setAzione(null)} className="px-3 py-1.5 rounded border border-border text-sm">
                Annulla
              </button>
              <button
                onClick={confermaAzione}
                disabled={busy || !motivoAzione.trim()}
                className="px-3 py-1.5 rounded bg-danger text-white text-sm font-medium disabled:opacity-40"
              >
                {azione.tipo === 'ritira' ? 'Ritira' : 'Libera'}
              </button>
            </div>
          </div>
        </div>
      )}

      {granting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setGranting(null)}
        >
          <div
            className="bg-card rounded-xl shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold mb-1">Concedi l&apos;abbonamento</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {granting.venue_name?.trim() || 'Locale senza nome'}
            </p>

            <label className="block text-xs text-faint mb-1">Motivo (resta solo qui)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="es. fondatore, accordo, prova"
              className="w-full mb-3 px-3 py-2 rounded border border-border bg-card text-sm"
            />

            <label className="block text-xs text-faint mb-1">Per quanti mesi (vuoto = senza scadenza)</label>
            <input
              value={mesi}
              onChange={(e) => setMesi(e.target.value)}
              inputMode="numeric"
              className="w-full mb-4 px-3 py-2 rounded border border-border bg-card text-sm"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setGranting(null)}
                className="px-3 py-1.5 rounded border border-border text-sm"
              >
                Annulla
              </button>
              <button
                onClick={concedi}
                disabled={busy}
                className="px-3 py-1.5 rounded bg-primary text-white text-sm font-medium disabled:opacity-40"
              >
                Concedi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
