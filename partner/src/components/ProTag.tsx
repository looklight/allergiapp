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
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import PaywallDialog from '@/components/PaywallDialog';

export default function ProTag({
  variant,
  // Il distintivo VIOLA è un bottone: premendolo si apre il paywall, dove si
  // legge cosa c'è nel piano (19/09, richiesta dell'utente). È il gesto che
  // chiunque prova su un'etichetta «Pro» — prima non faceva niente.
  //
  // `statico` serve dove il distintivo sta DENTRO un altro bottone (il
  // «Salva Pro» dell'editor): un bottone dentro un bottone non si può, e lì
  // il paywall lo apre già quello che lo contiene.
  statico = false,
  // Cosa si stava guardando: il paywall apre con quel beneficio
  contesto = 'look',
  // Il locale di cui si parla: con questo il paywall porta dritto al
  // pagamento di quel locale invece che alla pagina degli abbonamenti
  venueId,
}: {
  variant: 'needed' | 'active';
  statico?: boolean;
  contesto?: 'look' | 'card';
  venueId?: string;
}) {
  const { d } = useI18n();
  const [paywall, setPaywall] = useState(false);
  const attivo = variant === 'active';
  const classe = attivo
    ? 'shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800'
    // Il filo viola attorno: dentro la scatola dell'aspetto, che ha il fondo
    // del colore del menù, il lilla da solo si confondeva (20/09)
    : 'shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 ring-1 ring-inset ring-violet-300';
  // Il colore non basta: chi usa un lettore di schermo sente la parola "Pro"
  // e basta, che da sola non dice quale delle due cose sia.
  const titolo = attivo ? d.pro.activeTitle : d.pro.neededTitle;

  if (attivo || statico) {
    return (
      <span className={classe} title={titolo}>
        {d.pro.label}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          // Sta dentro righe e titoli che a volte sono già cliccabili
          e.stopPropagation();
          e.preventDefault();
          setPaywall(true);
        }}
        title={titolo}
        className={`${classe} cursor-pointer transition-colors hover:bg-violet-200`}
      >
        {d.pro.upgrade}
      </button>
      {paywall && (
        <PaywallDialog onClose={() => setPaywall(false)} contesto={contesto} venueId={venueId} />
      )}
    </>
  );
}
