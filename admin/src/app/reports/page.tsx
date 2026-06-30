'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Report, ReportReason, ReportStatus } from '@/lib/types';
import { REPORT_REASON_LABELS } from '@/lib/types';
import { deleteMenuPhotoWithCleanup, deleteReviewWithCleanup, deleteRestaurantWithCleanup } from '@/lib/storageCleanup';
import { confirmDestructive } from '@/lib/confirm';
import { flattenReportJoins } from '@/lib/flattenJoin';
import StatusBadge from '@/components/StatusBadge';
import { usePagination, PAGE_SIZE } from '@/hooks/usePagination';
import { useBusyIds } from '@/hooks/useBusyIds';
import { useLightbox } from '@/contexts/LightboxContext';
import Link from 'next/link';

export default function ReportsPage() {
  const { open: openLightbox } = useLightbox();
  const [showHelp, setShowHelp] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('pending');
  const [reasonFilter, setReasonFilter] = useState<ReportReason | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'restaurant' | 'photo' | 'review'>('all');
  const [reviewModal, setReviewModal] = useState<Report | null>(null);
  const { isBusy, withBusy } = useBusyIds();

  const fetchReports = useCallback(async (pageNum: number) => {
    let query = supabase
      .from('reports')
      .select('*, restaurants!restaurant_id(name, city), profiles!user_id(username, is_anonymous), menu_photos!menu_photo_id(thumbnail_url, image_url), reviews!review_id(comment, rating, profiles!user_id(username))')
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

  const [cleaningUp, setCleaningUp] = useState(false);

  const cleanupReports = async () => {
    const label = statusFilter === 'resolved' ? 'eliminate' : 'ignorate';
    if (!confirmDestructive(`Eliminare definitivamente tutte le segnalazioni ${label}? L'operazione è irreversibile.`)) return;
    setCleaningUp(true);
    const { error } = await supabase.from('reports').delete().eq('status', statusFilter);
    setCleaningUp(false);
    if (error) {
      alert(`Errore: ${error.message}`);
      return;
    }
    reset();
  };

  const dismissReport = async (reportId: string) => {
    await withBusy(reportId, async () => {
      const { error } = await supabase.from('reports').update({ status: 'dismissed' }).eq('id', reportId);
      if (error) {
        alert(`Errore: ${error.message}`);
        return;
      }
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: 'dismissed' } : r))
      );
    });
  };

  const deleteMenuPhoto = async (report: Report) => {
    if (!report.menu_photo_id) return;
    if (!confirm('Eliminare questa foto del menu e risolvere la segnalazione?')) return;
    await withBusy(report.id, async () => {
      // Marca come risolti tutti i report pending per questa foto (ON DELETE SET NULL li renderebbe orfani)
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

  const deleteRestaurant = async (report: Report) => {
    if (!report.restaurant_id) return;
    if (!confirmDestructive(`Eliminerai definitivamente il ristorante "${report.restaurant_name ?? ''}". Tutte le segnalazioni, recensioni e foto associate verranno rimosse.`)) return;
    await withBusy(report.id, async () => {
      const { error } = await deleteRestaurantWithCleanup(supabase, report.restaurant_id!);
      if (error) {
        alert(`Errore eliminazione ristorante: ${error}`);
        return;
      }
      // CASCADE elimina i report dal DB — rimuovi dalla UI tutti quelli per questo ristorante
      const restaurantId = report.restaurant_id;
      setReports((prev) => prev.filter((r) => r.restaurant_id !== restaurantId));
    });
  };

  return (
    <div>
      {reviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setReviewModal(null)}
        >
          <div
            className="bg-card rounded-xl shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Recensione segnalata</h2>
              <button onClick={() => setReviewModal(null)} className="text-faint hover:text-foreground-secondary text-xl leading-none">&times;</button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              {reviewModal.review_reviewer_name && (
                <span className="text-sm font-medium text-foreground-secondary">{reviewModal.review_reviewer_name}</span>
              )}
              {reviewModal.review_rating != null && reviewModal.review_rating > 0 && (
                <span className="text-star">{'★'.repeat(reviewModal.review_rating)}{'☆'.repeat(5 - reviewModal.review_rating)}</span>
              )}
            </div>
            <p className="text-foreground-secondary text-sm leading-relaxed whitespace-pre-wrap">
              {reviewModal.review_comment ?? <span className="italic text-faint">Nessun testo</span>}
            </p>
            {reviewModal.restaurant_id && (
              <div className="mt-4 pt-4 border-t">
                <Link
                  href={`/restaurants/${reviewModal.restaurant_id}`}
                  className="text-primary hover:underline text-sm"
                  onClick={() => setReviewModal(null)}
                >
                  Vai al ristorante &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Segnalazioni</h1>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-6 h-6 rounded-full bg-muted text-foreground-secondary hover:bg-muted-hover text-xs font-bold flex items-center justify-center transition-colors"
          title="Come funzionano le segnalazioni"
        >
          i
        </button>
      </div>

      {showHelp && (
        <div className="bg-info-soft border border-info-border rounded-lg p-4 mb-6 text-sm text-foreground-secondary">
          <p className="font-semibold mb-2">Come gestire le segnalazioni</p>
          <p className="mb-2">Gli utenti segnalano contenuti problematici: ristoranti chiusi o duplicati, foto non pertinenti, recensioni inappropriate. Ogni segnalazione finisce qui in stato <strong>In attesa</strong>.</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Elimina</strong> — Rimuove il contenuto segnalato (foto, recensione o ristorante) e chiude tutte le segnalazioni associate.</li>
            <li><strong>Ignora</strong> — La segnalazione non è fondata o è già stata gestita altrove. Viene chiusa senza intervenire.</li>
          </ul>
        </div>
      )}

      {/* Filtro tipo */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {(['all', 'restaurant', 'photo', 'review'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1 rounded text-sm ${
              typeFilter === t ? 'bg-selected text-selected-foreground' : 'bg-card border text-foreground-secondary hover:bg-muted'
            }`}
          >
            {t === 'all' ? 'Tutti i tipi' : t === 'restaurant' ? 'Ristorante' : t === 'photo' ? 'Foto menu' : 'Recensione'}
          </button>
        ))}
      </div>

      {/* Filtri status */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {(['all', 'pending', 'resolved', 'dismissed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded text-sm ${
              statusFilter === s ? 'bg-selected text-selected-foreground' : 'bg-card border text-foreground-secondary hover:bg-muted'
            }`}
          >
            {s === 'all' ? 'Tutti' : s === 'pending' ? 'In attesa' : s === 'resolved' ? 'Eliminate' : 'Ignorate'}
          </button>
        ))}
      </div>
      {(statusFilter === 'resolved' || statusFilter === 'dismissed') && (
        <div className="flex justify-end mb-3">
          <button
            onClick={cleanupReports}
            disabled={cleaningUp}
            className="px-3 py-1 rounded text-sm text-danger border border-danger-border hover:bg-danger-soft disabled:opacity-50 transition-colors"
          >
            {cleaningUp ? 'Eliminazione...' : 'Pulisci storico'}
          </button>
        </div>
      )}

      {/* Filtri motivo */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setReasonFilter('all')}
          className={`px-3 py-1 rounded text-sm ${
            reasonFilter === 'all' ? 'bg-selected text-selected-foreground' : 'bg-card border text-foreground-secondary hover:bg-muted'
          }`}
        >
          Tutti i motivi
        </button>
        {(Object.keys(REPORT_REASON_LABELS) as ReportReason[]).map((reason) => (
          <button
            key={reason}
            onClick={() => setReasonFilter(reason)}
            className={`px-3 py-1 rounded text-sm ${
              reasonFilter === reason ? 'bg-selected text-selected-foreground' : 'bg-card border text-foreground-secondary hover:bg-muted'
            }`}
          >
            {REPORT_REASON_LABELS[reason]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Caricamento...</p>
      ) : reports.length === 0 ? (
        <p className="text-faint">Nessuna segnalazione trovata.</p>
      ) : (
        <>
          {/* Desktop: tabella */}
          <div className="hidden md:block bg-card rounded-lg shadow overflow-hidden">
            <table className="w-full text-xs table-fixed">
              <thead className="bg-background text-left">
                <tr>
                  <th className="px-3 py-3 font-medium w-[24%]">Ristorante</th>
                  <th className="px-3 py-3 font-medium w-[12%]">Tipo</th>
                  <th className="px-3 py-3 font-medium w-[22%]">Contenuto</th>
                  <th className="px-3 py-3 font-medium w-[24%]">Motivo</th>
                  <th className="px-3 py-3 font-medium w-[18%]">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-background">
                    <td className="px-3 py-3 align-top overflow-hidden">
                      <div className="truncate">
                        {r.restaurant_id ? (
                          <Link href={`/restaurants/${r.restaurant_id}`} className="text-primary hover:underline font-medium">
                            {r.restaurant_name ?? '—'}
                          </Link>
                        ) : <span className="text-faint">—</span>}
                      </div>
                      {r.restaurant_city && (
                        <div className="truncate text-faint mt-0.5">{r.restaurant_city}</div>
                      )}
                      <div className="overflow-hidden flex items-center gap-1 text-faint mt-0.5">
                        <span className="shrink-0">Da:</span>
                        {r.user_id ? (
                          <Link href={`/users/${r.user_id}`} className="text-primary underline truncate min-w-0">
                            {r.reporter_name ?? 'Anonimo'}
                          </Link>
                        ) : <span className="italic truncate text-faint">Utente inattivo</span>}
                        {r.reporter_is_anonymous && (
                          <span className="shrink-0 px-1 py-0.5 bg-muted text-muted-foreground rounded text-[10px]">anonimo</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top overflow-hidden">
                      {r.review_id ? (
                        <span className="inline-block px-2 py-0.5 bg-tag-review text-tag-review-foreground rounded">Recensione</span>
                      ) : r.menu_photo_id ? (
                        <span className="inline-block px-2 py-0.5 bg-tag-photo text-tag-photo-foreground rounded">Foto menu</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 bg-tag-restaurant text-tag-restaurant-foreground rounded">Ristorante</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top overflow-hidden">
                      {r.menu_photo_thumbnail_url ? (
                        <button
                          type="button"
                          onClick={() => openLightbox([r.menu_photo_image_url ?? r.menu_photo_thumbnail_url])}
                          className="block"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={r.menu_photo_thumbnail_url}
                            alt="Foto segnalata"
                            width={48}
                            height={48}
                            className="rounded object-cover cursor-pointer"
                          />
                        </button>
                      ) : r.review_id ? (
                        <button
                          onClick={() => setReviewModal(r)}
                          className="text-left w-full hover:bg-background rounded -mx-1 px-1 py-0.5 transition-colors"
                          title="Clicca per leggere la recensione completa"
                        >
                          <div className="flex items-center gap-1 mb-0.5">
                            {r.review_reviewer_name && (
                              <span className="text-muted-foreground truncate">{r.review_reviewer_name}</span>
                            )}
                            {r.review_rating != null && r.review_rating > 0 && (
                              <span className="text-star shrink-0">{'★'.repeat(r.review_rating)}</span>
                            )}
                          </div>
                          {r.review_comment && (
                            <p className="text-foreground-secondary truncate">{r.review_comment}</p>
                          )}
                        </button>
                      ) : <span className="text-faint">—</span>}
                    </td>
                    <td className="px-3 py-3 align-top overflow-hidden">
                      <div className="truncate font-medium text-foreground-secondary">
                        {REPORT_REASON_LABELS[r.reason as ReportReason] ?? r.reason}
                      </div>
                      {r.details && (
                        <div className="truncate text-faint mt-0.5" title={r.details}>{r.details}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top overflow-hidden">
                      {r.status === 'pending' ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              if (r.menu_photo_id) deleteMenuPhoto(r);
                              else if (r.review_id) deleteReview(r);
                              else if (r.restaurant_id) deleteRestaurant(r);
                            }}
                            disabled={isBusy(r.id)}
                            className="px-2.5 py-1 rounded bg-danger-soft text-danger-strong font-medium hover:bg-danger-soft-hover disabled:opacity-50 transition-colors"
                          >
                            {isBusy(r.id) ? '...' : 'Elimina'}
                          </button>
                          <button
                            onClick={() => dismissReport(r.id)}
                            disabled={isBusy(r.id)}
                            className="px-2.5 py-1 rounded bg-muted text-foreground-secondary font-medium hover:bg-muted-hover disabled:opacity-50 transition-colors"
                          >
                            Ignora
                          </button>
                        </div>
                      ) : (
                        <StatusBadge status={r.status} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: card */}
          <div className="md:hidden space-y-3">
            {reports.map((r) => (
              <article key={r.id} className="bg-card rounded-lg shadow p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    {r.restaurant_id ? (
                      <Link href={`/restaurants/${r.restaurant_id}`} className="text-primary hover:underline font-medium text-sm block truncate">
                        {r.restaurant_name ?? '—'}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                    {r.restaurant_city && (
                      <span className="text-faint text-xs">{r.restaurant_city}</span>
                    )}
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {r.review_id ? (
                    <span className="inline-block px-2 py-0.5 bg-tag-review text-tag-review-foreground rounded text-xs">Recensione</span>
                  ) : r.menu_photo_id ? (
                    <span className="inline-block px-2 py-0.5 bg-tag-photo text-tag-photo-foreground rounded text-xs">Foto menu</span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 bg-tag-restaurant text-tag-restaurant-foreground rounded text-xs">Ristorante</span>
                  )}
                  <span className="text-xs text-foreground-secondary">
                    {REPORT_REASON_LABELS[r.reason as ReportReason] ?? r.reason}
                  </span>
                </div>

                {r.menu_photo_thumbnail_url && (
                  <button
                    type="button"
                    onClick={() => openLightbox([r.menu_photo_image_url ?? r.menu_photo_thumbnail_url])}
                    className="inline-block mb-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.menu_photo_thumbnail_url}
                      alt="Foto segnalata"
                      width={64}
                      height={64}
                      className="rounded object-cover cursor-pointer"
                    />
                  </button>
                )}

                {r.review_id && (r.review_reviewer_name || r.review_comment) && (
                  <button
                    onClick={() => setReviewModal(r)}
                    className="w-full text-left mb-2 text-xs bg-background rounded p-2 hover:bg-muted transition-colors"
                    title="Clicca per leggere la recensione completa"
                  >
                    {r.review_reviewer_name && (
                      <span className="text-muted-foreground">{r.review_reviewer_name}</span>
                    )}
                    {r.review_rating != null && r.review_rating > 0 && (
                      <span className="ml-1 text-star">{'★'.repeat(r.review_rating)}</span>
                    )}
                    {r.review_comment && (
                      <p className="text-foreground-secondary mt-1 line-clamp-2">{r.review_comment}</p>
                    )}
                  </button>
                )}

                {r.details && (
                  <p className="text-sm text-foreground-secondary mb-2 break-words">{r.details}</p>
                )}

                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1 flex-wrap">
                  <span>Da:</span>
                  {r.user_id ? (
                    <Link href={`/users/${r.user_id}`} className="text-primary underline">
                      {r.reporter_name ?? 'Anonimo'}
                    </Link>
                  ) : <span className="italic text-faint">Utente inattivo</span>}
                  {r.reporter_is_anonymous && (
                    <span className="px-1 py-0.5 bg-muted text-muted-foreground rounded text-[10px]">anonimo</span>
                  )}
                </p>

                {r.status === 'pending' && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t justify-end">
                    <button
                      onClick={() => {
                        if (r.menu_photo_id) deleteMenuPhoto(r);
                        else if (r.review_id) deleteReview(r);
                        else if (r.restaurant_id) deleteRestaurant(r);
                      }}
                      disabled={isBusy(r.id)}
                      className="px-3 py-2 rounded bg-danger-soft text-danger-strong text-sm font-medium disabled:opacity-50"
                    >
                      {isBusy(r.id) ? '...' : r.menu_photo_id ? 'Elimina foto' : r.review_id ? 'Elimina recensione' : 'Elimina ristorante'}
                    </button>
                    <button
                      onClick={() => dismissReport(r.id)}
                      disabled={isBusy(r.id)}
                      className="px-3 py-2 rounded bg-muted text-foreground-secondary text-sm font-medium disabled:opacity-50"
                    >
                      Ignora
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </>
      )}

      {loading && reports.length > 0 && <p className="text-muted-foreground mt-4">Caricamento...</p>}

      {hasMore && !loading && (
        <button
          onClick={loadMore}
          className="mt-4 px-4 py-2 bg-card border rounded text-sm hover:bg-background"
        >
          Carica altre
        </button>
      )}
    </div>
  );
}
