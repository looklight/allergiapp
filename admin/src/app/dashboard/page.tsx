'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Restaurant } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import Link from 'next/link';

interface Stats {
  active: number;
  removed: number;
  totalUsers: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ active: 0, removed: 0, totalUsers: 0 });
  const [topReported, setTopReported] = useState<Restaurant[]>([]);
  const [recent, setRecent] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const ref = collection(db, 'restaurants');

      // Conteggi per status
      const [activeSnap, removedSnap, usersSnap] = await Promise.all([
        getCountFromServer(query(ref, where('status', '==', 'active'))),
        getCountFromServer(query(ref, where('status', '==', 'removed'))),
        getCountFromServer(collection(db, 'users')),
      ]);

      setStats({
        active: activeSnap.data().count,
        removed: removedSnap.data().count,
        totalUsers: usersSnap.data().count,
      });

      // Top 5 ristoranti piu segnalati
      const reportedSnap = await getDocs(
        query(ref, where('reportCount', '>', 0), orderBy('reportCount', 'desc'), limit(5))
      );
      setTopReported(reportedSnap.docs.map((d) => ({ ...d.data(), googlePlaceId: d.id } as Restaurant)));

      // Ultimi 5 ristoranti aggiunti
      const recentSnap = await getDocs(
        query(ref, orderBy('addedAt', 'desc'), limit(5))
      );
      setRecent(recentSnap.docs.map((d) => ({ ...d.data(), googlePlaceId: d.id } as Restaurant)));

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
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Ristoranti attivi" value={stats.active} color="text-green-600" />
        <StatCard label="Rimossi" value={stats.removed} color="text-red-600" />
        <StatCard label="Totale utenti" value={stats.totalUsers} color="text-blue-600" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Top segnalati */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">Piu segnalati</h2>
          {topReported.length === 0 ? (
            <p className="text-sm text-gray-400">Nessuna segnalazione</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {topReported.map((r) => (
                  <tr key={r.googlePlaceId} className="border-b last:border-0">
                    <td className="py-2">
                      <Link href={`/restaurants/${r.googlePlaceId}`} className="text-blue-600 hover:underline">
                        {r.name}
                      </Link>
                    </td>
                    <td className="py-2 text-gray-500">{r.city}</td>
                    <td className="py-2 text-right">
                      <span className="text-red-600 font-medium">{r.reportCount}</span> segnalazioni
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Attivita recente */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">Aggiunti di recente</h2>
          <table className="w-full text-sm">
            <tbody>
              {recent.map((r) => (
                <tr key={r.googlePlaceId} className="border-b last:border-0">
                  <td className="py-2">
                    <Link href={`/restaurants/${r.googlePlaceId}`} className="text-blue-600 hover:underline">
                      {r.name}
                    </Link>
                  </td>
                  <td className="py-2 text-gray-500">{r.city}</td>
                  <td className="py-2 text-right">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
