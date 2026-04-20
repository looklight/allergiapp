import type { Report } from '@/lib/types';
import { REPORT_REASON_LABELS, type ReportReason } from '@/lib/types';
import Link from 'next/link';

interface Props {
  reports: Report[];
  isBusy: (id: string) => boolean;
  onDismiss: (reportId: string) => void;
  onDeletePhoto: (report: Report) => void;
  onDeleteReview: (report: Report) => void;
  onDeleteRestaurant: (report: Report) => void;
}

export default function ReportsSection({ reports, isBusy, onDismiss, onDeletePhoto, onDeleteReview, onDeleteRestaurant }: Props) {
  if (reports.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-semibold">Segnalazioni ({reports.length})</h2>
        <div className="group relative">
          <button className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 text-xs font-bold flex items-center justify-center">i</button>
          <div className="hidden group-hover:block absolute left-0 top-7 z-10 w-80 bg-white border rounded-lg shadow-lg p-3 text-xs text-gray-600">
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
                    <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">Recensione</span>
                  ) : r.menu_photo_id ? (
                    <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Foto menu</span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">Ristorante</span>
                  )}
                  <span className="font-medium">
                    {REPORT_REASON_LABELS[r.reason as ReportReason] ?? r.reason}
                  </span>
                  {r.user_id ? (
                    <Link href={`/users/${r.user_id}`} className="text-blue-600 hover:underline text-sm">{r.reporter_name ?? 'Anonimo'}</Link>
                  ) : (
                    <span className="text-gray-400">{r.reporter_name ?? 'Anonimo'}</span>
                  )}
                </div>
                {/* Contenuto segnalato */}
                {r.review_id && (r.review_comment || r.review_rating) && (
                  <div className="bg-purple-50 rounded p-2 mt-1 mb-1">
                    {r.review_reviewer_name && <span className="text-xs text-gray-500">{r.review_reviewer_name}</span>}
                    {r.review_rating != null && r.review_rating > 0 && (
                      <span className="ml-1 text-yellow-600 text-xs">{'★'.repeat(r.review_rating)}</span>
                    )}
                    {r.review_comment && <p className="text-xs text-gray-600 mt-0.5">{r.review_comment}</p>}
                  </div>
                )}
                {r.menu_photo_id && r.menu_photo_thumbnail_url && (
                  <div className="mt-1 mb-1">
                    <a href={r.menu_photo_image_url ?? r.menu_photo_thumbnail_url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.menu_photo_thumbnail_url} alt="Foto segnalata" width={64} height={64} className="rounded object-cover" />
                    </a>
                  </div>
                )}
                {r.details && <p className="text-gray-600 mt-1">{r.details}</p>}
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                <button
                  onClick={() => {
                    if (r.menu_photo_id) onDeletePhoto(r);
                    else if (r.review_id) onDeleteReview(r);
                    else onDeleteRestaurant(r);
                  }}
                  disabled={isBusy(r.id)}
                  className="text-red-600 hover:underline text-xs disabled:opacity-50"
                >
                  {isBusy(r.id) ? '...' : r.menu_photo_id ? 'Elimina foto' : r.review_id ? 'Elimina recensione' : 'Elimina ristorante'}
                </button>
                <button
                  onClick={() => onDismiss(r.id)}
                  disabled={isBusy(r.id)}
                  className="text-gray-600 hover:underline text-xs disabled:opacity-50"
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
