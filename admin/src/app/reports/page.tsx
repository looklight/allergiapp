'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Report, ReportReason, ReportStatus } from '@/lib/types';
import { REPORT_REASON_LABELS } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import Link from 'next/link';

const PAGE_SIZE = 25;

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('pending');
  const [reasonFilter, setReasonFilter] = useState<ReportReason | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'restaurant' | 'photo'>('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const loadReports = async (pageNum: number, append = false) => {
    setLoading(true);

    let query = supabase
      .from('reports')
      .select('*, restaurants!restaurant_id(name, city), profiles!user_id(display_name), menu_photos!menu_photo_id(thumbnail_url, image_url)')
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE);

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (reasonFilter !== 'all') {
      query = query.eq('reason', reasonFilter);
    }
    if (typeFilter === 'photo') {
      query = query.not('menu_photo_id', 'is', null);
    } else if (typeFilter === 'restaurant') {
      query = query.is('menu_photo_id', null);
    }

    const { data } = await query;
    const items = (data ?? []).map((r: any) => ({
      ...r,
      reporter_name: r.profiles?.display_name ?? null,
      restaurant_name: r.restaurants?.name ?? null,
      restaurant_city: r.restaurants?.city ?? null,
      menu_photo_thumbnail_url: r.menu_photos?.thumbnail_url ?? null,
      menu_photo_image_url: r.menu_photos?.image_url ?? null,
      profiles: undefined,
      restaurants: undefined,
      menu_photos: undefined,
    }));

    setHasMore(items.length > PAGE_SIZE);
    const pageItems = items.slice(0, PAGE_SIZE);

    if (append) {
      setReports((prev) => [...prev, ...pageItems]);
    } else {
      setReports(pageItems);
    }
    setLoading(false);
  };

  useEffect(() => {
    setPage(0);
    loadReports(0);
  }, [statusFilter, reasonFilter, typeFilter]);

  const updateStatus = async (reportId: string, status: ReportStatus) => {
    if (busyIds.has(reportId)) return;
    setBusyIds((prev) => new Set(prev).add(reportId));
    const { error } = await supabase.from('reports').update({ status }).eq('id', reportId);
    setBusyIds((prev) => { const next = new Set(prev); next.delete(reportId); return next; });
    if (error) {
      alert(`Errore: ${error.message}`);
      return;
    }
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status } : r))
    );
  };

  const deleteMenuPhoto = async (report: Report) => {
    if (!report.menu_photo_id || busyIds.has(report.id)) return;
    if (!confirm('Eliminare questa foto del menu e risolvere la segnalazione?')) return;
    setBusyIds((prev) => new Set(prev).add(report.id));
    const { error: deleteError } = await supabase
      .from('menu_photos')
      .delete()
      .eq('id', report.menu_photo_id);
    if (deleteError) {
      alert(`Errore eliminazione foto: ${deleteError.message}`);
      setBusyIds((prev) => { const next = new Set(prev); next.delete(report.id); return next; });
      return;
    }
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', report.id);
    setBusyIds((prev) => { const next = new Set(prev); next.delete(report.id); return next; });
    setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, status: 'resolved' } : r)));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Segnalazioni</h1>

      {/* Filtro tipo */}
      <div className="flex gap-2 mb-3">
        {(['all', 'restaurant', 'photo'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1 rounded text-sm ${
              typeFilter === t ? 'bg-gray-900 text-white' : 'bg-white border text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t === 'all' ? 'Tutti i tipi' : t === 'restaurant' ? 'Ristorante' : 'Foto menu'}
          </button>
        ))}
      </div>

      {/* Filtri status */}
      <div className="flex gap-2 mb-3">
        {(['all', 'pending', 'resolved', 'dismissed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded text-sm ${
              statusFilter === s ? 'bg-gray-900 text-white' : 'bg-white border text-gray-600 hover:bg-gray-100'
            }`}
          >
            {s === 'all' ? 'Tutti' : s === 'pending' ? 'In attesa' : s === 'resolved' ? 'Risolte' : 'Archiviate'}
          </button>
        ))}
      </div>

      {/* Filtri motivo */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setReasonFilter('all')}
          className={`px-3 py-1 rounded text-sm ${
            reasonFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-white border text-gray-600 hover:bg-gray-100'
          }`}
        >
          Tutti i motivi
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
                <th className="px-4 py-3 font-medium">Foto</th>
                <th className="px-4 py-3 font-medium">Motivo</th>
                <th className="px-4 py-3 font-medium">Descrizione</th>
                <th className="px-4 py-3 font-medium">Segnalato da</th>
                <th className="px-4 py-3 font-medium">Stato</th>
                <th className="px-4 py-3 font-medium text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {r.restaurant_id ? (
                      <Link href={`/restaurants/${r.restaurant_id}`} className="text-blue-600 hover:underline">
                        {r.restaurant_name ?? '—'}
                      </Link>
                    ) : '—'}
                    {r.restaurant_city && (
                      <span className="text-gray-400 ml-1 text-xs">{r.restaurant_city}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.menu_photo_thumbnail_url ? (
                      <a href={r.menu_photo_image_url ?? r.menu_photo_thumbnail_url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={r.menu_photo_thumbnail_url}
                          alt="Foto segnalata"
                          width={48}
                          height={48}
                          className="rounded object-cover"
                        />
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {REPORT_REASON_LABELS[r.reason as ReportReason] ?? r.reason}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={r.details ?? ''}>
                    {r.details || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.reporter_name ?? 'Anonimo'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === 'pending' && (
                      <div className="flex gap-2 justify-end">
                        {r.menu_photo_id && (
                          <button
                            onClick={() => deleteMenuPhoto(r)}
                            disabled={busyIds.has(r.id)}
                            className="text-red-600 hover:underline text-xs disabled:opacity-50"
                          >
                            {busyIds.has(r.id) ? '...' : 'Elimina foto'}
                          </button>
                        )}
                        <button
                          onClick={() => updateStatus(r.id, 'resolved')}
                          disabled={busyIds.has(r.id)}
                          className="text-green-600 hover:underline text-xs disabled:opacity-50"
                        >
                          {busyIds.has(r.id) ? '...' : 'Risolvi'}
                        </button>
                        <button
                          onClick={() => updateStatus(r.id, 'dismissed')}
                          disabled={busyIds.has(r.id)}
                          className="text-gray-600 hover:underline text-xs disabled:opacity-50"
                        >
                          Archivia
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loading && reports.length > 0 && <p className="text-gray-500 mt-4">Caricamento...</p>}

      {hasMore && !loading && (
        <button
          onClick={() => {
            const nextPage = page + 1;
            setPage(nextPage);
            loadReports(nextPage, true);
          }}
          className="mt-4 px-4 py-2 bg-white border rounded text-sm hover:bg-gray-50"
        >
          Carica altre
        </button>
      )}
    </div>
  );
}
