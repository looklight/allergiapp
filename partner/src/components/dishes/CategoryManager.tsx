'use client';

// IL PANNELLO "GESTISCI…" DELLE CATEGORIE: quali delle diciotto il ristoratore
// usa davvero. Una categoria tolta sparisce dalle file di pill in cui si
// sceglie (la maschera del piatto, lo "Sposta in" del catalogo) ma resta
// disponibile: nessun piatto cambia.
//
// UN COMPONENTE SOLO, usato dalla maschera del piatto e dal catalogo
// (richiesta dell'utente, 15/09): è la stessa preferenza — sta sull'account,
// `hiddenCategories` — e due copie del pannello prima o poi si sarebbero
// dette cose diverse. Si modifica qui.
//
// Chi lo ospita lo mette AL POSTO della sua fila di pill, non sotto: con
// tutt'e due aperte erano trentasei pastiglie quasi identiche, e non si capiva
// quale riga scegliesse e quale togliesse.
import { useI18n } from '@/lib/i18n';
import { DISH_CATEGORIES, categoryName } from '@/lib/categories';
import { usePartnerProfile, useUpdatePartnerProfile, setHiddenCategories } from '@/lib/partnerProfile';
import { currentUserId } from '@/lib/storage';

// Le categorie nascoste dall'account: il pannello e chi sceglie le categorie
// devono leggerle dallo stesso posto
export function useHiddenCategories(): string[] {
  return usePartnerProfile()?.hiddenCategories ?? [];
}

export default function CategoryManager({ onDone }: { onDone: () => void }) {
  const { d, locale } = useI18n();
  const profile = usePartnerProfile();
  const aggiornaProfilo = useUpdatePartnerProfile();
  const nascoste = profile?.hiddenCategories ?? [];

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="mb-2 text-xs text-gray-500">{d.editor.manageCategoriesHint}</p>
      <div className="flex flex-wrap gap-1.5">
        {DISH_CATEGORIES.map((cat) => {
          const visibile = !nascoste.includes(cat.code);
          return (
            <button
              key={cat.code}
              type="button"
              aria-pressed={visibile}
              onClick={async () => {
                const dopo = visibile
                  ? [...nascoste, cat.code]
                  : nascoste.filter((c) => c !== cat.code);
                // ottimista come tutto il resto del portale: la riga si
                // scrive dietro, le pill cambiano subito
                if (profile) aggiornaProfilo({ ...profile, hiddenCategories: dopo });
                const userId = await currentUserId();
                if (userId) await setHiddenCategories(userId, dopo);
              }}
              // Disattivata: grigia chiara e spenta, senza barrato — il segno di
              // "cancellato" diceva più di quanto succede, perché la
              // categoria resta disponibile (richiesta dell'utente, 15/09)
              className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                visibile
                  ? 'border-gray-400 bg-white text-gray-700'
                  : 'border-gray-200/70 bg-gray-50 text-gray-300 hover:text-gray-500'
              }`}
            >
              {categoryName(cat.code, locale)}
            </button>
          );
        })}
      </div>
      {/* In fondo, staccato dalle pill: a sinistra la categoria che manca, a
          destra "Fatto". Prima "Fatto" era una pill nera in coda alle altre,
          e in mezzo a diciotto pastiglie non si distingueva da una categoria
          accesa (richiesta dell'utente, 15/09): ora ha un'altra forma — un
          bottone, angoli e non capsula — e un altro posto. */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-gray-200 pt-2.5">
        {/* Quella che manca si chiede a noi: la traduciamo in quindici lingue
            e ce l'hanno tutti. Un campo di testo libero qui avrebbe dato al
            ristoratore una parola che al tavolo resta in italiano. */}
        <p className="text-xs text-gray-500">
          {d.editor.missingCategory}{' '}
          <a
            href={`mailto:info@allergiapp.com?subject=${encodeURIComponent(d.editor.missingCategorySubject)}`}
            className="underline underline-offset-2 hover:text-gray-900"
          >
            info@allergiapp.com
          </a>
        </p>
        <button
          type="button"
          onClick={onDone}
          className="ml-auto shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700"
        >
          {d.editor.manageCategoriesDone}
        </button>
      </div>
    </div>
  );
}

// Il bottone che apre il pannello, tratteggiato in coda alla fila di pill:
// anche lui uno solo, perché deve sembrare lo stesso gesto ovunque compaia
export function ManageCategoriesButton({ onClick }: { onClick: () => void }) {
  const { d } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700"
    >
      {d.editor.manageCategories}
    </button>
  );
}
