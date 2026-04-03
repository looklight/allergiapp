import { useState } from 'react';

export type MediaItem =
  | { kind: 'review'; reviewId: string; photoIndex: number; url: string; thumb: string; restaurantName: string; date: string }
  | { kind: 'menu'; photoId: string; url: string; thumb: string; restaurantName: string; date: string };

interface Props {
  items: MediaItem[];
  isBusy: (id: string) => boolean;
  onDeleteReviewPhoto: (reviewId: string, photoIndex: number) => void;
  onDeleteMenuPhoto: (photoId: string) => void;
}

export default function MediaGallery({ items, isBusy, onDeleteReviewPhoto, onDeleteMenuPhoto }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h2 className="font-semibold mb-3">Media ({items.length})</h2>
      <div className="flex flex-wrap gap-2">
        {(showAll ? items : items.slice(0, 12)).map((m) => {
          const key = m.kind === 'review' ? `r_${m.reviewId}_${m.photoIndex}` : `m_${m.photoId}`;
          const busy = m.kind === 'review'
            ? isBusy(`rv_${m.reviewId}_${m.photoIndex}`)
            : isBusy(m.photoId);
          return (
            <div key={key} className="relative group" title={`${m.kind === 'review' ? 'Recensione' : 'Menu'} — ${m.restaurantName}`}>
              <a href={m.url} target="_blank" rel="noreferrer">
                <img
                  src={m.thumb}
                  alt=""
                  className="w-18 h-18 rounded object-cover hover:opacity-90 transition-opacity"
                />
              </a>
              <div className={`absolute bottom-0 left-0 right-0 rounded-b text-center text-[8px] leading-tight py-px text-white ${m.kind === 'review' ? 'bg-blue-600/70' : 'bg-green-600/70'}`}>
                {m.kind === 'review' ? 'Rev' : 'Menu'}
              </div>
              <button
                onClick={() =>
                  m.kind === 'review'
                    ? onDeleteReviewPhoto(m.reviewId, m.photoIndex)
                    : onDeleteMenuPhoto(m.photoId)
                }
                disabled={busy}
                className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] leading-none opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 disabled:opacity-50"
                title="Elimina foto"
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>
      {!showAll && items.length > 12 && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >
          Mostra tutti ({items.length})
        </button>
      )}
    </div>
  );
}
