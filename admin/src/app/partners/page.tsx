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
  card_id: string | null;
  sub_id: string | null;
  sub_source: 'stripe' | 'manual' | null;
  sub_status: 'active' | 'past_due' | null;
  sub_plan: 'monthly' | 'yearly' | null;
  sub_ends_at: string | null;
  sub_cancel_at_period_end: boolean | null;
  sub_note: string | null;
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
}

function data(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

function euro(cents: number): string {
  return `${(cents / 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export default function PartnersPage() {
  const [rows, setRows] = useState<PartnerVenue[]>([]);
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [search, setSearch] = useState('');
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

  async function concedi() {
    if (!granting) return;
    setBusy(true);
    const n = parseInt(mesi, 10);
    const ends =
      Number.isFinite(n) && n > 0
        ? new Date(new Date().setMonth(new Date().getMonth() + n)).toISOString()
        : null; // senza mesi = senza scadenza
    const { error } = await supabase.from('partner_subscriptions').insert({
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
    if (r.sub_source === 'manual') {
      return (
        <div>
          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">Offerto</span>
          <p className="text-xs text-faint mt-0.5">{quando}</p>
          {r.sub_note && <p className="text-xs text-faint italic">{r.sub_note}</p>}
        </div>
      );
    }
    return (
      <div>
        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-success-soft text-success-soft-foreground">
          {r.sub_plan === 'yearly' ? 'Annuale' : 'Mensile'}
        </span>
        <p className="text-xs text-faint mt-0.5">{quando}</p>
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

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cerca per locale, nome o email…"
        className="w-full md:w-96 mb-4 px-3 py-2 rounded border border-border bg-card text-sm"
      />

      {loading ? (
        <p className="text-muted-foreground">Caricamento...</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground">Nessun locale partner.</p>
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
              {rows.map((r) => (
                <tr key={r.venue_id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.venue_name?.trim() || 'Locale senza nome'}</p>
                    <p className="text-xs text-faint">{r.slug ? `/menu/${r.slug}` : 'nessun indirizzo'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{`${r.first_name} ${r.last_name}`.trim()}</p>
                    <p className="text-xs text-faint">{r.email ?? '—'}</p>
                    <p className="text-xs text-faint">iscritto il {data(r.signed_up_at)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{r.menus_total}</p>
                    <p className="text-xs text-faint">
                      {r.published_at ? `pubblicato il ${data(r.published_at)}` : 'mai pubblicato'}
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
                      <span className="text-xs text-faint">su Stripe</span>
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
