import type { Review } from '@/lib/types';
import Link from 'next/link';

interface Props {
  reviews: Review[];
  isBusy: (id: string) => boolean;
  onDeleteReview: (reviewId: string) => void;
  onDeletePhoto: (reviewId: string, photoIndex: number) => void;
}

export default function ReviewsSection({ reviews, isBusy, onDeleteReview, onDeletePhoto }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="font-semibold mb-3">Recensioni ({reviews.length})</h2>
      {reviews.length === 0 ? (
        <p className="text-sm text-gray-400">Nessuna recensione</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="border rounded p-3 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  {r.user_id ? (
                    <Link href={`/users/${r.user_id}`} className="font-medium text-blue-600 hover:underline">{r.reviewer_name ?? 'Anonimo'}</Link>
                  ) : (
                    <span className="font-medium">Anonimo</span>
                  )}
                  {r.rating > 0 && (
                    <span className="ml-2 text-yellow-600">{'★'.repeat(r.rating)}</span>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-gray-400 text-xs">
                    {new Date(r.created_at).toLocaleDateString('it-IT')}
                  </span>
                  <button
                    onClick={() => onDeleteReview(r.id)}
                    disabled={isBusy(r.id)}
                    className="text-red-600 hover:underline text-xs disabled:opacity-50"
                  >
                    {isBusy(r.id) ? '...' : 'Elimina'}
                  </button>
                </div>
              </div>
              {r.comment && <p className="text-gray-600 mt-1">{r.comment}</p>}
              {r.photos?.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {(r.photos as { url: string; thumbnailUrl?: string }[]).map((photo, i) => (
                    <div key={i} className="relative group">
                      <a href={photo.url} target="_blank" rel="noreferrer">
                        <img
                          src={photo.thumbnailUrl ?? photo.url}
                          alt="Foto recensione"
                          className="w-16 h-16 rounded object-cover hover:opacity-80 transition-opacity"
                        />
                      </a>
                      <button
                        onClick={() => onDeletePhoto(r.id, i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center hover:bg-red-700"
                        title="Elimina foto"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
