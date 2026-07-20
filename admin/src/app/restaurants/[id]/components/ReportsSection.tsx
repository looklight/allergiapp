import type { Report } from '@/lib/types';
import { REPORT_REASON_LABELS, type ReportReason } from '@/lib/types';
import Link from 'next/link';
import { useLightbox } from '@/contexts/LightboxContext';

interface Props {
  reports: Report[];
  isBusy: (id: string) => boolean;
  onDismiss: (reportId: string) => void;
  onDeletePhoto: (report: Report) => void;
  onDeleteReview: (report: Report) => void;
  onDeleteRestaurant: (report: Report) => void;
}

export default function ReportsSection({ reports, isBusy, onDismiss, onDeletePhoto, onDeleteReview, onDeleteRestaurant }: Props) {
  const { open: openLightbox } = useLightbox();
  if (reports.length === 0) return null;

  return (
    <div className="bg-card rounded-lg shadow p-6 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-semibold">Segnalazioni ({reports.length})</h2>
        <div className="group relative">
          <button className="w-5 h-5 rounded-full bg-muted text-foreground-secondary hover:bg-muted-hover text-xs font-bold flex items-center justify-center">i</button>
          <div className="hidden group-hover:block absolute left-0 top-7 z-10 w-80 bg-card border rounded-lg shadow-lg p-3 text-xs text-foreground-secondary">
            <strong>Elimina</strong> — rimuove foto, recensione o ristorante segnalato e chiude le segnalazioni associate.<br/>
            <strong>Ignora</strong> — segnalazione non fondata o già gestita, chiusa senza azione.
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {reports.map((r) => (
          <div key={r.id} className="border rounded p-3 text-sm">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {r.review_id ? (
                    <span className="inline-block px-2 py-0.5 bg-tag-review text-tag-review-foreground rounded text-xs">Recensione</span>
                  ) : r.menu_photo_id ? (
                    <span className="inline-block px-2 py-0.5 bg-tag-photo text-tag-photo-foreground rounded text-xs">Foto menu</span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 bg-tag-restaurant text-tag-restaurant-foreground rounded text-xs">Ristorante</span>
                  )}
                  <span className="font-medium">
                    {REPORT_REASON_LABELS[r.reason as ReportReason] ?? r.reason}
                  </span>
                  {r.user_id ? (
                    <Link href={`/users/${r.user_id}`} className="text-primary hover:underline text-sm">{r.reporter_name ?? 'Anonimo'}</Link>
                  ) : (
                    <span className="italic text-faint text-sm">Utente inattivo</span>
                  )}
                </div>
                {/* Contenuto segnalato */}
                {r.review_id && (r.review_comment || r.review_rating) && (
                  <div className="bg-tag-review-soft rounded p-2 mt-1 mb-1">
                    {r.review_reviewer_name && <span className="text-xs text-muted-foreground">{r.review_reviewer_name}</span>}
                    {r.review_rating != null && r.review_rating > 0 && (
                      <span className="ml-1 text-star text-xs">{'★'.repeat(r.review_rating)}</span>
                    )}
                    {r.review_comment && <p className="text-xs text-foreground-secondary mt-0.5">{r.review_comment}</p>}
                  </div>
                )}
                {r.menu_photo_id && r.menu_photo_thumbnail_url && (
                  <div className="mt-1 mb-1">
                    <button
                      type="button"
                      onClick={() => openLightbox([r.menu_photo_image_url ?? r.menu_photo_thumbnail_url])}
                      className="block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.menu_photo_thumbnail_url} alt="Foto segnalata" width={64} height={64} className="rounded object-cover cursor-pointer" />
                    </button>
                  </div>
                )}
                {r.details && <p className="text-foreground-secondary mt-1">{r.details}</p>}
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                <button
                  onClick={() => {
                    if (r.menu_photo_id) onDeletePhoto(r);
                    else if (r.review_id) onDeleteReview(r);
                    else onDeleteRestaurant(r);
                  }}
                  disabled={isBusy(r.id)}
                  className="inline-flex items-center px-2.5 py-1.5 rounded text-xs font-medium text-danger-strong bg-danger-soft hover:bg-danger-soft-hover disabled:opacity-50 transition-colors"
                >
                  {isBusy(r.id) ? '...' : r.menu_photo_id ? 'Elimina foto' : r.review_id ? 'Elimina recensione' : 'Elimina ristorante'}
                </button>
                <button
                  onClick={() => onDismiss(r.id)}
                  disabled={isBusy(r.id)}
                  className="inline-flex items-center px-2.5 py-1.5 rounded text-xs font-medium text-foreground-secondary bg-muted hover:bg-muted-hover disabled:opacity-50 transition-colors"
                >
                  Ignora
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
