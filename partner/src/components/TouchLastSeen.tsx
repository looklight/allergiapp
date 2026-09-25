'use client';

// «Ultimo accesso» del ristoratore (migration 735), come useLastSeen
// nell'app: all'apertura del portale e quando si torna sulla pagina, al
// massimo una volta all'ora. La data la mette il database (now() lato
// server); qui si decide solo QUANDO chiamarlo. Senza questo l'admin vedeva
// solo l'ultimo login, che con la sessione aperta non cambia per settimane.
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

const OGNI_MS = 60 * 60 * 1000;
const CHIAVE = 'partner-last-seen';

export default function TouchLastSeen() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) return;

    async function tocca() {
      if (document.visibilityState !== 'visible') return;
      const chiave = `${CHIAVE}:${userId}`;
      try {
        const ultimo = Number(localStorage.getItem(chiave) ?? 0);
        if (Date.now() - ultimo < OGNI_MS) return;
      } catch {
        // Senza localStorage (navigazione privata) si tocca a ogni apertura:
        // costa una scrittura, non rompe niente
      }
      const { error } = await supabase.rpc('touch_partner_last_seen');
      // L'ora si segna solo se la scrittura è riuscita: una chiamata fallita
      // non deve far aspettare un'ora prima di riprovare
      if (error) return;
      try {
        localStorage.setItem(chiave, String(Date.now()));
      } catch {
        // come sopra
      }
    }

    const alRitorno = () => void tocca();
    void tocca();
    document.addEventListener('visibilitychange', alRitorno);
    return () => document.removeEventListener('visibilitychange', alRitorno);
  }, [userId]);

  return null;
}
