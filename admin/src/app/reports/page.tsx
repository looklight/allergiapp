'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Report, ReportReason, ReportStatus } from '@/lib/types';
import { REPORT_REASON_LABELS } from '@/lib/types';
import { deleteMenuPhotoWithCleanup, deleteReviewWithCleanup } from '@/lib/storageCleanup';
import { flattenReportJoins } from '@/lib/flattenJoin';
import StatusBadge from '@/components/StatusBadge';
import { usePagination, PAGE_SIZE } from '@/hooks/usePagination';
import { useBusyIds } from '@/hooks/useBusyIds';
import Link from 'next/link';

export default function ReportsPage() {
  const [showHelp, setShowHelp] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('pending');
  const [reasonFilter, setReasonFilter] = useState<ReportReason | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'restaurant' | 'photo' | 'review'>('all');
  const { isBusy, withBusy } = useBusyIds();

  const fetchReports = useCallback(async (pageNum: number) => {
    let query = supabase
      .from('reports')
      .select('*, restaurants!restaurant_id(name, city), profiles!user_id(display_name), menu_photos!menu_photo_id(thumbnail_url, image_url), reviews!review_id(comment, rating, profiles!user_id(display_name))')
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
    } else if (typeFilter === 'review') {
      query = query.not('review_id', 'is', null);
    } else if (typeFilter === 'restaurant') {
      query = query.is('menu_photo_id', null).is('review_id', null);
    }

    const { data } = await query;
    return (data ?? []).map((r: any) => flattenReportJoins(r, true)) as Report[];
  }, [statusFilter, reasonFilter, typeFilter]);

  const { items: reports, setItems: setReports, loading, hasMore, loadMore, reset } =
    usePagination<Report>({ fetchPage: fetchReports });

  useEffect(() => {
    reset();
  }, [statusFilter, reasonFilter, typeFilter]);

  const updateStatus = async (reportId: string, status: ReportStatus) => {
    await withBusy(reportId, async () => {
      const { error } = await supabase.from('reports').update({ status }).eq('id', reportId);
      if (error) {
        alert(`Errore: ${error.message}`);
        return;
      }
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status } : r))
      );
    });
  };

  const deleteMenuPhoto = async (report: Report) => {
    if (!report.menu_photo_id) return;
    if (!confirm('Eliminare questa foto del menu e risolvere la segnalazione?')) return;
    await withBusy(report.id, async () => {
      // Risolvi TUTTI i report pending per questa foto (ON DELETE SET NULL li renderebbe orfani)
      await supabase.from('reports').update({ status: 'resolved' }).eq('menu_photo_id', report.menu_photo_id).eq('status', 'pending');
      const { error } = await deleteMenuPhotoWithCleanup(supabase, report.menu_photo_id!);
      if (error) {
        alert(`Errore eliminazione foto: ${error}`);
        return;
      }
      // Aggiorna UI: tutti i report per questa foto → resolved
      const photoId = report.menu_photo_id;
      setReports((prev) => prev.map((r) => r.menu_photo_id === photoId ? { ...r, status: 'resolved' as ReportStatus } : r));
    });
  };

  const deleteReview = async (report: Report) => {
    if (!report.review_id) return;
    if (!confirm('Eliminare questa recensione e risolvere la segnalazione?')) return;
    await withBusy(report.id, async () => {
      const { error } = await deleteReviewWithCleanup(supabase, report.review_id!);
      if (error) {
        alert(`Errore eliminazione recensione: ${error}`);
        return;
      }
      // CASCADE elimina i report dal DB — rimuovi dalla UI tutti quelli per questa review
      const reviewId = report.review_id;
      setReports((prev) => prev.filter((r) => r.review_id !== reviewId));
    });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Segnalazioni</h1>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 text-xs font-bold flex items-center justify-center transition-colors"
          title="Come funzionano le segnalazioni"
        >
          i
        </button>
      </div>

      {showHelp && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-gray-700">
          <p className="font-semibold mb-2">Come gestire le segnalazioni</p>
          <p className="mb-2">Gli utenti segnalano contenuti problematici: ristoranti con info errate, foto non pertinenti o recensioni inappropriate. Ogni segnalazione finisce qui in stato <strong>In attesa</strong>.</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Elimina foto / Elimina recensione</strong> — Rimuove il contenuto segnalato e risolve automaticamente tutte le segnalazioni associate.</li>
            <li><strong>Risolvi</strong> — Segna la segnalazione come gestita (es. hai contattato il ristorante o corretto i dati).</li>
            <li><strong>Archivia</strong> — La segnalazione non era fondata o non richiede azione. Viene chiusa senza intervenire.</li>
          </ul>
        </div>
      )}

      {/* Filtro tipo */}
      <div className="flex gap-2 mb-3">
        {(['all', 'restaurant', 'photo', 'review'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1 rounded text-sm ${
              typeFilter === t ? 'bg-gray-900 text-white' : 'bg-white border text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t === 'all' ? 'Tutti i tipi' : t === 'restaurant' ? 'Ristorante' : t === 'photo' ? 'Foto menu' : 'Recensione'}
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
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Contenuto</th>
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
                    {r.review_id ? (
                      <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">Recensione</span>
                    ) : r.menu_photo_id ? (
                      <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Foto menu</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">Ristorante</span>
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
                    ) : r.review_id ? (
                      <div className="max-w-xs">
                        {r.review_reviewer_name && (
                          <span className="text-xs text-gray-500">{r.review_reviewer_name}</span>
                        )}
                        {r.review_rating != null && r.review_rating > 0 && (
                          <span className="ml-1 text-yellow-600 text-xs">{'★'.repeat(r.review_rating)}</span>
                        )}
                        {r.review_comment && (
                          <p className="text-xs text-gray-600 truncate mt-0.5" title={r.review_comment}>{r.review_comment}</p>
                        )}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {REPORT_REASON_LABELS[r.reason as ReportReason] ?? r.reason}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={r.details ?? ''}>
                    {r.details || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.user_id ? (
                      <Link href={`/users/${r.user_id}`} className="text-blue-600 hover:underline">{r.reporter_name ?? 'Anonimo'}</Link>
                    ) : (r.reporter_name ?? 'Anonimo')}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === 'pending' && (
                      <div className="flex gap-2 justify-end">
                        {r.menu_photo_id && (
                          <button
                            onClick={() => deleteMenuPhoto(r)}
                            disabled={isBusy(r.id)}
                            className="text-red-600 hover:underline text-xs disabled:opacity-50"
                          >
                            {isBusy(r.id) ? '...' : 'Elimina foto'}
                          </button>
                        )}
                        {r.review_id && (
                          <button
                            onClick={() => deleteReview(r)}
                            disabled={isBusy(r.id)}
                            className="text-red-600 hover:underline text-xs disabled:opacity-50"
                          >
                            {isBusy(r.id) ? '...' : 'Elimina recensione'}
                          </button>
                        )}
                        <button
                          onClick={() => updateStatus(r.id, 'resolved')}
                          disabled={isBusy(r.id)}
                          className="text-green-600 hover:underline text-xs disabled:opacity-50"
                        >
                          {isBusy(r.id) ? '...' : 'Risolvi'}
                        </button>
                        <button
                          onClick={() => updateStatus(r.id, 'dismissed')}
                          disabled={isBusy(r.id)}
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
          onClick={loadMore}
          className="mt-4 px-4 py-2 bg-white border rounded text-sm hover:bg-gray-50"
        >
          Carica altre
        </button>
      )}
    </div>
  );
}
