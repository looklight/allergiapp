'use client';

import { useEffect, useState } from 'react';
import {
  collection, query, where, orderBy, getDocs, limit,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Restaurant, RestaurantReport, ReportReason } from '@/lib/types';
import { REPORT_REASON_LABELS } from '@/lib/types';
import Link from 'next/link';

interface ReportWithRestaurant extends RestaurantReport {
  restaurantName: string;
  restaurantCity: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportWithRestaurant[]>([]);
  const [reasonFilter, setReasonFilter] = useState<ReportReason | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Prendi i ristoranti con segnalazioni
      const rRef = collection(db, 'restaurants');
      const rSnap = await getDocs(
        query(rRef, where('reportCount', '>', 0), orderBy('reportCount', 'desc'), limit(50))
      );

      const allReports: ReportWithRestaurant[] = [];

      for (const rDoc of rSnap.docs) {
        const rData = rDoc.data() as Restaurant;
        const reportsRef = collection(db, 'restaurants', rDoc.id, 'reports');
        const constraints: QueryConstraint[] = [where('status', '==', 'active')];
        if (reasonFilter !== 'all') {
          constraints.push(where('reason', '==', reasonFilter));
        }
        constraints.push(orderBy('createdAt', 'desc'));

        const repSnap = await getDocs(query(reportsRef, ...constraints));
        for (const repDoc of repSnap.docs) {
          allReports.push({
            ...repDoc.data(),
            id: repDoc.id,
            restaurantName: rData.name,
            restaurantCity: rData.city,
          } as ReportWithRestaurant);
        }
      }

      setReports(allReports);
      setLoading(false);
    }
    load();
  }, [reasonFilter]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Segnalazioni</h1>

      {/* Filtri motivo */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setReasonFilter('all')}
          className={`px-3 py-1 rounded text-sm ${
            reasonFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-white border text-gray-600 hover:bg-gray-100'
          }`}
        >
          Tutti
        </button>
        {(Object.keys(REPORT_REASON_LABELS) as ReportReason[]).map((reason) => (
          <button
            key={reason}
            onClick={() => setReasonFilter(reason)}
            className={`px-3 py-1 rounded text-sm ${
              reasonFilter === reason ? 'bg-gray-900 text-white' : 'bg-white border text-gray-600 hover:bg-gray-100'
            }`}
          >
            {REPORT_REASON_LABELS[reason]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Caricamento...</p>
      ) : reports.length === 0 ? (
        <p className="text-gray-400">Nessuna segnalazione trovata.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Ristorante</th>
                <th className="px-4 py-3 font-medium">Motivo</th>
                <th className="px-4 py-3 font-medium">Descrizione</th>
                <th className="px-4 py-3 font-medium">Segnalato da</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={`${r.restaurantId}-${r.id}`} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/restaurants/${r.restaurantId}`} className="text-blue-600 hover:underline">
                      {r.restaurantName}
                    </Link>
                    <span className="text-gray-400 ml-1 text-xs">{r.restaurantCity}</span>
                  </td>
                  <td className="px-4 py-3">{REPORT_REASON_LABELS[r.reason]}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.description}</td>
                  <td className="px-4 py-3 text-gray-500">{r.displayName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
