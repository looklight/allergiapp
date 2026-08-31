'use client';

// L'editor di un menù: sezioni, piatti dentro le sezioni, prezzi, ordine.
// Tutta la logica di struttura sta in menus.ts come funzioni pure: qui si
// compone la modifica e si passa il risultato a save(), così non c'è uno
// stato locale che possa divergere da quello mostrato.
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fill, useI18n } from '@/lib/i18n';
import { useModal } from '@/lib/useModal';
import { useDishes } from '@/lib/dishes';
import { DEFAULT_ACCENT, type MenuBrand } from '@/lib/menuBrand';
import { useShowcases } from '@/lib/showcases';
import {
  CURRENCIES,
  addDishes,
  addSection,
  menuItems,
  moveItem,
  moveItemBefore,
  moveItemToSection,
  moveSection,
  moveSectionBefore,
  removeItem,
  removeSection,
  renameSection,
  setItemPrice,
  setMenuCurrency,
  setMenuName,
  useMenu,
  useMenus,
  type MenuItem as Riga,
} from '@/lib/menus';
import MenuItemRow from '@/components/menus/MenuItemRow';
import DishPicker from '@/components/menus/DishPicker';
import ConfirmDialog from '@/components/menus/ConfirmDialog';
import BrandBar from '@/components/menus/BrandBar';
import MenuPreview, { NO_NEEDS, type ViewerNeeds } from '@/components/menus/MenuPreview';
import PhoneFrame from '@/components/preview/PhoneFrame';

export default function MenuEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { d } = useI18n();
  const { dishes } = useDishes();
  const { menu, loading, save } = useMenu(id);
  const { menus } = useMenus();
  const { showcases, update: updateVenue, setIdentity } = useShowcases();
  // La sezione a cui il pannello dei piatti sta aggiungendo: un id, oppure
  // null per le righe fuori sezione. 'chiuso' perché null è già un valore.
  const [adding, setAdding] = useState<{ sectionId: string | null } | null>(null);
  const [deletingSection, setDeletingSection] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  // Le esigenze di chi guarda il menù. Stanno QUI e non dentro l'anteprima
  // perché le anteprime sono due — quella a lato e quella a tutto schermo da
  // telefono — e sono la stessa prova: aprendo la seconda, il ristoratore
  // deve ritrovare le pastiglie che aveva appena toccato nella prima.
  const [needs, setNeeds] = useState<ViewerNeeds>(NO_NEEDS);
  // Il trascinamento. Cosa si sta muovendo (una riga o una sezione) e dove
  // andrebbe a finire: sono due cose separate perché il bersaglio cambia a
  // ogni pixel mentre l'oggetto trascinato resta lo stesso.
  const [drag, setDrag] = useState<{ kind: 'item' | 'section'; id: string } | null>(null);
  const [dropItem, setDropItem] = useState<{ sectionId: string | null; beforeId: string | null } | null>(null);
  const [dropSection, setDropSection] = useState<{ beforeId: string | null } | null>(null);

  function endDrag() {
    setDrag(null);
    setDropItem(null);
    setDropSection(null);
  }

  function toggleNeed(kind: 'allergens' | 'diets', code: string) {
    setNeeds((prev) => ({
      ...prev,
      [kind]: prev[kind].includes(code)
        ? prev[kind].filter((c) => c !== code)
        : [...prev[kind], code],
    }));
  }

  if (loading) return <p className="text-sm text-gray-500">{d.common.loading}</p>;
  if (!menu) {
    return (
      <div>
        <BackLink />
        <p className="mt-4 text-sm text-gray-500">{d.menuEditor.notFound}</p>
      </div>
    );
  }

  // L'aspetto pende dal LOCALE e non dal menù: si cambia da qui perché è qui
  // che se ne vede l'effetto, ma vale per tutti i menù di quel locale.
  const vetrina = (showcases ?? []).find((s) => s.id === menu.showcaseId) ?? null;
  const brand: MenuBrand = {
    name: vetrina?.venueName ?? '',
    logoUrl: vetrina?.logoUrl ?? '',
    accent: vetrina?.accent ?? DEFAULT_ACCENT,
  };

  // Il NOME passa da update(), che aspetta la fine della battitura e non
  // riscrive i link se non sono cambiati. Logo e colore sono gesti singoli e
  // si scrivono subito.
  function setBrand(next: Partial<MenuBrand>) {
    if (!vetrina) return;
    if (next.name !== undefined) {
      updateVenue(vetrina.id, {
        venueName: next.name,
        dishIds: vetrina.dishIds,
        links: vetrina.links,
      });
    }
    if (next.logoUrl !== undefined || next.accent !== undefined) {
      setIdentity(vetrina.id, { logoUrl: next.logoUrl, accent: next.accent });
    }
  }

  const catalogo = dishes ?? [];
  const dishById = (dishId: string) => catalogo.find((dish) => dish.id === dishId);
  const dentro = menuItems(menu).map((item) => item.dishId);
  // Le destinazioni della tendina "Sposta in": fuori sezione c'è sempre,
  // perché è dove le righe risalgono quando una sezione viene eliminata.
  const destinazioni = [
    { id: null as string | null, name: d.menuEditor.loose },
    ...menu.sections.map((s) => ({
      id: s.id as string | null,
      name: s.name.trim() || d.menuEditor.newSectionName,
    })),
  ];
  const sezioneInEliminazione = menu.sections.find((s) => s.id === deletingSection);
  const vuoto = menu.sections.length === 0 && menu.loose.length === 0;
  // Gli altri menù dello stesso locale: nell'anteprima sono le linguette in
  // alto, che è il modo in cui il cliente al tavolo passa dalla carta alle
  // bevande senza cambiare QR.
  const fratelli = (menus ?? []).filter((m) => m.showcaseId === menu.showcaseId);
  const anteprima = (
    <MenuPreview
      menu={menu}
      siblings={fratelli}
      dishes={catalogo}
      brand={brand}
      venueName={brand.name.trim() || d.preview.venueName}
      needs={needs}
      onToggleNeed={toggleNeed}
    />
  );

  // Le righe di una sezione (o quelle fuori sezione): stesso pezzo di
  // interfaccia in due punti, e le differenze sono tutte nel contenitore.
  function righe(items: Riga[], sectionId: string | null) {
    return (
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <MenuItemRow
            key={item.id}
            item={item}
            dish={dishById(item.dishId)}
            currency={menu!.currency}
            sections={destinazioni}
            sectionId={sectionId}
            isFirst={i === 0}
            isLast={i === items.length - 1}
            onPrice={(cents) => save(setItemPrice(menu!, item.id, cents))}
            onMove={(verso) => save(moveItem(menu!, sectionId, item.id, verso))}
            onMoveToSection={(dove) => save(moveItemToSection(menu!, item.id, dove))}
            onRemove={() => save(removeItem(menu!, item.id))}
            dragging={drag?.kind === 'item' && drag.id === item.id}
            dropLine={dropItem?.sectionId === sectionId && dropItem?.beforeId === item.id}
            onDragStart={() => setDrag({ kind: 'item', id: item.id })}
            onDragOverRow={(posizione) => {
              // Una sezione trascinata non si infila fra due piatti
              if (drag?.kind !== 'item') return;
              // Sorvolando la metà bassa si punta alla riga DOPO: così l'ultima
              // riga di una sezione si può ancora scavalcare, che altrimenti
              // sarebbe l'unica posizione irraggiungibile
              const beforeId = posizione === 'sopra' ? item.id : (items[i + 1]?.id ?? null);
              setDropItem({ sectionId, beforeId });
            }}
            onDropRow={() => {
              if (drag?.kind === 'item' && dropItem) {
                save(moveItemBefore(menu!, drag.id, dropItem.sectionId, dropItem.beforeId));
              }
              endDrag();
            }}
            onDragEnd={endDrag}
          />
        ))}
      </ul>
    );
  }

  // La zona in fondo a ogni sezione, che compare SOLO mentre si trascina.
  // Serve a due cose che altrimenti non si potrebbero fare: mettere una riga
  // in fondo, e portarla in una sezione vuota — che di righe da sorvolare non
  // ne ha nessuna. Ferma non c'è, perché sarebbe un rettangolo tratteggiato
  // sotto ogni sezione per sempre.
  function zonaFine(sectionId: string | null) {
    if (drag?.kind !== 'item') return null;
    const attiva = dropItem?.sectionId === sectionId && dropItem?.beforeId === null;
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDropItem({ sectionId, beforeId: null });
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (drag?.kind === 'item') save(moveItemBefore(menu!, drag.id, sectionId, null));
          endDrag();
        }}
        className={`mt-1 rounded-xl border border-dashed py-2 text-center text-xs transition-colors ${
          attiva ? 'border-gray-900 bg-gray-50 text-gray-700' : 'border-gray-200 text-gray-300'
        }`}
      >
        {d.menuEditor.dropHere}
      </div>
    );
  }

  return (
    // Editor a sinistra, anteprima a destra che resta in vista mentre si
    // scorre. Sotto lg l'anteprima non ci sta accanto e diventa un bottone
    // flottante: stessa scelta dell'editor della vetrina, stesso gesto.
    <div className="lg:flex lg:items-start lg:gap-8">
      <div className="min-w-0 flex-1 lg:max-w-3xl">
      <BackLink />

      {/* Nome e valuta: il nome è un campo e basta, senza matita da premere
          prima — è la prima cosa che si cambia su un menù appena creato. */}
      <div className="mb-6 mt-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={menu.name}
          onChange={(e) => save(setMenuName(menu, e.target.value))}
          placeholder={d.menuEditor.namePlaceholder}
          aria-label={d.menuEditor.namePlaceholder}
          className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 text-xl font-semibold text-gray-900 hover:border-gray-300 focus:border-gray-900 focus:outline-none md:text-2xl"
        />
        <label className="flex shrink-0 items-center gap-2 text-xs text-gray-500">
          {d.menuEditor.currency}
          <select
            value={menu.currency}
            onChange={(e) => save(setMenuCurrency(menu, e.target.value))}
            className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-gray-900 focus:outline-none"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} {c.symbol}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-4">
        <BrandBar brand={brand} onChange={setBrand} />
      </div>

      {vuoto ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm font-medium text-gray-900">{d.menuEditor.emptyMenu}</p>
          <p className="mt-1 text-sm text-gray-500">{d.menuEditor.emptyMenuHint}</p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={() => setAdding({ sectionId: null })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            >
              {d.menuEditor.addDishes}
            </button>
            <button
              onClick={() => save(addSection(menu, d.menuEditor.newSectionName))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              {d.menuEditor.addSection}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Fuori sezione: compare solo se ci sono righe. Un contenitore
              vuoto e permanente in cima al menù sarebbe un invito a chiedersi
              cos'è, ogni volta, per sempre. */}
          {menu.loose.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-2 px-2">
                <h2 className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {d.menuEditor.loose}
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">{d.menuEditor.looseHint}</p>
              </div>
              {righe(menu.loose, null)}
              {zonaFine(null)}
              <AddDishesButton onClick={() => setAdding({ sectionId: null })} />
            </section>
          )}

          {menu.sections.map((section, i) => (
            <section
              key={section.id}
              onDragOver={(e) => {
                if (drag?.kind !== 'section') return;
                e.preventDefault();
                const box = e.currentTarget.getBoundingClientRect();
                const sopra = e.clientY < box.top + box.height / 2;
                setDropSection({
                  beforeId: sopra ? section.id : (menu.sections[i + 1]?.id ?? null),
                });
              }}
              onDrop={(e) => {
                if (drag?.kind !== 'section' || !dropSection) return;
                e.preventDefault();
                save(moveSectionBefore(menu, drag.id, dropSection.beforeId));
                endDrag();
              }}
              className={`relative rounded-2xl border border-gray-200 bg-white p-4 shadow-sm ${
                drag?.kind === 'section' && drag.id === section.id ? 'opacity-40' : ''
              }`}
            >
              {dropSection?.beforeId === section.id && drag?.kind === 'section' && (
                <span className="pointer-events-none absolute inset-x-4 -top-1 h-0.5 rounded-full bg-gray-900" />
              )}
              <div className="mb-2 flex items-center gap-2">
                {/* Maniglia della sezione: stessa idea di quella delle righe,
                    e le frecce qui accanto restano per il dito e la tastiera */}
                <span
                  draggable
                  aria-hidden="true"
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', section.id);
                    setDrag({ kind: 'section', id: section.id });
                  }}
                  onDragEnd={endDrag}
                  className="shrink-0 cursor-grab text-gray-300 transition-colors hover:text-gray-600 active:cursor-grabbing"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="6" r="1.6" />
                    <circle cx="15" cy="6" r="1.6" />
                    <circle cx="9" cy="12" r="1.6" />
                    <circle cx="15" cy="12" r="1.6" />
                    <circle cx="9" cy="18" r="1.6" />
                    <circle cx="15" cy="18" r="1.6" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={section.name}
                  onChange={(e) => save(renameSection(menu, section.id, e.target.value))}
                  placeholder={d.menuEditor.sectionNamePlaceholder}
                  aria-label={d.menuEditor.sectionNamePlaceholder}
                  className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 text-sm font-semibold text-gray-900 hover:border-gray-300 focus:border-gray-900 focus:outline-none"
                />
                <button
                  onClick={() => save(moveSection(menu, section.id, -1))}
                  disabled={i === 0}
                  aria-label={d.menuEditor.moveUp}
                  className="shrink-0 text-gray-300 transition-colors hover:text-gray-900 disabled:opacity-25 disabled:hover:text-gray-300"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 15l6-6 6 6" />
                  </svg>
                </button>
                <button
                  onClick={() => save(moveSection(menu, section.id, 1))}
                  disabled={i === menu.sections.length - 1}
                  aria-label={d.menuEditor.moveDown}
                  className="shrink-0 text-gray-300 transition-colors hover:text-gray-900 disabled:opacity-25 disabled:hover:text-gray-300"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <button
                  onClick={() => setDeletingSection(section.id)}
                  aria-label={d.common.delete}
                  title={d.common.delete}
                  className="shrink-0 text-gray-300 transition-colors hover:text-red-600"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7h16M9 7V5h6v2M6.5 7l1 12h9l1-12" />
                  </svg>
                </button>
              </div>

              {section.items.length === 0 ? (
                <p className="px-2 py-3 text-sm text-gray-400">{d.menuEditor.emptySection}</p>
              ) : (
                righe(section.items, section.id)
              )}
              {zonaFine(section.id)}
              <AddDishesButton onClick={() => setAdding({ sectionId: section.id })} />
            </section>
          ))}

          <button
            onClick={() => save(addSection(menu, d.menuEditor.newSectionName))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {d.menuEditor.addSection}
          </button>
        </div>
      )}

      </div>

      {/* Anteprima desktop. max-h + overflow-hidden perché su finestre basse
          la colonna è già ridotta in scala da .preview-column */}
      <div className="sticky top-10 hidden max-h-[calc(100dvh-5rem)] w-[380px] shrink-0 overflow-hidden lg:block">
        <div className="preview-column">
          <p className="mb-0.5 text-center text-sm font-medium text-gray-900">
            {d.menuEditor.previewTitle}
          </p>
          <p className="mx-auto mb-2 max-w-[340px] text-center text-xs text-gray-500">
            {d.menuEditor.previewCaption}
          </p>
          <PhoneFrame>{anteprima}</PhoneFrame>
          {/* In una scheda a parte, non al posto dell'editor: serve a
              guardarla grande e a tenerla aperta accanto mentre si lavora.
              rel noopener perché è pur sempre un target _blank. */}
          <a
            href={`/menu/${menu.id}/anteprima`}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto mt-2 flex w-fit items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            {d.menuEditor.fullPreview}
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 4h6v6M20 4l-8 8" />
              <path d="M18 14v5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 014 19V8a1.5 1.5 0 011.5-1.5H10" />
            </svg>
          </a>
        </div>
      </div>

      {/* Anteprima da telefono: bottone flottante e sovrapposizione */}
      <button
        onClick={() => setPreviewOpen(true)}
        className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg lg:hidden"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="7" y="2" width="10" height="20" rx="2.5" />
          <path d="M11 18.5h2" />
        </svg>
        {d.menuEditor.previewTitle}
      </button>

      {previewOpen && (
        <MobilePreview onClose={() => setPreviewOpen(false)}>{anteprima}</MobilePreview>
      )}

      {adding && (
        <DishPicker
          dishes={catalogo}
          alreadyIn={dentro}
          sectionName={
            adding.sectionId === null
              ? undefined
              : menu.sections.find((s) => s.id === adding.sectionId)?.name.trim() ||
                d.menuEditor.newSectionName
          }
          onAdd={(dishIds) => {
            save(addDishes(menu, adding.sectionId, dishIds));
            setAdding(null);
          }}
          onClose={() => setAdding(null)}
        />
      )}

      {sezioneInEliminazione && (
        <ConfirmDialog
          title={d.menuEditor.deleteSectionTitle}
          // Quanto si perde, detto prima: qui la risposta è "niente", ed è
          // esattamente la cosa che chi sta per premere non dà per scontata
          body={
            sezioneInEliminazione.items.length === 0
              ? d.menuEditor.deleteSectionEmptyBody
              : fill(d.menuEditor.deleteSectionBody, {
                  count: sezioneInEliminazione.items.length,
                })
          }
          subject={sezioneInEliminazione.name.trim() || d.menuEditor.newSectionName}
          confirmLabel={d.common.delete}
          onCancel={() => setDeletingSection(null)}
          onConfirm={() => {
            save(removeSection(menu, sezioneInEliminazione.id));
            setDeletingSection(null);
          }}
        />
      )}
    </div>
  );
}

// L'anteprima da telefono, a tutto schermo: sotto lg non c'è spazio per
// tenerla accanto all'editor. Usa useModal come tutte le finestre, così Esc
// la chiude e il fuoco non se ne va per la pagina dietro.
function MobilePreview({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const { d } = useI18n();
  const panel = useModal<HTMLDivElement>(onClose);

  return (
    <div
      ref={panel}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={d.menuEditor.previewTitle}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/75 p-4 outline-none lg:hidden"
    >
      <div className="max-h-full origin-center scale-[0.85] overflow-visible sm:scale-100">
        <PhoneFrame>{children}</PhoneFrame>
      </div>
      <button
        onClick={onClose}
        className="mt-3 rounded-full bg-white px-5 py-2 text-sm font-medium text-gray-900 shadow-lg"
      >
        {d.common.close}
      </button>
    </div>
  );
}

function BackLink() {
  const { d } = useI18n();
  return (
    <Link
      href="/menu"
      className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {d.menuEditor.back}
    </Link>
  );
}

function AddDishesButton({ onClick }: { onClick: () => void }) {
  const { d } = useI18n();
  return (
    <button
      onClick={onClick}
      className="mt-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
      {d.menuEditor.addDishes}
    </button>
  );
}
