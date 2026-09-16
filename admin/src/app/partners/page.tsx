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
}

// Il menù pubblico del locale, quello che si apre col QR.
const SITO = 'https://allergiapp.com';

// ⚠️ La dashboard di Stripe cambia indirizzo fra la prova e i pagamenti veri:
// oggi siamo nella sandbox, e il link va costruito col suo identificativo.
// Al passaggio in reale diventa 'https://dashboard.stripe.com/customers/'.
const STRIPE_CLIENTI = 'https://dashboard.stripe.com/acct_1T8Pk3AWJFZcd82B/test/customers/';

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

export default function PartnersPage() {
  const [rows, setRows] = useState<PartnerVenue[]>([]);
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [search, setSearch] = useState('');
  // Filtro e ordinamento vivono QUI e non nella funzione del database: le
  // righe sono poche e già scaricate, quindi si riordinano senza un viaggio
  // in più, e aggiungere un modo di guardarle non è una migration.
  const [filtro, setFiltro] = useState<'tutti' | 'paganti' | 'offerti' | 'senza' | 'ritardo' | 'pubblicati'>('tutti');
  const [ordine, setOrdine] = useState<'recenti' | 'nome' | 'abbonato' | 'scadenza'>('recenti');
  const [loading, setLoading] = useState(true);
  // Il locale a cui si sta concedendo l'abbonamento: null = nessun modulo aperto
  const [granting, setGranting] = useState<PartnerVenue | null>(null);
  const [note, setNote] = useState('');
  const [mesi, setMesi] = useState('12');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [venues, stat] = await Promise.all([
      safeQuery(
        () => supabase.rpc('get_partner_venues_admin', { search_query: search.trim() || null }),
        'Partner',
      ),
      safeQuery(() => supabase.rpc('get_partner_stats_admin'), 'Numeri partner'),
    ]);
    setRows((venues as PartnerVenue[]) ?? []);
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
        case 'ritardo':
          return r.sub_status === 'past_due';
        case 'pubblicati':
          return r.published_at !== null;
        default:
          return true;
      }
    })
    .sort((a, b) => {
      switch (ordine) {
        case 'nome':
          return (a.venue_name ?? '').localeCompare(b.venue_name ?? '', 'it');
        case 'abbonato':
          // I più vecchi per primi: chi resta da più tempo è la notizia buona.
          // Chi non è abbonato non ha una data e scende in fondo.
          if (!a.sub_started_at) return 1;
          if (!b.sub_started_at) return -1;
          return a.sub_started_at.localeCompare(b.sub_started_at);
        case 'scadenza':
          // Le scadenze vicine per prime; senza scadenza, in fondo.
          if (!a.sub_ends_at) return 1;
          if (!b.sub_ends_at) return -1;
          return a.sub_ends_at.localeCompare(b.sub_ends_at);
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    });

  const FILTRI: { id: typeof filtro; label: string }[] = [
    { id: 'tutti', label: 'Tutti' },
    { id: 'paganti', label: 'Paganti' },
    { id: 'offerti', label: 'Offerti' },
    { id: 'senza', label: 'Senza abbonamento' },
    { id: 'ritardo', label: 'In ritardo' },
    { id: 'pubblicati', label: 'Menù in sala' },
  ];

  async function concedi() {
    if (!granting) return;
    setBusy(true);
    const n = parseInt(mesi, 10);
    const ends =
      Number.isFinite(n) && n > 0
        ? new Date(new Date().setMonth(new Date().getMonth() + n)).toISOString()
        : null; // senza mesi = senza scadenza
    const { data: nuovo, error } = await supabase
      .from('partner_subscriptions')
      .insert({
        venue_id: granting.venue_id,
        owner_user_id: granting.owner_user_id,
        source: 'manual',
        status: 'active',
        note: note.trim() || null,
        ends_at: ends,
      })
      .select('id')
      .single();
    setBusy(false);
    if (error) {
      alert(`Errore: ${error.message}`);
      return;
    }
    await registra('subscription_granted', granting, { note: note.trim() || null, ends_at: ends, subscription_id: nuovo?.id });
    setGranting(null);
    setNote('');
    setMesi('12');
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
    await registra('subscription_revoked', r, { subscription_id: r.sub_id, note: r.sub_note });
    load();
  }

  // Concedere e revocare sono decisioni, non dati: se non si scrivono mentre
  // accadono non si ricostruiscono più. Il registro esiste dalla 700 e la sua
  // policy vuole che chi scrive firmi con la propria identità.
  async function registra(azione: string, r: PartnerVenue, dettagli: Record<string, unknown>) {
    const { data: sessione } = await supabase.auth.getUser();
    const { error } = await supabase.from('partner_audit_log').insert({
      actor_user_id: sessione.user?.id,
      venue_id: r.venue_id,
      card_id: r.card_id,
      action: azione,
      details: dettagli,
    });
    // Un registro che non scrive non deve far fallire il gesto: l'abbonamento
    // è già stato concesso, e questo si vede nei log del browser.
    if (error) console.error('[partner_audit_log]', error.message, error);
  }

  function abbonamento(r: PartnerVenue) {
    if (!r.sub_id) return <span className="text-faint">Nessuno</span>;
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
        <StatCard
          label="Iscritti al portale"
          value={stats?.accounts ?? 0}
          hint={`· ${stats?.accounts_with_venue ?? 0} con un locale`}
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
          hint={`· ${stats?.subs_granted ?? 0} offerti`}
        />
        {/* Ricavo mensile ricorrente: l'annuale conta un dodicesimo al mese,
            o un mese con due annuali sembrerebbe un'impennata. */}
        <StatCard
          label="Ricavo mensile"
          value={euro(stats?.mrr_cents ?? 0)}
          color="text-purple-600"
          hint={stats?.expiring_30d ? `· ${stats.expiring_30d} in scadenza a 30gg` : undefined}
        />
      </div>

      {/* IL MOVIMENTO compare solo quando c'è: una fila di zeri fissi smette
          di essere letta, e si porta dietro le caselle accanto. */}
      {stats && (stats.new_accounts_30d > 0 || stats.new_subs_30d > 0 || stats.canceled_subs_30d > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {stats.new_accounts_30d > 0 && (
            <StatCard label="Nuovi iscritti · 30gg" value={stats.new_accounts_30d} />
          )}
          {stats.new_subs_30d > 0 && (
            <StatCard label="Nuovi abbonamenti · 30gg" value={stats.new_subs_30d} color="text-success" />
          )}
          {stats.canceled_subs_30d > 0 && (
            <StatCard label="Disdette · 30gg" value={stats.canceled_subs_30d} color="text-danger" />
          )}
        </div>
      )}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cerca per locale, nome o email…"
        className="w-full md:w-96 mb-3 px-3 py-2 rounded border border-border bg-card text-sm"
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTRI.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              filtro === f.id
                ? 'bg-primary text-white border-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
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
                  : f.id === 'ritardo' ? r.sub_status === 'past_due'
                  : r.published_at !== null,
                ).length}
              </span>
            )}
          </button>
        ))}

        <select
          value={ordine}
          onChange={(e) => setOrdine(e.target.value as typeof ordine)}
          className="ml-auto px-3 py-1.5 rounded border border-border bg-card text-xs"
        >
          <option value="recenti">Locali più recenti</option>
          <option value="nome">Nome del locale</option>
          <option value="abbonato">Abbonati da più tempo</option>
          <option value="scadenza">Scadenza più vicina</option>
        </select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Caricamento...</p>
      ) : visibili.length === 0 ? (
        <p className="text-muted-foreground">
          {rows.length === 0 ? 'Nessun locale partner.' : 'Nessun locale con questo filtro.'}
        </p>
      ) : (
        <div className="bg-card rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-faint border-b border-border">
              <tr>
                <th className="px-4 py-3">Locale</th>
                <th className="px-4 py-3">Iscritto</th>
                <th className="px-4 py-3">Menù</th>
                <th className="px-4 py-3">Abbonamento</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {visibili.map((r) => (
                <tr key={r.venue_id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.venue_name?.trim() || 'Locale senza nome'}</p>
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
                    <p>{`${r.first_name} ${r.last_name}`.trim()}</p>
                    {r.email ? (
                      <a href={`mailto:${r.email}`} className="text-xs text-primary hover:underline">
                        {r.email}
                      </a>
                    ) : (
                      <p className="text-xs text-faint">—</p>
                    )}
                    <p className="text-xs text-faint">iscritto il {data(r.signed_up_at)}</p>
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
                      {r.dishes_total} in catalogo
                      {r.card_dishes_total > 0 && ` · ${r.card_dishes_total} sulla scheda`}
                    </p>
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
      )}

      {granting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg shadow-lg p-5 w-full max-w-sm">
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
