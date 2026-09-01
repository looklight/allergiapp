'use client';

// Il dettaglio di un piatto, aperto toccando la riga nell'anteprima: foto
// grande, descrizione intera, e — quello che la riga compatta non mostra
// mai per intero — TUTTI gli allergeni dichiarati e TUTTE le esigenze che
// soddisfa. Nella lista si vede solo quello che riguarda il filtro acceso;
// chi ha un'allergia vuole poter controllare l'elenco completo prima di
// ordinare, non solo il pezzo che il filtro ha scelto di mostrargli.
//
// Un foglio che sale dal basso e non una pagina vera: qui dentro c'è solo
// l'anteprima (la pagina pubblica non esiste ancora, DIGITAL_MENU.md Tema
// 11), quindi niente URL da gestire — chiuderlo torna esattamente al menù.
// Niente useModal: quello blocca lo scroll della PAGINA DEL PORTALE, e qui
// dentro c'è solo lo schermo simulato del cliente.
import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { ALLERGENS } from '@/lib/allergens';
import { dietNeedName } from '@/lib/diets';
import { displayPrice, type MenuItem } from '@/lib/menus';
import type { Dish } from '@/lib/dishes';
import type { ViewerNeeds } from './MenuPreview';

export default function DishDetailSheet({
  item,
  dish,
  currency,
  needs,
  onClose,
}: {
  item: MenuItem;
  dish: Dish;
  currency: string;
  needs: ViewerNeeds;
  onClose: () => void;
}) {
  const { d, locale } = useI18n();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const prezzo = displayPrice(item.priceCents, currency, locale);
  // Gli allergeni dichiarati nell'ordine fisso di ALLERGENS (non in quello di
  // inserimento del ristoratore): stessa lista che vede ovunque, stesso ordine.
  const dichiarati = ALLERGENS.filter((a) => dish.allergens.includes(a.code));
  const contengono = new Set(needs.allergens.filter((code) => dish.allergens.includes(code)));

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col justify-end bg-black/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={dish.name}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88%] overflow-y-auto rounded-t-2xl bg-white pb-6"
      >
        <div className="sticky top-0 z-10 flex justify-center bg-white pb-1 pt-2">
          <span className="h-1 w-10 rounded-full bg-gray-200" />
        </div>

        {/* Quadrata perché il piatto ARRIVA quadrato: photos.ts ritaglia un
            canvas square al caricamento. Un riquadro largo e basso con
            object-cover ne avrebbe tagliato sopra e sotto — qui invece
            l'aspect ratio del box è la stessa della foto, quindi si vede
            intera. */}
        {dish.photoUrl !== '' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dish.photoUrl} alt="" className="aspect-square w-full object-cover" />
        ) : (
          <div className="aspect-square w-full bg-gray-100" />
        )}

        <div className="px-4 pt-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-base font-semibold leading-snug text-gray-900">{dish.name}</h3>
            {prezzo !== '' && (
              <p className="shrink-0 text-base font-semibold tabular-nums text-gray-900">{prezzo}</p>
            )}
          </div>

          {dish.description.trim() !== '' && (
            <p className="mt-1.5 text-sm leading-snug text-gray-600">{dish.description}</p>
          )}

          <div className="mt-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
              {d.menuPublic.dishDetailAllergensTitle}
            </p>
            {dichiarati.length === 0 ? (
              <p className="mt-1 text-sm text-gray-500">{d.menuPublic.dishDetailNoAllergens}</p>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {dichiarati.map((a) => {
                  // In rosso solo quelli che il cliente ha scelto di evitare:
                  // gli altri restano neutri, non è colpa loro se il filtro è
                  // acceso su qualcos'altro.
                  const evitato = contengono.has(a.code);
                  return (
                    <span
                      key={a.code}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                        evitato
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-gray-200 bg-gray-50 text-gray-600'
                      }`}
                    >
                      {a[locale]}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {dish.dietTags.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                {d.menuPublic.dishDetailDietsTitle}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {dish.dietTags.map((code) => (
                  <span
                    key={code}
                    className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"
                  >
                    {dietNeedName(code, locale)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
