'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { safeQuery, safeCount } from '@/lib/safeQuery';
import { labelAllergen, labelDiet } from '@/lib/dietaryLabels';
import InfoHint from '@/components/InfoHint';

// Etichette italiane per gli eventi del catalogo (vedi services/supabaseAnalytics.ts).
// Per nuovi eventi non in lista, fallback: snake_case → "Snake Case".
const EVENT_LABELS: Record<string, string> = {
  onboarding_completed: 'Onboarding completati',
  restaurant_viewed: 'Schede ristorante viste',
  restaurant_search: 'Ricerche confermate',
  review_created: 'Recensioni create',
  sign_in: 'Sign in',
  restaurant_shared: 'Ristoranti condivisi',
  filter_applied: 'Filtri applicati',
};

function eventLabel(name: string): string {
  return EVENT_LABELS[name] ?? name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Box contatori: mostriamo solo eventi significativi e raccolti da sempre.
// Esclusi di proposito: sign_in (fuorviante per la sessione persistente),
// eventi di flusso/interni e quelli partiti solo da build ≥1.3.0 (numeri
// ancora sfasati per diffusione). Non tocca le tabelle sotto.
const SHOWN_EVENTS = new Set([
  'restaurant_viewed',
  'restaurant_search',
  'review_created',
  'restaurant_shared',
]);

// Spiegazione per box (tooltip i). Numero grande = ultimi 7 giorni, piccolo = 30.
// Gli eventi comportamentali contano solo chi ha dato il consenso analytics;
// review_created è l'eccezione (totale reale dalla tabella, tutti gli utenti).
const EVENT_HINTS: Record<string, string> = {
  restaurant_viewed: 'Quante volte è stata aperta una scheda ristorante. Conta solo chi ha dato il consenso analytics.',
  restaurant_search: 'Ricerche di ristoranti confermate (con selezione di un risultato). Conta solo chi ha dato il consenso analytics.',
  review_created: 'Recensioni realmente create nel periodo (dalla tabella recensioni, tutti gli utenti — non l’evento tracciato). Le modifiche non contano.',
  restaurant_shared: 'Quante volte un ristorante è stato condiviso. Conta solo chi ha dato il consenso analytics.',
};

const HINT_FALLBACK = 'Numero di volte che l’azione è stata tracciata. Conta solo chi ha dato il consenso analytics.';

// Etichetta per un codice esigenza: allergeni/diete note, altrimenti
// snake_case → "Snake Case" (cibi extra tipo pine_nuts non mappati in dietaryLabels).
function needLabel(code: string): string {
  const known = labelAllergen(code);
  if (known !== code) return known;
  const diet = labelDiet(code);
  if (diet !== code) return diet;
  return code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface EventCount {
  event_name: string;
  event_count: number;
}

interface TopQuery {
  query: string;
  query_count: number;
  place_count: number;
  restaurant_count: number;
}

interface TopRestaurant {
  restaurant_id: string;
  name: string;
  city: string | null;
  view_count: number;
  viewer_count: number;
}

interface NeedCount {
  code: string;
  need_type: string;
  user_count: number;
}

interface FilteredNeed {
  code: string;
  use_count: number;
}

interface TopSaved {
  restaurant_id: string;
  name: string;
  city: string | null;
  saver_count: number;
}

interface TopCity {
  city: string;
  country_code: string | null;
  review_count: number;
}

export default function EventAnalyticsSection() {
  const [counts7d, setCounts7d] = useState<EventCount[]>([]);
  const [counts30d, setCounts30d] = useState<EventCount[]>([]);
  const [topQueries, setTopQueries] = useState<TopQuery[]>([]);
  const [topRestaurants, setTopRestaurants] = useState<TopRestaurant[]>([]);
  const [needsDistribution, setNeedsDistribution] = useState<NeedCount[]>([]);
  const [filteredNeeds, setFilteredNeeds] = useState<FilteredNeed[]>([]);
  const [topSaved, setTopSaved] = useState<TopSaved[]>([]);
  const [topCities, setTopCities] = useState<TopCity[]>([]);
  // Recensioni reali (righe tabella reviews) per il box omonimo: numero esatto,
  // tutti gli utenti, non l'evento consent-gated.
  const [realReviews, setRealReviews] = useState<{ v7: number; v30: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [c7, c30, top, topRest, needs, filtered, saved, cities, rv7, rv30] = await Promise.all([
        safeQuery(() => supabase.rpc('get_event_counts', { p_days: 7 }), 'Event counts 7g'),
        safeQuery(() => supabase.rpc('get_event_counts', { p_days: 30 }), 'Event counts 30g'),
        safeQuery(() => supabase.rpc('get_top_search_queries', { p_days: 30, p_limit: 10 }), 'Top ricerche'),
        safeQuery(() => supabase.rpc('get_top_viewed_restaurants', { p_days: 30, p_limit: 10 }), 'Ristoranti più aperti'),
        safeQuery(() => supabase.rpc('get_needs_distribution', { p_limit: 10 }), 'Esigenze più diffuse'),
        safeQuery(() => supabase.rpc('get_top_filtered_needs', { p_days: 30, p_limit: 10 }), 'Esigenze filtrate'),
        safeQuery(() => supabase.rpc('get_top_saved_restaurants', { p_limit: 10 }), 'Ristoranti più salvati'),
        safeQuery(() => supabase.rpc('get_top_cities', { p_days: 30, p_limit: 10 }), 'Città più attive'),
        safeCount(() => supabase.from('reviews').select('*', { count: 'exact', head: true }).gte('created_at', since7d)),
        safeCount(() => supabase.from('reviews').select('*', { count: 'exact', head: true }).gte('created_at', since30d)),
      ]);
      setCounts7d((c7 as EventCount[]) ?? []);
      setCounts30d((c30 as EventCount[]) ?? []);
      setRealReviews({ v7: rv7, v30: rv30 });
      setTopQueries((top as TopQuery[]) ?? []);
      setTopRestaurants((topRest as TopRestaurant[]) ?? []);
      setNeedsDistribution((needs as NeedCount[]) ?? []);
      setFilteredNeeds((filtered as FilteredNeed[]) ?? []);
      setTopSaved((saved as TopSaved[]) ?? []);
      setTopCities((cities as TopCity[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  // Valore su cui ordinare i box (30g): per review_created il conteggio reale
  // dalla tabella, per gli altri il conteggio dell'evento.
  const sortVal = (name: string) =>
    name === 'review_created'
      ? realReviews?.v30 ?? 0
      : counts30d.find((c) => c.event_name === name)?.event_count ?? 0;

  // Nomi evento presenti in 7g o 30g, filtrati alla whitelist. review_created è
  // sempre incluso (fonte reale dalla tabella reviews, anche a zero eventi).
  const names = new Set(
    [...counts30d, ...counts7d].map((c) => c.event_name).filter((name) => SHOWN_EVENTS.has(name)),
  );
  names.add('review_created');
  const eventNames = Array.from(names).sort((a, b) => sortVal(b) - sortVal(a));

  if (loading) {
    return <p className="text-sm text-faint mt-8">Caricamento eventi...</p>;
  }

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold mb-4">Eventi app</h2>

      {/* Counters per evento (7g / 30g) — review_created sempre presente */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {eventNames.map((name) => {
          const isRealReview = name === 'review_created';
          const v7 = isRealReview
            ? realReviews?.v7 ?? 0
            : counts7d.find((c) => c.event_name === name)?.event_count ?? 0;
          const v30 = isRealReview
            ? realReviews?.v30 ?? 0
            : counts30d.find((c) => c.event_name === name)?.event_count ?? 0;
          return (
            <div key={name} className="bg-card rounded-lg shadow p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-faint uppercase tracking-wide">{eventLabel(name)}</p>
                <InfoHint text={EVENT_HINTS[name] ?? HINT_FALLBACK} align="end" />
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-2xl font-bold text-foreground">{v7}</span>
                <span className="text-xs text-faint">| {v30} (30g)</span>
              </div>
              <p className="text-[10px] text-faint mt-0.5">ultimi 7 giorni</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ristoranti più aperti */}
        <div className="bg-card rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Ristoranti più aperti (30g)</h3>
          {topRestaurants.length === 0 ? (
            <p className="text-sm text-faint">Nessuna apertura registrata.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-faint uppercase">
                    <th className="py-1 font-normal">Ristorante</th>
                    <th className="py-1 font-normal text-right">Aperture</th>
                    <th className="py-1 font-normal text-right">Utenti</th>
                  </tr>
                </thead>
                <tbody>
                  {topRestaurants.map((r) => (
                    <tr key={r.restaurant_id} className="border-b last:border-0">
                      <td className="py-2 truncate max-w-[220px]">
                        <Link href={`/restaurants/${r.restaurant_id}`} className="text-primary hover:underline" title={r.name}>
                          {r.name}
                        </Link>
                        {r.city && <span className="text-xs text-faint ml-1.5">{r.city}</span>}
                      </td>
                      <td className="py-2 text-right font-medium">{r.view_count}</td>
                      <td className="py-2 text-right text-muted-foreground">{r.viewer_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ristoranti più salvati */}
        <div className="bg-card rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Ristoranti più salvati</h3>
          {topSaved.length === 0 ? (
            <p className="text-sm text-faint">Nessun ristorante salvato.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-faint uppercase">
                    <th className="py-1 font-normal">Ristorante</th>
                    <th className="py-1 font-normal text-right">Utenti</th>
                  </tr>
                </thead>
                <tbody>
                  {topSaved.map((r) => (
                    <tr key={r.restaurant_id} className="border-b last:border-0">
                      <td className="py-2 truncate max-w-[220px]">
                        <Link href={`/restaurants/${r.restaurant_id}`} className="text-primary hover:underline" title={r.name}>
                          {r.name}
                        </Link>
                        {r.city && <span className="text-xs text-faint ml-1.5">{r.city}</span>}
                      </td>
                      <td className="py-2 text-right font-medium">{r.saver_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top ricerche */}
        <div className="bg-card rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Top ricerche (30g)</h3>
          {topQueries.length === 0 ? (
            <p className="text-sm text-faint">Nessuna ricerca registrata.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-faint uppercase">
                    <th className="py-1 font-normal">Query</th>
                    <th className="py-1 font-normal text-right">Totale</th>
                    <th className="py-1 font-normal text-right">Luoghi</th>
                    <th className="py-1 font-normal text-right">Ristoranti</th>
                  </tr>
                </thead>
                <tbody>
                  {topQueries.map((q) => (
                    <tr key={q.query} className="border-b last:border-0">
                      <td className="py-2 truncate max-w-[200px]" title={q.query}>{q.query}</td>
                      <td className="py-2 text-right font-medium">{q.query_count}</td>
                      <td className="py-2 text-right text-muted-foreground">{q.place_count}</td>
                      <td className="py-2 text-right text-muted-foreground">{q.restaurant_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Città più attive per recensioni */}
        <div className="bg-card rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Città più attive (30g)</h3>
          {topCities.length === 0 ? (
            <p className="text-sm text-faint">Nessuna recensione negli ultimi 30 giorni.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-faint uppercase">
                    <th className="py-1 font-normal">Città</th>
                    <th className="py-1 font-normal text-right">Recensioni</th>
                  </tr>
                </thead>
                <tbody>
                  {topCities.map((c) => (
                    <tr key={`${c.city}-${c.country_code ?? ''}`} className="border-b last:border-0">
                      <td className="py-2 truncate max-w-[220px]">
                        {c.city}
                        {c.country_code && <span className="text-xs text-faint ml-1.5 uppercase">{c.country_code}</span>}
                      </td>
                      <td className="py-2 text-right font-medium">{c.review_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Esigenze più diffuse nei profili */}
        <div className="bg-card rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Esigenze più diffuse (profili)</h3>
          {needsDistribution.length === 0 ? (
            <p className="text-sm text-faint">Nessuna esigenza registrata.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-faint uppercase">
                    <th className="py-1 font-normal">Esigenza</th>
                    <th className="py-1 font-normal text-right">Utenti</th>
                  </tr>
                </thead>
                <tbody>
                  {needsDistribution.map((n) => (
                    <tr key={n.code} className="border-b last:border-0">
                      <td className="py-2 truncate max-w-[220px]">{needLabel(n.code)}</td>
                      <td className="py-2 text-right font-medium">{n.user_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Esigenze più usate nei filtri */}
        <div className="bg-card rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Esigenze più filtrate (30g)</h3>
          {filteredNeeds.length === 0 ? (
            <p className="text-sm text-faint">
              Nessun dato: l&apos;evento arriva con le build dalla 1.3.0 in poi.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-faint uppercase">
                    <th className="py-1 font-normal">Esigenza</th>
                    <th className="py-1 font-normal text-right">Usi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNeeds.map((n) => (
                    <tr key={n.code} className="border-b last:border-0">
                      <td className="py-2 truncate max-w-[220px]">{needLabel(n.code)}</td>
                      <td className="py-2 text-right font-medium">{n.use_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
