'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { deleteReviewPhotoWithCleanup, deleteMenuPhotoWithCleanup } from '@/lib/storageCleanup';
import { useBusyIds } from '@/hooks/useBusyIds';
import { getCountryName } from '@/lib/countryName';

type Periodo = 'oggi' | '7gg' | '30gg' | 'tutto';
type Tipo = 'tutti' | 'recensioni' | 'menu';

interface MediaItemBase {
  id: string;
  url: string;
  thumb: string;
  restaurantId: string;
  restaurantName: string;
  city: string | null;
  country: string | null;
  userId: string | null;
  username: string | null;
  createdAt: string;
}

type MediaItem =
  | (MediaItemBase & {
      kind: 'review';
      reviewId: string;
      photoIndex: number;
      rating: number | null;
      comment: string | null;
    })
  | (MediaItemBase & { kind: 'menu'; photoId: string });

type RestaurantJoin = { name: string; city: string | null; country: string | null; country_code: string | null } | null;
type ProfileJoin = { username: string | null } | null;

interface ReviewRow {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  rating: number | null;
  comment: string | null;
  photos: Array<{ url: string; thumbnailUrl?: string }> | null;
  created_at: string;
  restaurants: RestaurantJoin;
  profiles: ProfileJoin;
}

interface MenuPhotoRow {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  image_url: string;
  thumbnail_url: string | null;
  created_at: string;
  restaurants: RestaurantJoin;
  profiles: ProfileJoin;
}

interface CountryJoinRow {
  restaurants: { country_code: string | null } | null;
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
  return item.kind === 'review' ? `rv_${item.reviewId}_${item.photoIndex}` : item.photoId;
}

export default function MediaPage() {
  const [tipo, setTipo] = useState<Tipo>('tutti');
  const [periodo, setPeriodo] = useState<Periodo>('7gg');
  const [paese, setPaese] = useState<string>('all'); // country_code ISO o 'all'
  const [countries, setCountries] = useState<{ code: string; name: string; count: number }[]>([]);

  const [items, setItems] = useState<MediaItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<MediaItem | null>(null);
  const { isBusy, withBusy } = useBusyIds();

  // Popola lista Paesi con conteggio — solo paesi con media effettivamente presenti.
  // photos->0 IS NOT NULL esclude le review con array vuoto (jsonb default '[]').
  useEffect(() => {
    Promise.all([
      supabase.from('menu_photos').select('restaurants!inner(country_code)').not('restaurants.country_code', 'is', null),
      supabase.from('reviews').select('restaurants!inner(country_code)').not('photos->0', 'is', null).not('restaurants.country_code', 'is', null),
    ]).then(([menuRes, reviewRes]) => {
      if (menuRes.error) console.error('[media] countries menu query failed:', menuRes.error);
      if (reviewRes.error) console.error('[media] countries reviews query failed:', reviewRes.error);
      const rows = [
        ...((menuRes.data ?? []) as unknown as CountryJoinRow[]),
        ...((reviewRes.data ?? []) as unknown as CountryJoinRow[]),
      ];
      const counts = new Map<string, number>();
      for (const row of rows) {
        const c = row.restaurants?.country_code;
        if (!c) continue;
        counts.set(c, (counts.get(c) ?? 0) + 1);
      }
      const sorted = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([code, count]) => ({ code, name: getCountryName(code) || code, count }));
      setCountries(sorted);
    });
  }, []);

  const fetchPage = useCallback(async (beforeCursor: string | null): Promise<MediaItem[]> => {
    const periodoIso = periodoToISO(periodo);
    const queries: Promise<MediaItem[]>[] = [];

    if (tipo === 'tutti' || tipo === 'recensioni') {
      queries.push((async () => {
        // photos->0 IS NOT NULL filtra review con array vuoto (jsonb default '[]').
        // profiles!user_id disambigua: ci sono più FK reviews→profiles.
        let q = supabase
          .from('reviews')
          .select('id, restaurant_id, user_id, rating, comment, photos, created_at, restaurants!inner(name, city, country, country_code), profiles!user_id(username)')
          .not('photos->0', 'is', null)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE + 1);
        if (beforeCursor) q = q.lt('created_at', beforeCursor);
        if (periodoIso) q = q.gte('created_at', periodoIso);
        if (paese !== 'all') q = q.eq('restaurants.country_code', paese);
        const { data, error } = await q;
        if (error) console.error('[media] reviews query failed:', error);
        const out: MediaItem[] = [];
        for (const row of (data ?? []) as unknown as ReviewRow[]) {
          const photos = row.photos ?? [];
          photos.forEach((p, i) => {
            if (!p?.url) return;
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
              country: getCountryName(row.restaurants?.country_code, row.restaurants?.country) || null,
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
          .select('id, restaurant_id, user_id, image_url, thumbnail_url, created_at, restaurants!inner(name, city, country, country_code), profiles(username)')
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE + 1);
        if (beforeCursor) q = q.lt('created_at', beforeCursor);
        if (periodoIso) q = q.gte('created_at', periodoIso);
        if (paese !== 'all') q = q.eq('restaurants.country_code', paese);
        const { data, error } = await q;
        if (error) console.error('[media] menu_photos query failed:', error);
        return ((data ?? []) as unknown as MenuPhotoRow[]).map((row): MediaItem => ({
          kind: 'menu',
          id: `m_${row.id}`,
          photoId: row.id,
          url: row.image_url,
          thumb: row.thumbnail_url ?? row.image_url,
          restaurantId: row.restaurant_id,
          restaurantName: row.restaurants?.name ?? '—',
          city: row.restaurants?.city ?? null,
          country: getCountryName(row.restaurants?.country_code, row.restaurants?.country) || null,
          userId: row.user_id,
          username: row.profiles?.username ?? null,
          createdAt: row.created_at,
        }));
      })());
    }

    const results = await Promise.all(queries);
    const merged = results.flat();
    merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
        ? await deleteReviewPhotoWithCleanup(supabase, item.reviewId, item.photoIndex)
        : await deleteMenuPhotoWithCleanup(supabase, item.photoId);
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
              tipo === t ? 'bg-selected text-selected-foreground' : 'bg-card border text-foreground-secondary hover:bg-muted'
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
              periodo === p ? 'bg-selected text-selected-foreground' : 'bg-card border text-foreground-secondary hover:bg-muted'
            }`}
          >
            {p === 'oggi' ? 'Oggi' : p === '7gg' ? 'Ultimi 7 giorni' : p === '30gg' ? 'Ultimi 30 giorni' : 'Tutto'}
          </button>
        ))}
      </div>

      {/* Filtro paese */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setPaese('all')}
          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
            paese === 'all' ? 'bg-selected text-selected-foreground' : 'bg-card border text-foreground-secondary hover:bg-muted'
          }`}
        >
          Tutti i paesi
        </button>
        {countries.map((c) => (
          <button
            key={c.code}
            onClick={() => setPaese(c.code)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              paese === c.code ? 'bg-selected text-selected-foreground' : 'bg-card border text-foreground-secondary hover:bg-muted'
            }`}
          >
            {c.name} <span className="text-xs opacity-60">{c.count}</span>
          </button>
        ))}
      </div>

      {items.length === 0 && !loading ? (
        <p className="text-faint text-sm">Nessun media corrisponde ai filtri.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className="text-left bg-card rounded shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="relative">
                <img src={item.thumb} alt="" loading="lazy" className="w-full aspect-square object-cover" />
                <span className={`absolute top-1 right-1 text-[10px] font-bold rounded px-1.5 py-0.5 text-white ${item.kind === 'review' ? 'bg-primary/80' : 'bg-success/80'}`}>
                  {item.kind === 'review' ? 'R' : 'M'}
                </span>
              </div>
              <div className="p-2">
                <div className="text-xs font-medium text-foreground truncate">{item.restaurantName}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {[item.city, item.country].filter(Boolean).join(', ') || '—'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {loading && <p className="text-muted-foreground mt-4">Caricamento...</p>}

      {hasMore && !loading && (
        <button
          onClick={() => load(cursor, true)}
          className="mt-4 px-4 py-2 bg-card border rounded text-sm hover:bg-background"
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
            className="bg-card rounded-lg max-w-4xl w-full max-h-full overflow-auto flex flex-col md:flex-row"
            onClick={e => e.stopPropagation()}
          >
            <div className="md:w-2/3 bg-muted flex items-center justify-center">
              <img src={selected.url} alt="" className="object-contain max-h-[80vh] w-full" />
            </div>
            <div className="md:w-1/3 p-5 flex flex-col gap-3">
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Tipo</div>
                <span className={`inline-block text-xs font-medium rounded px-2 py-0.5 text-white ${selected.kind === 'review' ? 'bg-primary' : 'bg-success'}`}>
                  {selected.kind === 'review' ? 'Recensione' : 'Menu'}
                </span>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Ristorante</div>
                <Link href={`/restaurants/${selected.restaurantId}`} className="text-primary hover:underline font-medium">
                  {selected.restaurantName}
                </Link>
                <div className="text-sm text-muted-foreground">
                  {[selected.city, selected.country].filter(Boolean).join(', ') || '—'}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Autore</div>
                {selected.userId ? (
                  <Link href={`/users/${selected.userId}`} className="text-primary hover:underline">
                    {selected.username || 'Anonimo'}
                  </Link>
                ) : (
                  <span className="italic text-faint">Utente inattivo</span>
                )}
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Data</div>
                <div className="text-sm">{new Date(selected.createdAt).toLocaleString('it-IT')}</div>
              </div>
              {selected.kind === 'review' && selected.rating != null && selected.rating > 0 && (
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Rating</div>
                  <div className="text-star">{'★'.repeat(selected.rating)}</div>
                </div>
              )}
              {selected.kind === 'review' && selected.comment && (
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Commento</div>
                  <div className="text-sm text-foreground-secondary whitespace-pre-wrap">{selected.comment}</div>
                </div>
              )}
              <div className="mt-auto pt-4 border-t flex gap-2">
                <button
                  onClick={() => setSelected(null)}
                  className="flex-1 px-4 py-2 bg-muted hover:bg-muted-hover rounded text-sm"
                >
                  Chiudi
                </button>
                <button
                  onClick={() => handleDelete(selected)}
                  disabled={isBusy(busyKey(selected))}
                  className="flex-1 px-4 py-2 bg-danger hover:bg-danger-strong disabled:opacity-50 text-white rounded text-sm"
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
