'use client';

// Le risposte che questo ristoratore ha scritto alle recensioni (733), coi
// gesti del moderatore: togliere dall'app con un motivo (DSA art. 17, lo
// legge il ristoratore nel portale) e rimettere. Non si cancellano: la riga
// resta come traccia, e ogni gesto finisce nel registro partner.
//
// Sta nella pagina dell'account e non in una voce a sé (scelta dell'utente,
// 25/09): l'admin guarda il ristoratore e vede tutto quello che ha scritto.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useBusyIds } from '@/hooks/useBusyIds';

type ReplyRow = {
  id: string;
  body: string;
  created_at: string;
  updated_at: string;
  removed_at: string | null;
  removed_note: string | null;
  venue_name: string;
  review_rating: number | null;
  review_comment: string | null;
  review_author: string | null;
  restaurant_id: string | null;
  restaurant_name: string | null;
};

export default function PartnerRepliesSection({ userId }: { userId: string }) {
  const [rows, setRows] = useState<ReplyRow[] | null>(null);
  const { isBusy, withBusy } = useBusyIds();

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data, error } = await supabase
        .from('partner_review_replies')
        .select(
          'id, body, created_at, updated_at, removed_at, removed_note, ' +
          'partner_venues!inner(name, owner_user_id), ' +
          'reviews(rating, comment, restaurant_id, restaurants(name), profiles!user_id(username, is_anonymous))'
        )
        .eq('partner_venues.owner_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!vivo) return;
      if (error) {
        console.warn('[PartnerRepliesSection]', error.message);
        setRows([]);
        return;
      }
      setRows((data ?? []).map((r: any) => ({
        id: r.id,
        body: r.body,
        created_at: r.created_at,
        updated_at: r.updated_at,
        removed_at: r.removed_at,
        removed_note: r.removed_note,
        venue_name: r.partner_venues?.name ?? '—',
        review_rating: r.reviews?.rating ?? null,
        review_comment: r.reviews?.comment ?? null,
        review_author: r.reviews?.profiles?.is_anonymous ? 'anonimo' : r.reviews?.profiles?.username ?? null,
        restaurant_id: r.reviews?.restaurant_id ?? null,
        restaurant_name: r.reviews?.restaurants?.name ?? null,
      })));
    })();
    return () => { vivo = false; };
  }, [userId]);

  const setRemoved = async (row: ReplyRow, removed: boolean) => {
    let note: string | null = null;
    if (removed) {
      note = prompt('Motivo della rimozione (lo legge il ristoratore nel portale):');
      if (note === null) return;
      if (!note.trim()) { alert('Il motivo è obbligatorio.'); return; }
    } else if (!confirm('Rimettere la risposta nell\'app?')) {
      return;
    }
    await withBusy(row.id, async () => {
      const { error } = await supabase.rpc('admin_set_review_reply_removed', {
        p_reply_id: row.id, p_removed: removed, p_note: note?.trim() ?? null,
      });
      if (error) { alert(`Errore: ${error.message}`); return; }
      setRows((prev) => (prev ?? []).map((r) => r.id === row.id
        ? {
            ...r,
            removed_at: removed ? new Date().toISOString() : null,
            removed_note: removed ? note!.trim() : null,
          }
        : r));
    });
  };

  if (rows === null) return null;

  return (
    <div className="bg-card rounded-lg shadow p-4 mb-6">
      <h2 className="font-semibold mb-3">Risposte del ristorante ({rows.length})</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-faint">Nessuna risposta alle recensioni</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="border rounded-lg p-3 text-sm">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                {r.restaurant_id ? (
                  <Link href={`/restaurants/${r.restaurant_id}`} className="text-primary hover:underline font-medium">
                    {r.restaurant_name ?? '—'}
                  </Link>
                ) : <span>—</span>}
                <span>· {r.venue_name}</span>
                <span>· {new Date(r.created_at).toLocaleDateString('it-IT')}</span>
                {r.removed_at && (
                  <span className="px-1.5 py-0.5 rounded bg-muted text-foreground-secondary font-medium">rimossa</span>
                )}
              </div>

              {/* La recensione a cui risponde, per contesto */}
              <div className="mt-2 text-foreground-secondary">
                <span className="text-muted-foreground">{r.review_author ?? 'Utente inattivo'}</span>
                {r.review_rating != null && r.review_rating > 0 && (
                  <span className="ml-1 text-star">{'★'.repeat(r.review_rating)}</span>
                )}
                {r.review_comment && <p className="mt-0.5 line-clamp-2">{r.review_comment}</p>}
              </div>

              <div className="mt-2 pl-3 border-l-2 border-border">
                <p className="text-xs font-medium text-muted-foreground">Risposta</p>
                <p className={`mt-0.5 whitespace-pre-wrap ${r.removed_at ? 'text-faint line-through' : 'text-foreground'}`}>
                  {r.body}
                </p>
              </div>
              {r.removed_at && r.removed_note && (
                <p className="mt-1 text-xs text-muted-foreground">Motivo: {r.removed_note}</p>
              )}

              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => setRemoved(r, !r.removed_at)}
                  disabled={isBusy(r.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium disabled:opacity-50 transition-colors ${
                    r.removed_at
                      ? 'bg-muted text-foreground-secondary hover:bg-muted-hover'
                      : 'bg-danger-soft text-danger-strong hover:bg-danger-soft-hover'
                  }`}
                >
                  {isBusy(r.id) ? '...' : r.removed_at ? 'Rimetti' : 'Rimuovi'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
