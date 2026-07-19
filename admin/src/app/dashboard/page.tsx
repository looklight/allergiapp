'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { safeQuery, safeCount } from '@/lib/safeQuery';
import type { Restaurant } from '@/lib/types';
import StatCard from '@/components/StatCard';
import EventAnalyticsSection from '@/components/EventAnalyticsSection';
import GrowthChartSection from '@/components/GrowthChartSection';
import Link from 'next/link';

interface Stats {
  totalRestaurants: number;
  totalUsers: number;
  activeUsers24h: number;
  activeUsers7d: number;
  activeUsers30d: number;
  totalReviews: number;
  pendingReports: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalRestaurants: 0, totalUsers: 0, activeUsers24h: 0, activeUsers7d: 0, activeUsers30d: 0, totalReviews: 0, pendingReports: 0 });
  const [topReported, setTopReported] = useState<(Restaurant & { report_count: number })[]>([]);
  const [recent, setRecent] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [totalRestaurants, totalUsers, activeUsers24h, activeUsers7d, activeUsers30d, totalReviews, pendingReports] = await Promise.all([
        safeCount(() => supabase.from('restaurants').select('*', { count: 'exact', head: true })),
        safeCount(() => supabase.from('profiles').select('*', { count: 'exact', head: true })),
        safeCount(() => supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen_at', since24h)),
        safeCount(() => supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen_at', since7d)),
        safeCount(() => supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen_at', since30d)),
        safeCount(() => supabase.from('reviews').select('*', { count: 'exact', head: true })),
        safeCount(() => supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending')),
      ]);

      setStats({ totalRestaurants, totalUsers, activeUsers24h, activeUsers7d, activeUsers30d, totalReviews, pendingReports });

      // Top 5 ristoranti con piu segnalazioni pending (aggregato in Postgres)
      const reportedData = await safeQuery(
        () => supabase.rpc('get_top_reported_restaurants', { top_n: 5 }),
        'Top segnalati',
      );
      if (reportedData) {
        setTopReported(reportedData as (Restaurant & { report_count: number })[]);
      }

      // Ultimi 5 ristoranti aggiunti
      const recentData = await safeQuery(
        () => supabase.from('restaurants').select('id, name, city, country, created_at').order('created_at', { ascending: false }).limit(5),
        'Ristoranti recenti',
      );
      setRecent((recentData as Restaurant[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <p className="text-muted-foreground">Caricamento...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Ristoranti" value={stats.totalRestaurants} color="text-success" href="/restaurants" />
        <StatCard label="Utenti" value={stats.totalUsers} color="text-primary" href="/users" hint={`· ${stats.activeUsers24h} oggi · ${stats.activeUsers7d} 7g · ${stats.activeUsers30d} 30g`} />
        <StatCard label="Recensioni" value={stats.totalReviews} color="text-purple-600" href="/reviews" />
        <StatCard label="Segnalazioni in attesa" value={stats.pendingReports} color="text-danger" href="/reports" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top segnalati */}
        <div className="bg-card rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">Più segnalati</h2>
          {topReported.length === 0 ? (
            <p className="text-sm text-faint">Nessuna segnalazione</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {topReported.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2">
                        <Link href={`/restaurants/${r.id}`} className="text-primary hover:underline">
                          {r.name}
                        </Link>
                      </td>
                      <td className="py-2 text-muted-foreground">{r.city}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                        <span className="text-danger font-medium">{r.report_count}</span> segnalazioni
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Attivita recente */}
        <div className="bg-card rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">Aggiunti di recente</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2">
                      <Link href={`/restaurants/${r.id}`} className="text-primary hover:underline">
                        {r.name}
                      </Link>
                    </td>
                    <td className="py-2 text-muted-foreground">{r.city}</td>
                    <td className="py-2 text-right text-faint text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString('it-IT')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <EventAnalyticsSection />

      <GrowthChartSection />
    </div>
  );
}
