'use client';

// IL DISTINTIVO «PRO», nelle sue due facce — che sono due cose opposte e non
// devono somigliarsi:
//
//   needed  «questo lo fa l'abbonamento»: sta SULLA FUNZIONE (l'aspetto del
//           menù, la scheda). VIOLA e non grigio (scelta dell'utente, 16/09):
//           il grigio in questo portale è il colore delle cose spente, e su
//           una funzione che invece si può usare eccome diceva la cosa
//           sbagliata — oltre a non farsi notare, che era tutto il suo
//           mestiere. Non è un lucchetto: la funzione si usa e l'anteprima la
//           mostra; serve a non far scoprire il confine dopo mezz'ora.
//
//   active  «questo locale ce l'ha»: sta ACCANTO AL NOME del locale, una
//           volta sola, ed è ambra. È la convenzione dei prodotti che hanno
//           un piano a pagamento, e l'ambra si legge come "acceso" senza
//           dire "attenzione" (che è il rosso) né "fatto" (che è il verde).
//
// ⚠️ LE DUE FACCE NON SI VEDONO MAI INSIEME: chi è abbonato non ha niente da
// sbloccare, quindi le grigie spariscono e resta l'ambra; chi non lo è vede
// le grigie e nessuna ambra. Senza questa regola lo stesso distintivo direbbe
// «ti manca» e «ce l'hai» nella stessa schermata, e chi guarda dovrebbe
// indovinare ogni volta da che parte sta.
import { useI18n } from '@/lib/i18n';

export default function ProTag({ variant }: { variant: 'needed' | 'active' }) {
  const { d } = useI18n();
  const attivo = variant === 'active';
  return (
    <span
      className={
        attivo
          ? 'shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800'
          : 'shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700'
      }
      // Il colore non basta: chi usa un lettore di schermo sente la parola
      // "Pro" e basta, che da sola non dice quale delle due cose sia.
      title={attivo ? d.pro.activeTitle : d.pro.neededTitle}
    >
      {d.pro.label}
    </span>
  );
}
