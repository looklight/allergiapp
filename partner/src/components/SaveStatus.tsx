'use client';

// L'unico posto in cui il portale dice se quello che si vede è davvero
// arrivato al server.
//
// Sta nella Shell e non accanto al titolo dell'editor come si era pensato
// all'inizio: le scritture partono da tre schermate diverse — l'editor del
// locale, il gestionale dei piatti, la lista dei locali — e un
// salvataggio può fallire mentre si sta già guardando un'altra pagina.
//
// Due registri diversi, perché sono due notizie diverse:
//  * "Salvataggio…" e "Salvato" sono cronaca. Stanno in un angolo, non
//    chiedono niente e se ne vanno da soli.
//  * "non è stato salvato" è un guasto. Prende la fascia in cima, resta lì
//    finché non si risolve, e porta con sé il modo di risolverlo.
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { retryFailed, useSaveState } from '@/lib/saveState';

// Quanto resta scritto "Salvato" prima di sparire. Abbastanza da vederlo se si
// stava guardando, poco perché non diventi arredamento: una scritta ferma lì
// per sempre non la legge più nessuno, e quando conterà davvero non si
// distinguerà da quella di prima.
const DURATA_SALVATO_MS = 2500;

// Quanto si aspetta, a richieste ferme, prima di dire "Salvato". Un
// salvataggio non è UNA richiesta: salvare il locale ne fa tre in fila (il
// nome, i link cancellati, i link riscritti) e fra l'una e l'altra non c'è
// niente in volo. Annunciando la fine a ogni buco, la scritta lampeggerebbe
// tre volte per ogni pausa di battitura.
const ATTESA_PRIMA_DI_SALVATO_MS = 400;

export default function SaveStatus() {
  const { d } = useI18n();
  const { saving, savedAt, failed } = useSaveState();
  const [mostra, setMostra] = useState<'niente' | 'salvando' | 'salvato'>('niente');
  const [riprovando, setRiprovando] = useState(false);

  useEffect(() => {
    if (saving) {
      setMostra('salvando');
      return;
    }
    if (savedAt === null) return;
    const conferma = setTimeout(() => setMostra('salvato'), ATTESA_PRIMA_DI_SALVATO_MS);
    return () => clearTimeout(conferma);
  }, [saving, savedAt]);

  useEffect(() => {
    if (mostra !== 'salvato') return;
    const via = setTimeout(() => setMostra('niente'), DURATA_SALVATO_MS);
    return () => clearTimeout(via);
  }, [mostra]);

  // Chiudere la scheda con qualcosa di non salvato è il modo in cui il lavoro
  // si perde per davvero: il messaggio lo scrive il browser, a noi tocca solo
  // dire che c'è motivo di chiederlo.
  useEffect(() => {
    if (failed === 0) return;
    const chiedi = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', chiedi);
    return () => window.removeEventListener('beforeunload', chiedi);
  }, [failed]);

  async function riprova() {
    setRiprovando(true);
    await retryFailed();
    setRiprovando(false);
  }

  // Il guasto sta SOPRA le finestre (che sono a z-50): nascosto dietro un
  // pannello aperto sarebbe esattamente il caso che questo avviso esiste per
  // evitare. La pill tranquilla invece resta sotto, perché è solo cronaca.
  if (failed > 0) {
    return (
      <div
        role="alert"
        className="fixed inset-x-0 top-0 z-[60] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-red-600 px-4 py-2 text-sm text-white shadow-md"
        style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}
      >
        <span>{d.saving.failed}</span>
        <button
          onClick={riprova}
          disabled={riprovando}
          className="rounded-lg bg-white/15 px-3 py-1 font-medium underline underline-offset-2 transition-colors hover:bg-white/25 disabled:opacity-60"
        >
          {riprovando ? d.saving.inProgress : d.saving.retry}
        </button>
      </div>
    );
  }

  if (mostra === 'niente') return null;

  return (
    // aria-live e non role=status: è cronaca, e chi usa un lettore di schermo
    // non dev'essere interrotto a metà di quello che sta scrivendo
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-3 top-3 z-40 rounded-full border border-gray-200 bg-white/90 px-3 py-1 text-xs text-gray-500 shadow-sm backdrop-blur"
      style={{ top: 'calc(0.75rem + env(safe-area-inset-top))' }}
    >
      {mostra === 'salvando' ? d.saving.inProgress : d.saving.done}
    </div>
  );
}
