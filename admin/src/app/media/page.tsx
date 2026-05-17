'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { deleteReviewPhotoWithCleanup, deleteMenuPhotoWithCleanup } from '@/lib/storageCleanup';
import { useBusyIds } from '@/hooks/useBusyIds';

type Periodo = 'oggi' | '7gg' | '30gg' | 'tutto';
type Tipo = 'tutti' | 'recensioni' | 'menu';

interface MediaItem {
  kind: 'review' | 'menu';
  id: string;
  reviewId?: string;
  photoIndex?: number;
  photoId?: string;
  url: string;
  thumb: string;
  restaurantId: string;
  restaurantName: string;
  city: string | null;
  country: string | null;
  userId: string | null;
  username: string | null;
  createdAt: string;
  rating?: number;
  comment?: string | null;
}

const PAGE_SIZE = 50;

function periodoToISO(p: Periodo): string | null {
  const now = new Date();
  if (p === 'oggi') { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.toISOString(); }
  if (p === '7gg') { const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString(); }
  if (p === '30gg') { const d = new Date(now); d.setDate(d.getDate() - 30); return d.toISOString(); }
  return null;
}

function busyKey(item: MediaItem): string {
  return item.kind === 'review' ? `rv_${item.reviewId}_${item.photoIndex}` : item.photoId!;
}

export default function MediaPage() {
  const [tipo, setTipo] = useState<Tipo>('tutti');
  const [periodo, setPeriodo] = useState<Periodo>('7gg');
  const [paese, setPaese] = useState<string>('');
  const [countries, setCountries] = useState<{ name: string; count: number }[]>([]);

  const [items, setItems] = useState<MediaItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<MediaItem | null>(null);
  const { isBusy, withBusy } = useBusyIds();

  // Popola lista Paesi con conteggio — solo paesi con media effettivamente presenti.
  // Le review con photos=[] (jsonb default) vengono escluse via .neq('photos','[]').
  useEffect(() => {
    Promise.all([
      supabase.from('menu_photos').select('restaurants!inner(country)').not('restaurants.country', 'is', null),
      supabase.from('reviews').select('restaurants!inner(country)').not('photos->0', 'is', null).not('restaurants.country', 'is', null),
    ]).then(([menuRes, reviewRes]) => {
      const counts = new Map<string, number>();
      for (const row of [...(menuRes.data ?? []), ...(reviewRes.data ?? [])] as any[]) {
        const c = row.restaurants?.country;
        if (!c) continue;
        counts.set(c, (counts.get(c) ?? 0) + 1);
      }
      const sorted = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));
      setCountries(sorted);
    });
  }, []);

  const fetchPage = useCallback(async (beforeCursor: string | null): Promise<MediaItem[]> => {
    const periodoIso = periodoToISO(periodo);
    const queries: Promise<MediaItem[]>[] = [];

    if (tipo === 'tutti' || tipo === 'recensioni') {
      queries.push((async () => {
        // photos è jsonb con default '[]' → filtra le review che hanno almeno un
        // elemento. photos->0 ritorna NULL per array vuoto.
        let q = supabase
          .from('reviews')
          .select('id, restaurant_id, user_id, rating, comment, photos, created_at, restaurants!inner(name, city, country), profiles(username)')
          .not('photos->0', 'is', null)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE + 1);
        if (beforeCursor) q = q.lt('created_at', beforeCursor);
        if (periodoIso) q = q.gte('created_at', periodoIso);
        if (paese) q = q.eq('restaurants.country', paese);
        const { data, error } = await q;
        console.log('[media] reviews query →', { error, rows: data?.length ?? 0, firstRow: data?.[0] });
        const out: MediaItem[] = [];
        for (const row of (data ?? []) as any[]) {
          const photos = (row.photos ?? []) as Array<{ url: string; thumbnailUrl?: string }>;
          console.log('[media] review row', row.id, 'photos:', photos);
          photos.forEach((p, i) => {
            if (!p?.url) { console.log('[media]   skip photo idx', i, 'missing url:', p); return; }
            out.push({
              kind: 'review',
              id: `r_${row.id}_${i}`,
              reviewId: row.id,
              photoIndex: i,
              url: p.url,
              thumb: p.thumbnailUrl ?? p.url,
              restaurantId: row.restaurant_id,
              restaurantName: row.restaurants?.name ?? '—',
              city: row.restaurants?.city ?? null,
              country: row.restaurants?.country ?? null,
              userId: row.user_id,
              username: row.profiles?.username ?? null,
              createdAt: row.created_at,
              rating: row.rating,
              comment: row.comment,
            });
          });
        }
        return out;
      })());
    }

    if (tipo === 'tutti' || tipo === 'menu') {
      queries.push((async () => {
        let q = supabase
          .from('menu_photos')
          .select('id, restaurant_id, user_id, image_url, thumbnail_url, created_at, restaurants!inner(name, city, country), profiles(username)')
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE + 1);
        if (beforeCursor) q = q.lt('created_at', beforeCursor);
        if (periodoIso) q = q.gte('created_at', periodoIso);
        if (paese) q = q.eq('restaurants.country', paese);
        const { data, error } = await q;
        console.log('[media] menu_photos query →', { error, rows: data?.length ?? 0 });
        return ((data ?? []) as any[]).map((row): MediaItem => ({
          kind: 'menu',
          id: `m_${row.id}`,
          photoId: row.id,
          url: row.image_url,
          thumb: row.thumbnail_url ?? row.image_url,
          restaurantId: row.restaurant_id,
          restaurantName: row.restaurants?.name ?? '—',
          city: row.restaurants?.city ?? null,
          country: row.restaurants?.country ?? null,
          userId: row.user_id,
          username: row.profiles?.username ?? null,
          createdAt: row.created_at,
        }));
      })());
    }

    const results = await Promise.all(queries);
    const merged = results.flat();
    merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    console.log('[media] merged result →', { total: merged.length, reviews: merged.filter(m => m.kind === 'review').length, menu: merged.filter(m => m.kind === 'menu').length });
    return merged;
  }, [tipo, periodo, paese]);

  const load = useCallback(async (beforeCursor: string | null, append: boolean) => {
    setLoading(true);
    const data = await fetchPage(beforeCursor);
    const pageItems = data.slice(0, PAGE_SIZE);
    setHasMore(data.length > PAGE_SIZE);
    setItems(prev => append ? [...prev, ...pageItems] : pageItems);
    if (pageItems.length > 0) {
      setCursor(pageItems[pageItems.length - 1].createdAt);
    }
    setLoading(false);
  }, [fetchPage]);

  useEffect(() => {
    setCursor(null);
    load(null, false);
  }, [tipo, periodo, paese]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC chiude la modal fullscreen
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const handleDelete = async (item: MediaItem) => {
    if (!confirm('Eliminare questa foto?')) return;
    await withBusy(busyKey(item), async () => {
      const { error } = item.kind === 'review'
        ? await deleteReviewPhotoWithCleanup(supabase, item.reviewId!, item.photoIndex!)
        : await deleteMenuPhotoWithCleanup(supabase, item.photoId!);
      if (error) { alert(`Errore: ${error}`); return; }
      setItems(prev => prev.filter(p => p.id !== item.id));
      setSelected(null);
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Media</h1>

      {/* Filtro tipo */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {(['tutti', 'recensioni', 'menu'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={`px-3 py-1 rounded text-sm ${
              tipo === t ? 'bg-gray-900 text-white' : 'bg-white border text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t === 'tutti' ? 'Tutti i media' : t === 'recensioni' ? 'Recensioni' : 'Menu'}
          </button>
        ))}
      </div>

      {/* Filtro periodo */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {(['oggi', '7gg', '30gg', 'tutto'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`px-3 py-1 rounded text-sm ${
              periodo === p ? 'bg-gray-900 text-white' : 'bg-white border text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p === 'oggi' ? 'Oggi' : p === '7gg' ? 'Ultimi 7 giorni' : p === '30gg' ? 'Ultimi 30 giorni' : 'Tutto'}
          </button>
        ))}
      </div>

      {/* Filtro paese */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setPaese('')}
          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
            paese === '' ? 'bg-gray-900 text-white' : 'bg-white border text-gray-600 hover:bg-gray-100'
          }`}
        >
          Tutti i paesi
        </button>
        {countries.map((c) => (
          <button
            key={c.name}
            onClick={() => setPaese(c.name)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              paese === c.name ? 'bg-gray-900 text-white' : 'bg-white border text-gray-600 hover:bg-gray-100'
            }`}
          >
            {c.name} <span className="text-xs opacity-60">{c.count}</span>
          </button>
        ))}
      </div>

      {items.length === 0 && !loading ? (
        <p className="text-gray-400 text-sm">Nessun media corrisponde ai filtri.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className="text-left bg-white rounded shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="relative">
                <img src={item.thumb} alt="" loading="lazy" className="w-full aspect-square object-cover" />
                <span className={`absolute top-1 right-1 text-[10px] font-bold rounded px-1.5 py-0.5 text-white ${item.kind === 'review' ? 'bg-blue-600/80' : 'bg-green-600/80'}`}>
                  {item.kind === 'review' ? 'R' : 'M'}
                </span>
              </div>
              <div className="p-2">
                <div className="text-xs font-medium text-gray-900 truncate">{item.restaurantName}</div>
                <div className="text-[11px] text-gray-500 truncate">
                  {[item.city, item.country].filter(Boolean).join(', ') || '—'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {loading && <p className="text-gray-500 mt-4">Caricamento...</p>}

      {hasMore && !loading && (
        <button
          onClick={() => load(cursor, true)}
          className="mt-4 px-4 py-2 bg-white border rounded text-sm hover:bg-gray-50"
        >
          Carica altri
        </button>
      )}

      {selected && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-full overflow-auto flex flex-col md:flex-row"
            onClick={e => e.stopPropagation()}
          >
            <div className="md:w-2/3 bg-gray-100 flex items-center justify-center">
              <img src={selected.url} alt="" className="object-contain max-h-[80vh] w-full" />
            </div>
            <div className="md:w-1/3 p-5 flex flex-col gap-3">
              <div>
                <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Tipo</div>
                <span className={`inline-block text-xs font-medium rounded px-2 py-0.5 text-white ${selected.kind === 'review' ? 'bg-blue-600' : 'bg-green-600'}`}>
                  {selected.kind === 'review' ? 'Recensione' : 'Menu'}
                </span>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Ristorante</div>
                <Link href={`/restaurants/${selected.restaurantId}`} className="text-blue-600 hover:underline font-medium">
                  {selected.restaurantName}
                </Link>
                <div className="text-sm text-gray-500">
                  {[selected.city, selected.country].filter(Boolean).join(', ') || '—'}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Autore</div>
                {selected.userId ? (
                  <Link href={`/users/${selected.userId}`} className="text-blue-600 hover:underline">
                    {selected.username || 'Anonimo'}
                  </Link>
                ) : (
                  <span className="italic text-gray-400">Utente inattivo</span>
                )}
              </div>
              <div>
                <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Data</div>
                <div className="text-sm">{new Date(selected.createdAt).toLocaleString('it-IT')}</div>
              </div>
              {selected.kind === 'review' && selected.rating != null && selected.rating > 0 && (
                <div>
                  <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Rating</div>
                  <div className="text-yellow-600">{'★'.repeat(selected.rating)}</div>
                </div>
              )}
              {selected.kind === 'review' && selected.comment && (
                <div>
                  <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Commento</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{selected.comment}</div>
                </div>
              )}
              <div className="mt-auto pt-4 border-t flex gap-2">
                <button
                  onClick={() => setSelected(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                >
                  Chiudi
                </button>
                <button
                  onClick={() => handleDelete(selected)}
                  disabled={isBusy(busyKey(selected))}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded text-sm"
                >
                  Elimina
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
