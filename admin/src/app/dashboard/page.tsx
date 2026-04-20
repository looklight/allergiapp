'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { safeQuery, safeCount } from '@/lib/safeQuery';
import type { Restaurant } from '@/lib/types';
import StatCard from '@/components/StatCard';
import Link from 'next/link';

interface Stats {
  totalRestaurants: number;
  totalUsers: number;
  totalReviews: number;
  pendingReports: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalRestaurants: 0, totalUsers: 0, totalReviews: 0, pendingReports: 0 });
  const [topReported, setTopReported] = useState<(Restaurant & { report_count: number })[]>([]);
  const [recent, setRecent] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [totalRestaurants, totalUsers, totalReviews, pendingReports] = await Promise.all([
        safeCount(() => supabase.from('restaurants').select('*', { count: 'exact', head: true })),
        safeCount(() => supabase.from('profiles').select('*', { count: 'exact', head: true })),
        safeCount(() => supabase.from('reviews').select('*', { count: 'exact', head: true })),
        safeCount(() => supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending')),
      ]);

      setStats({ totalRestaurants, totalUsers, totalReviews, pendingReports });

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
    return <p className="text-gray-500">Caricamento...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Ristoranti" value={stats.totalRestaurants} color="text-green-600" />
        <StatCard label="Utenti" value={stats.totalUsers} color="text-blue-600" />
        <StatCard label="Recensioni" value={stats.totalReviews} color="text-purple-600" />
        <StatCard label="Segnalazioni in attesa" value={stats.pendingReports} color="text-red-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top segnalati */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">Più segnalati</h2>
          {topReported.length === 0 ? (
            <p className="text-sm text-gray-400">Nessuna segnalazione</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {topReported.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2">
                        <Link href={`/restaurants/${r.id}`} className="text-blue-600 hover:underline">
                          {r.name}
                        </Link>
                      </td>
                      <td className="py-2 text-gray-500">{r.city}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                        <span className="text-red-600 font-medium">{r.report_count}</span> segnalazioni
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Attivita recente */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">Aggiunti di recente</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2">
                      <Link href={`/restaurants/${r.id}`} className="text-blue-600 hover:underline">
                        {r.name}
                      </Link>
                    </td>
                    <td className="py-2 text-gray-500">{r.city}</td>
                    <td className="py-2 text-right text-gray-400 text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString('it-IT')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
