'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/safeQuery';

// Etichette italiane per i 6 eventi del catalogo (vedi services/supabaseAnalytics.ts).
// Per nuovi eventi non in lista, fallback: snake_case → "Snake Case".
const EVENT_LABELS: Record<string, string> = {
  onboarding_completed: 'Onboarding completati',
  restaurant_viewed: 'Schede ristorante viste',
  restaurant_search: 'Ricerche confermate',
  review_created: 'Recensioni create',
  sign_in: 'Sign in',
  restaurant_shared: 'Ristoranti condivisi',
};

function eventLabel(name: string): string {
  return EVENT_LABELS[name] ?? name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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

interface RecentEvent {
  id: string;
  event_name: string;
  user_id: string | null;
  username: string | null;
  is_anonymous: boolean;
  properties: Record<string, unknown>;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s fa`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m fa`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h fa`;
  const day = Math.floor(hr / 24);
  return `${day}g fa`;
}

function summarizeProperties(eventName: string, props: Record<string, unknown>): string {
  // Sintesi compatta per il live feed.
  switch (eventName) {
    case 'restaurant_search': {
      const q = props.query;
      const k = props.selected_kind;
      return q ? `"${q}" → ${k}` : '';
    }
    case 'sign_in':
      return `provider: ${props.provider}${props.is_signup ? ' (signup)' : ''}`;
    case 'onboarding_completed':
      return `${props.allergen_count ?? 0} allergeni, ${props.diet_count ?? 0} diete`;
    case 'review_created':
      return `rating ${props.rating}${props.has_comment ? ', con commento' : ''}`;
    case 'restaurant_shared':
      return typeof props.slug === 'string' ? props.slug : '';
    case 'restaurant_viewed':
      return typeof props.restaurant_id === 'string' ? props.restaurant_id.slice(0, 8) : '';
    default:
      return '';
  }
}

export default function EventAnalyticsSection() {
  const [counts7d, setCounts7d] = useState<EventCount[]>([]);
  const [counts30d, setCounts30d] = useState<EventCount[]>([]);
  const [topQueries, setTopQueries] = useState<TopQuery[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [c7, c30, top, recent] = await Promise.all([
        safeQuery(() => supabase.rpc('get_event_counts', { p_days: 7 }), 'Event counts 7g'),
        safeQuery(() => supabase.rpc('get_event_counts', { p_days: 30 }), 'Event counts 30g'),
        safeQuery(() => supabase.rpc('get_top_search_queries', { p_days: 30, p_limit: 20 }), 'Top ricerche'),
        safeQuery(() => supabase.rpc('get_recent_events', { p_limit: 20 }), 'Ultimi eventi'),
      ]);
      setCounts7d((c7 as EventCount[]) ?? []);
      setCounts30d((c30 as EventCount[]) ?? []);
      setTopQueries((top as TopQuery[]) ?? []);
      setRecentEvents((recent as RecentEvent[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  // Unione dei nomi evento presenti in 7g o 30g, ordinata per conteggio 30g desc.
  const eventNames = Array.from(
    new Set([...counts30d.map((c) => c.event_name), ...counts7d.map((c) => c.event_name)]),
  ).sort((a, b) => {
    const ca = counts30d.find((c) => c.event_name === a)?.event_count ?? 0;
    const cb = counts30d.find((c) => c.event_name === b)?.event_count ?? 0;
    return cb - ca;
  });

  if (loading) {
    return <p className="text-sm text-gray-400 mt-8">Caricamento eventi...</p>;
  }

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold mb-4">Eventi app</h2>

      {/* Counters per evento (7g / 30g) */}
      {eventNames.length === 0 ? (
        <p className="text-sm text-gray-400 mb-6">Nessun evento registrato.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          {eventNames.map((name) => {
            const v7 = counts7d.find((c) => c.event_name === name)?.event_count ?? 0;
            const v30 = counts30d.find((c) => c.event_name === name)?.event_count ?? 0;
            return (
              <div key={name} className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide">{eventLabel(name)}</p>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-2xl font-bold text-gray-800">{v7}</span>
                  <span className="text-xs text-gray-400">/ {v30} (30g)</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">ultimi 7 giorni</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top ricerche */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Top ricerche (30g)</h3>
          {topQueries.length === 0 ? (
            <p className="text-sm text-gray-400">Nessuna ricerca registrata.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase">
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
                      <td className="py-2 text-right text-gray-500">{q.place_count}</td>
                      <td className="py-2 text-right text-gray-500">{q.restaurant_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Live feed ultimi eventi */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Ultimi eventi</h3>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-gray-400">Nessun evento registrato.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {recentEvents.map((e) => {
                    const userLabel = e.user_id
                      ? (e.is_anonymous ? 'anon' : (e.username ?? '—'))
                      : 'anon';
                    return (
                      <tr key={e.id} className="border-b last:border-0">
                        <td className="py-2 text-xs text-gray-400 whitespace-nowrap pr-2">{timeAgo(e.created_at)}</td>
                        <td className="py-2 whitespace-nowrap pr-2">{eventLabel(e.event_name)}</td>
                        <td className="py-2 text-gray-500 pr-2">
                          {e.user_id && !e.is_anonymous && e.username ? (
                            <Link href={`/users/${e.user_id}`} className="text-blue-600 hover:underline">{userLabel}</Link>
                          ) : userLabel}
                        </td>
                        <td className="py-2 text-gray-500 text-xs truncate max-w-[180px]" title={JSON.stringify(e.properties)}>
                          {summarizeProperties(e.event_name, e.properties)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
