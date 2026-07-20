import type { MenuPhoto } from '@/lib/types';
import Link from 'next/link';
import { useLightbox } from '@/contexts/LightboxContext';

interface Props {
  menuPhotos: MenuPhoto[];
  isBusy: (id: string) => boolean;
  onDelete: (photoId: string) => void;
}

export default function MenuPhotosSection({ menuPhotos, isBusy, onDelete }: Props) {
  const { open: openLightbox } = useLightbox();
  const photoUrls = menuPhotos.map((p) => p.image_url ?? p.thumbnail_url);
  return (
    <div className="bg-card rounded-lg shadow p-6 mb-6">
      <h2 className="font-semibold mb-3">Foto menu ({menuPhotos.length})</h2>
      {menuPhotos.length === 0 ? (
        <p className="text-sm text-faint">Nessuna foto del menu</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {menuPhotos.map((p, i) => (
            <div key={p.id} className="border rounded overflow-hidden">
              <button type="button" onClick={() => openLightbox(photoUrls, i)} className="block w-full">
                <img
                  src={p.thumbnail_url ?? p.image_url}
                  alt="Foto menu"
                  className="w-full h-32 object-cover hover:opacity-80 transition-opacity cursor-pointer"
                />
              </button>
              <div className="p-2">
                <p className="text-xs font-medium truncate">
                  {p.user_id ? (
                    <Link href={`/users/${p.user_id}`} className="text-primary hover:underline">{p.uploader_name ?? 'Anonimo'}</Link>
                  ) : (
                    <span className="italic text-faint">Utente inattivo</span>
                  )}
                </p>
                <p className="text-xs text-faint">
                  {new Date(p.created_at).toLocaleDateString('it-IT')}
                </p>
                <button
                  onClick={() => onDelete(p.id)}
                  disabled={isBusy(p.id)}
                  className="mt-1.5 inline-flex items-center px-2.5 py-1.5 rounded text-xs font-medium text-danger-strong bg-danger-soft hover:bg-danger-soft-hover disabled:opacity-50 transition-colors"
                >
                  {isBusy(p.id) ? '...' : 'Elimina'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
