// L'INTESTAZIONE DI UN PASSO: numero, titolo e una riga che dice cosa si fa.
// Stessa forma dei passi della finestra «Nuovo locale», perché è lo stesso
// modo di raccontare: si fa questo, poi quello. La usano l'editor del menù e
// la scheda AllergiApp (21/09), così le due pagine si leggono allo stesso modo.
export default function Passo({ n, titolo, primo = false }: { n: number; titolo: string; primo?: boolean }) {
  return (
    // Il primo non ha la riga sopra né lo stacco grande: sopra c'è già la
    // riga fissa della pubblicazione, e i due spazi si sommavano in un vuoto
    // che non c'entrava con le altre pagine (20/09).
    <div className={primo ? 'mb-4 mt-5' : 'mt-10 mb-4 border-t border-gray-200 pt-4'}>
      {/* Stessa riga in maiuscoletto grigio delle altre sezioni del portale
          («Aspetto del menù», «Online»), col numero davanti: si legge come
          una sezione, e il numero dice in che ordine si fanno. */}
      <h2 className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {n} · {titolo}
      </h2>
    </div>
  );
}
