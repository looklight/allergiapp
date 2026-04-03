import type { MenuPhoto } from '@/lib/types';
import Link from 'next/link';

interface Props {
  menuPhotos: MenuPhoto[];
  isBusy: (id: string) => boolean;
  onDelete: (photoId: string) => void;
}

export default function MenuPhotosSection({ menuPhotos, isBusy, onDelete }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="font-semibold mb-3">Foto menu ({menuPhotos.length})</h2>
      {menuPhotos.length === 0 ? (
        <p className="text-sm text-gray-400">Nessuna foto del menu</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {menuPhotos.map((p) => (
            <div key={p.id} className="border rounded overflow-hidden">
              <a href={p.image_url} target="_blank" rel="noreferrer">
                <img
                  src={p.thumbnail_url ?? p.image_url}
                  alt="Foto menu"
                  className="w-full h-32 object-cover hover:opacity-80 transition-opacity cursor-pointer"
                />
              </a>
              <div className="p-2">
                <p className="text-xs font-medium truncate">
                  {p.user_id ? (
                    <Link href={`/users/${p.user_id}`} className="text-blue-600 hover:underline">{p.uploader_name ?? 'Anonimo'}</Link>
                  ) : (p.uploader_name ?? 'Utente della community')}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(p.created_at).toLocaleDateString('it-IT')}
                </p>
                <button
                  onClick={() => onDelete(p.id)}
                  disabled={isBusy(p.id)}
                  className="mt-1.5 text-xs text-red-600 hover:underline disabled:opacity-50"
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
