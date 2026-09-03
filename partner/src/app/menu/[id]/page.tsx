'use client';

// L'editor di un menù: sezioni, piatti dentro le sezioni, prezzi, ordine.
// Tutta la logica di struttura sta in menus.ts come funzioni pure: qui si
// compone la modifica e si passa il risultato a save(), così non c'è uno
// stato locale che possa divergere da quello mostrato.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fill, useI18n } from '@/lib/i18n';
import { useModal } from '@/lib/useModal';
import { useDishes, type Dish } from '@/lib/dishes';
import { DEFAULT_ACCENT, type MenuBrand } from '@/lib/menuBrand';
import { useVenues } from '@/lib/venues';
import {
  addDishes,
  addNote,
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
  setItemHighlighted,
  setItemHighlightNote,
  setItemPrice,
  setMenuCurrency,
  setMenuDescription,
  setSectionDescription,
  useMenu,
  useMenus,
  type Menu,
  type MenuItem as Riga,
} from '@/lib/menus';
import MenuItemRow from '@/components/menus/MenuItemRow';
import DishPicker from '@/components/menus/DishPicker';
import DishPanel from '@/components/dishes/DishPanel';
import ConfirmDialog from '@/components/menus/ConfirmDialog';
import BrandBar from '@/components/menus/BrandBar';
import LogoPicker from '@/components/menus/LogoPicker';
import MenuPreview, { NO_NEEDS, type ViewerNeeds } from '@/components/menus/MenuPreview';
import MenuAddress, { ANCORA_INDIRIZZO } from '@/components/menus/MenuAddress';
import LiveBox from '@/components/menus/LiveBox';
import PublishBar from '@/components/menus/PublishBar';
import { usePublishState } from '@/lib/publish';
import PhoneFrame from '@/components/preview/PhoneFrame';

export default function MenuEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { d } = useI18n();
  const { dishes, create: createDish, update: updateDish } = useDishes();
  const { menu, loading, save } = useMenu(id);
  const { menus } = useMenus();
  const {
    venues,
    update: updateVenue,
    revertIdentity,
    setIdentity,
    setTableConditions,
    setSlug,
  } = useVenues();
  // Lo stato della messa online, letto UNA volta per tutta la schermata: lo
  // leggono la riga in cima, la sezione dell'indirizzo e il collegamento
  // sotto l'anteprima. Il locale non si sa finché il menù non è arrivato, e
  // gli hook non possono aspettare: si passa null e parte da sé.
  const pubblicazione = usePublishState(menu?.venueId ?? null);
  // La sezione a cui il pannello dei piatti sta aggiungendo: un id, oppure
  // null per le righe fuori sezione. 'chiuso' perché null è già un valore.
  const [adding, setAdding] = useState<{ sectionId: string | null } | null>(null);
  const [deletingSection, setDeletingSection] = useState<string | null>(null);
  // La conferma prima di rimettere l'aspetto com'è in sala: si buttano via
  // scelte fatte a mano — e una copertina caricata poco fa — quindi si
  // chiede, come per l'eliminazione di una sezione.
  const [revertingBrand, setRevertingBrand] = useState(false);
  // Maschera di un piatto NUOVO aperta dal menù: si ricorda in quale sezione
  // stava andando, perché è lì che deve comparire appena salvato.
  const [creatingDish, setCreatingDish] = useState<{ sectionId: string | null } | null>(null);
  // Il piatto già esistente aperto per una correzione dalla matita di una
  // riga: si tiene l'OGGETTO e non l'id, perché nel frattempo la riga può
  // sparire (il piatto tolto dal menù) senza che il pannello aperto ne debba
  // risentire — sta correggendo il catalogo, non questa riga.
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
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
  // La sezione (o il blocco) appena creata, per portarcela davanti. Nasce in
  // FONDO all'elenco — sopra i due bottoni che l'hanno creata — e su un menù
  // di media lunghezza questo vuol dire fuori dallo schermo: si preme
  // "Nuova sezione" e non si vede succedere niente. Su telefono è la
  // differenza fra un bottone che funziona e uno che sembra rotto.
  const [appenaCreata, setAppenaCreata] = useState<string | null>(null);

  // Si aspetta che la sezione sia RESA, non solo salvata: `save` cambia lo
  // stato e la nuova scheda compare al giro dopo. Se il nodo non c'è ancora
  // non si azzera niente e ci si riprova quando il menù cambia.
  useEffect(() => {
    if (appenaCreata === null) return;
    const nodo = document.getElementById(`sezione-${appenaCreata}`);
    if (nodo === null) return;
    setAppenaCreata(null);
    nodo.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [appenaCreata, menu]);

  // Crea e ci porta: le due cose insieme, in un posto solo, perché i bottoni
  // che creano una sezione sono due (l'elenco in fondo e il menù vuoto) e un
  // giorno saranno tre.
  function creaGruppo(prossimo: Menu) {
    save(prossimo);
    const nato = prossimo.sections[prossimo.sections.length - 1];
    if (nato) setAppenaCreata(nato.id);
  }

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
  const locale = (venues ?? []).find((v) => v.id === menu.venueId) ?? null;
  const brand: MenuBrand = {
    name: locale?.venueName ?? '',
    logoUrl: locale?.logoUrl ?? '',
    accent: locale?.accent ?? DEFAULT_ACCENT,
  };

  // Il NOME passa da update(), che aspetta la fine della battitura e non
  // riscrive i link se non sono cambiati. Logo e colore sono gesti singoli e
  // si scrivono subito.
  function setBrand(next: Partial<MenuBrand>) {
    if (!locale) return;
    if (next.name !== undefined) {
      updateVenue(locale.id, {
        venueName: next.name,
        dishIds: locale.dishIds,
        links: locale.links,
      });
    }
    if (next.logoUrl !== undefined || next.accent !== undefined) {
      setIdentity(locale.id, { logoUrl: next.logoUrl, accent: next.accent });
    }
  }

  // Il piatto nasce nel CATALOGO come sempre — è lì che vivono i fatti del
  // piatto — e in più entra nella sezione da cui si è partiti. Senza il
  // secondo passo bisognerebbe riaprire il selettore e ricercarselo, che è
  // esattamente l'attrito che questa scorciatoia esiste per togliere.
  async function saveNewDish(data: Omit<Dish, 'id'>, sectionId: string | null) {
    setCreatingDish(null);
    const creato = await createDish(data);
    if (creato) save(addDishes(menu!, sectionId, [creato.id]));
  }

  // Corregge il piatto nel CATALOGO, non in questo menù: la stessa modifica
  // vale ovunque il piatto compare (altri menù, scheda AllergiApp). È lo
  // stesso pannello di /piatti, aperto qui per non doverci andare apposta.
  async function saveEditedDish(data: Omit<Dish, 'id'>) {
    if (!editingDish) return;
    const id = editingDish.id;
    setEditingDish(null);
    await updateDish(id, data);
  }

  const catalogo = dishes ?? [];
  const dishById = (dishId: string) => catalogo.find((dish) => dish.id === dishId);
  const dentro = menuItems(menu).map((item) => item.dishId);
  // Le destinazioni della tendina "Sposta in": fuori sezione c'è sempre,
  // perché è dove le righe risalgono quando una sezione viene eliminata.
  const destinazioni = [
    { id: null as string | null, name: d.menuEditor.loose },
    // I blocchi di testo restano fuori: dentro non ci va nessun piatto
    ...menu.sections
      .filter((s) => s.kind === 'section')
      .map((s) => ({
        id: s.id as string | null,
        name: s.name.trim() || d.menuEditor.newSectionName,
      })),
  ];
  const sezioneInEliminazione = menu.sections.find((s) => s.id === deletingSection);
  const vuoto = menu.sections.length === 0 && menu.loose.length === 0;
  // Gli altri menù dello stesso locale: nell'anteprima sono le linguette in
  // alto, che è il modo in cui il cliente al tavolo passa dalla carta alle
  // bevande senza cambiare QR.
  const fratelli = (menus ?? []).filter((m) => m.venueId === menu.venueId);
  const anteprima = (
    <MenuPreview
      menu={menu}
      siblings={fratelli}
      dishes={catalogo}
      brand={brand}
      coverUrl={locale?.coverUrl ?? ''}
      venueName={brand.name.trim() || d.preview.venueName}
      tableConditions={locale?.tableConditions ?? ''}
      layout={locale?.menuLayout ?? 'row'}
      separator={locale?.dishSeparator ?? 'none'}
      showPhotos={locale?.showDishPhotos ?? true}
      photoShape={locale?.dishPhotoShape ?? 'square'}
      showDescriptions={locale?.showDishDescriptions ?? false}
      sectionStyle={locale?.sectionStyle ?? 'underline'}
      headingFont={locale?.headingFont ?? 'modern'}
      textScale={locale?.textScale ?? 'normal'}
      lineHeight={locale?.lineHeight ?? 'normal'}
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
            onHighlight={(highlighted) => save(setItemHighlighted(menu!, item.id, highlighted))}
            onHighlightNote={(note) => save(setItemHighlightNote(menu!, item.id, note))}
            onEdit={(piatto) => setEditingDish(piatto)}
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
    // flottante: stessa scelta dell'editor del locale, stesso gesto.
    <div className="lg:flex lg:items-start lg:gap-8">
      <div className="min-w-0 flex-1 pb-32 lg:max-w-3xl lg:pb-0">
      {/* La riga di servizio in cima: da dove si torna indietro e — a destra
          — se quello che si sta guardando è già in sala. Sticky, perché
          l'avviso sugli allergeni non pubblicati non può scorrere via mentre
          si lavora su un menù lungo (v. PublishBar).

          flex-wrap: su telefono l'avviso scende sotto e si prende tutta la
          larghezza, altrimenti gli restano cinquanta pixel fra il link e il
          bottone. PublishBar mette qui DUE figli, non un involucro, proprio
          perché sia questa riga a poter andare a capo. */}
      <div className="sticky top-0 z-30 -mx-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-gray-100 bg-gray-50/95 px-4 py-2 backdrop-blur md:-mx-8 md:px-8">
        <BackLink />
        <PublishBar
          stato={pubblicazione.stato}
          pubblica={() => void pubblicazione.pubblica()}
          inCorso={pubblicazione.inCorso}
        />
      </div>

      {/* Il titolo della pagina è il NOME DEL LOCALE, non un'etichetta
          generica: è l'unica cosa che il cliente legge per forza, in cima a
          ogni menù di questo ristorante (vale per tutti, come logo e
          colore — da qui e non più da "Aspetto"). Il logo viene prima del
          nome per restare coerente con l'intestazione dell'anteprima, che lo
          mostra nello stesso ordine. */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <LogoPicker logoUrl={brand.logoUrl} onChange={(logoUrl) => setBrand({ logoUrl })} />
        <input
          type="text"
          value={brand.name}
          onChange={(e) => setBrand({ name: e.target.value })}
          placeholder={d.menuEditor.venueNamePlaceholder}
          aria-label={d.menuEditor.venueNameLabel}
          className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 text-xl font-semibold text-gray-900 hover:border-gray-300 focus:border-gray-900 focus:outline-none md:text-2xl"
        />
      </div>

      {/* Descrizione del menù: facoltativa, sotto il titolo. Stesso stile
          "invisibile finché non ci si passa sopra" del titolo, per non
          aggiungere un riquadro a un editor che finora non ne aveva. */}
      <textarea
        value={menu.description}
        onChange={(e) => save(setMenuDescription(menu, e.target.value))}
        placeholder={d.menuEditor.descriptionPlaceholder}
        aria-label={d.menuEditor.descriptionPlaceholder}
        rows={2}
        className="mb-6 mt-1 w-full resize-none rounded-lg border border-transparent px-2 py-1 text-sm text-gray-600 hover:border-gray-300 focus:border-gray-900 focus:outline-none"
      />

      <div className="mb-4">
        <BrandBar
          accent={brand.accent}
          currency={menu.currency}
          layout={locale?.menuLayout ?? 'row'}
          separator={locale?.dishSeparator ?? 'none'}
          showPhotos={locale?.showDishPhotos ?? true}
          photoShape={locale?.dishPhotoShape ?? 'square'}
          showDescriptions={locale?.showDishDescriptions ?? false}
          sectionStyle={locale?.sectionStyle ?? 'underline'}
          headingFont={locale?.headingFont ?? 'modern'}
          textScale={locale?.textScale ?? 'normal'}
          lineHeight={locale?.lineHeight ?? 'normal'}
          coverUrl={locale?.coverUrl ?? ''}
          changed={pubblicazione.stato?.appearanceChanged ?? false}
          onRevert={() => setRevertingBrand(true)}
          onCurrency={(valuta) => save(setMenuCurrency(menu, valuta))}
          onLayout={(menuLayout) => locale && setIdentity(locale.id, { menuLayout })}
          onSeparator={(dishSeparator) => locale && setIdentity(locale.id, { dishSeparator })}
          onAccent={(accent) => setBrand({ accent })}
          onPhotos={({ showPhotos, photoShape }) =>
            locale &&
            setIdentity(locale.id, { showDishPhotos: showPhotos, dishPhotoShape: photoShape })
          }
          onShowDescriptions={(showDishDescriptions) =>
            locale && setIdentity(locale.id, { showDishDescriptions })
          }
          onSectionStyle={(sectionStyle) => locale && setIdentity(locale.id, { sectionStyle })}
          onHeadingFont={(headingFont) => locale && setIdentity(locale.id, { headingFont })}
          onTextScale={(textScale) => locale && setIdentity(locale.id, { textScale })}
          onLineHeight={(lineHeight) => locale && setIdentity(locale.id, { lineHeight })}
          onCover={(coverUrl) => locale && setIdentity(locale.id, { coverUrl })}
        />
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
              onClick={() => creaGruppo(addSection(menu, d.menuEditor.newSectionName))}
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
              // Il bersaglio dell'autoscroll dopo "Nuova sezione" o "Blocco di
              // testo" (v. appenaCreata). scroll-mt tiene conto della riga di
              // servizio, che è ferma là sopra e coprirebbe il titolo.
              id={`sezione-${section.id}`}
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
              className={`relative scroll-mt-20 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm ${
                drag?.kind === 'section' && drag.id === section.id ? 'opacity-40' : ''
              }`}
            >
              {dropSection?.beforeId === section.id && drag?.kind === 'section' && (
                <span className="pointer-events-none absolute inset-x-4 -top-1 h-0.5 rounded-full bg-gray-900" />
              )}
              {/* Un blocco senza titolo, in mezzo alle sezioni, sarebbe una
                  scheda anonima: questa riga dice cos'è prima ancora che ci
                  si scriva dentro. Sulle sezioni non serve — ce lo dicono i
                  piatti che hanno sotto. */}
              {section.kind === 'note' && (
                <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                  {d.menuEditor.noteLabel}
                </p>
              )}
              <div className="mb-2 flex items-center gap-2">
                {/* Maniglia della sezione: stessa idea di quella delle righe,
                    e le frecce qui accanto restano per il dito e la tastiera.
                    Nascosta sotto `sm` come quella delle righe: sul touch il
                    trascinamento non parte, e prometterlo è peggio che non
                    offrirlo. */}
                <span
                  draggable
                  aria-hidden="true"
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', section.id);
                    setDrag({ kind: 'section', id: section.id });
                  }}
                  onDragEnd={endDrag}
                  className="hidden shrink-0 cursor-grab text-gray-300 transition-colors hover:text-gray-600 active:cursor-grabbing sm:block"
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
                  placeholder={
                    section.kind === 'note'
                      ? d.menuEditor.noteTitlePlaceholder
                      : d.menuEditor.sectionNamePlaceholder
                  }
                  aria-label={
                    section.kind === 'note'
                      ? d.menuEditor.noteTitlePlaceholder
                      : d.menuEditor.sectionNamePlaceholder
                  }
                  className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 text-sm font-semibold text-gray-900 hover:border-gray-300 focus:border-gray-900 focus:outline-none"
                />
                <button
                  onClick={() => save(moveSection(menu, section.id, -1))}
                  disabled={i === 0}
                  aria-label={d.menuEditor.moveUp}
                  className="-my-1.5 shrink-0 p-1.5 text-gray-300 transition-colors hover:text-gray-900 disabled:opacity-25 disabled:hover:text-gray-300"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 15l6-6 6 6" />
                  </svg>
                </button>
                <button
                  onClick={() => save(moveSection(menu, section.id, 1))}
                  disabled={i === menu.sections.length - 1}
                  aria-label={d.menuEditor.moveDown}
                  className="-my-1.5 shrink-0 p-1.5 text-gray-300 transition-colors hover:text-gray-900 disabled:opacity-25 disabled:hover:text-gray-300"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <button
                  onClick={() => setDeletingSection(section.id)}
                  aria-label={d.common.delete}
                  title={d.common.delete}
                  className="-my-1.5 shrink-0 p-1.5 text-gray-300 transition-colors hover:text-red-600"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7h16M9 7V5h6v2M6.5 7l1 12h9l1-12" />
                  </svg>
                </button>
              </div>

              {/* Lo stesso campo fa due mestieri, e la differenza è tutta
                  nel peso: sotto una sezione è una didascalia (un rigo,
                  grigio chiaro), dentro un blocco è IL contenuto — più righe
                  e testo leggibile, perché è quello che il cliente leggerà. */}
              <textarea
                value={section.description}
                onChange={(e) => save(setSectionDescription(menu, section.id, e.target.value))}
                placeholder={
                  section.kind === 'note'
                    ? d.menuEditor.noteTextPlaceholder
                    : d.menuEditor.sectionDescriptionPlaceholder
                }
                aria-label={
                  section.kind === 'note'
                    ? d.menuEditor.noteTextPlaceholder
                    : d.menuEditor.sectionDescriptionPlaceholder
                }
                rows={section.kind === 'note' ? 3 : 1}
                className={
                  section.kind === 'note'
                    ? 'w-full resize-none rounded-lg border border-transparent px-2 py-1 text-sm text-gray-700 hover:border-gray-300 focus:border-gray-900 focus:outline-none'
                    : 'mb-3 w-full resize-none rounded-lg border border-transparent px-2 py-1 text-xs text-gray-500 hover:border-gray-300 focus:border-gray-900 focus:outline-none'
                }
              />

              {/* Un blocco finisce qui: niente piatti, niente zona di rilascio
                  e nessun "Aggiungi piatti". Il tipo si decide creandolo e non
                  si cambia — un interruttore sezione/blocco vorrebbe dire
                  decidere ogni volta che fine fanno i piatti che ci sono
                  dentro, per una cosa che si fa una volta sola. */}
              {section.kind === 'section' && (
                <>
                  {section.items.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-gray-400">{d.menuEditor.emptySection}</p>
                  ) : (
                    righe(section.items, section.id)
                  )}
                  {zonaFine(section.id)}
                  <AddDishesButton onClick={() => setAdding({ sectionId: section.id })} />
                </>
              )}
            </section>
          ))}

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => creaGruppo(addSection(menu, d.menuEditor.newSectionName))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {d.menuEditor.addSection}
            </button>
            {/* Il blocco nasce in fondo come la sezione, e da lì si trascina
                dove serve: sono nella stessa fila, quindi si spostano con lo
                stesso gesto. */}
            <button
              onClick={() => creaGruppo(addNote(menu))}
              title={d.menuEditor.noteHint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h9" />
              </svg>
              {d.menuEditor.addNote}
            </button>
          </div>
        </div>
      )}

      {/* LE CONDIZIONI AL TAVOLO, in fondo all'editor perché è dove finiscono
          nel menù. Sono del LOCALE come il logo e il colore — si scrivono da
          qui perché è qui che se ne vede l'effetto, e la riga sotto il titolo
          dice che valgono per tutte le linguette. */}
      {locale && (
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-gray-900">{d.menuEditor.conditionsTitle}</h2>
          <p className="mt-0.5 text-xs text-gray-500">{d.menuEditor.conditionsHint}</p>
          <textarea
            value={locale.tableConditions}
            onChange={(e) => setTableConditions(locale.id, e.target.value)}
            placeholder={d.menuEditor.conditionsPlaceholder}
            aria-label={d.menuEditor.conditionsTitle}
            rows={2}
            className="mt-2 w-full resize-none rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-gray-900 focus:outline-none"
          />
        </div>
      )}

      {/* L'INDIRIZZO PUBBLICO, in fondo insieme alle altre cose del locale.
          Non è ancora attivo, e la card lo dichiara: qui si sceglie il nome e
          lo si mette al sicuro prima che lo prenda qualcun altro. */}
      {locale && (
        <MenuAddress
          venue={locale}
          online={pubblicazione.online}
          onSave={(slug) => setSlug(locale.id, slug)}
          onOnline={(acceso) =>
            void (acceso ? pubblicazione.pubblica() : pubblicazione.ritira())
          }
          inCorso={pubblicazione.inCorso}
        />
      )}

      </div>

      {/* Anteprima desktop, CENTRATA nella finestra e non appesa in alto.
          Appesa in alto finiva addosso alla riga di servizio (indietro +
          pubblicazione), che adesso è ferma là sopra; e su schermi alti
          lasciava sotto di sé una colonna di vuoto lunga quanto l'editor.
          Il contenitore è alto quanto la finestra meno i margini e centra
          quello che ha dentro: il telefono resta a metà schermo mentre si
          scorre. Il pb sposta il centro un po' più IN ALTO — centrato di
          preciso il telefono sembrava seduto sul fondo, perché sotto di sé ha
          solo due collegamenti mentre sopra ha due righe di titolo. È un
          numero solo: alzarlo o abbassarlo sposta l'anteprima.

          ⚠️ top-10 e non top-0, e l'altezza tolti DUE margini: la colonna
          nasce già a 2.5rem dal bordo (è il padding della pagina), quindi
          agganciandola a filo schermo scivolava su di 40 pixel prima di
          fermarsi — e a ogni inizio di scorrimento l'anteprima si vedeva
          sobbalzare. Con l'aggancio alla stessa altezza da cui parte, non si
          muove mai; e i due margini uguali la tengono centrata davvero.

          overflow-hidden perché su finestre basse .preview-column è ridotta
          in scala. */}
      <div className="sticky top-10 hidden h-[calc(100dvh-5rem)] w-[380px] shrink-0 items-center overflow-hidden pb-12 lg:flex">
        <div className="preview-column is-centered w-full">
          <p className="mb-0.5 text-center text-sm font-medium text-gray-900">
            {d.menuEditor.previewTitle}
          </p>
          <p className="mx-auto mb-2 max-w-[340px] text-center text-xs text-gray-500">
            {d.menuEditor.previewCaption}
          </p>
          <PhoneFrame>{anteprima}</PhoneFrame>
          {/* ATTACCATO AL TELEFONO, perché parla del telefono: è lo stesso
              schermo, guardato più grande. In una scheda a parte e non al
              posto dell'editor, così si può tenere aperta accanto mentre si
              lavora. rel noopener perché è pur sempre un target _blank. */}
          <a
            href={`/menu/${menu.id}/anteprima`}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto mt-1.5 flex w-fit items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            {d.menuEditor.fullPreview}
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 4h6v6M20 4l-8 8" />
              <path d="M18 14v5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 014 19V8a1.5 1.5 0 011.5-1.5H10" />
            </svg>
          </a>

          {/* Staccato da un respiro, perché è un'ALTRA cosa: sopra c'è
              l'anteprima e come guardarla, qui c'è il menù com'è
              raggiungibile dal mondo — il codice per riconoscerlo, il link da
              copiare, la pagina vera da aprire. "Modifica" porta alla sezione
              in fondo, che resta l'unico posto in cui si cambia l'indirizzo e
              si scaricano i file per la stampa. Solo a menù pubblicato: prima
              quell'indirizzo non risponde a nessuno. */}
          {locale && (
            <LiveBox
              slug={locale.slug}
              online={pubblicazione.online}
              onEdit={() =>
                document
                  .getElementById(ANCORA_INDIRIZZO)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }
            />
          )}
        </div>
      </div>

      {/* Anteprima da telefono: bottone flottante e sovrapposizione.

          STACCATO DALLA BARRA DI NAVIGAZIONE, non appoggiato sopra: a
          sedici pixel dalla barra i due sembravano una cosa sola, e in mezzo
          ci passava anche la pill del salvataggio (SaveStatus, che sta a
          dodici pixel dalla barra e dallo stesso lato). Adesso la misura è
          scritta con la stessa ricetta di quella pill — la barra c'è solo da
          telefono (--nav-bottom) e sotto c'è il bordo tondo dello schermo —
          e le due cose non si toccano più.

          Il respiro in fondo alla colonna dell'editor (pb-32) è l'altra metà:
          senza, scorrendo fino in fondo l'ultima scheda finiva sotto questo
          bottone. */}
      <button
        onClick={() => setPreviewOpen(true)}
        style={{ bottom: 'calc(3rem + env(safe-area-inset-bottom) + var(--nav-bottom, 0px))' }}
        className="fixed right-4 z-30 flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg lg:hidden"
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
          onCreateNew={() => {
            // Il selettore si CHIUDE invece di restare sotto: due finestre
            // sovrapposte si contendono il blocco dello scorrimento e il
            // fuoco, e chi torna indietro non sa più dove si trova.
            setCreatingDish({ sectionId: adding.sectionId });
            setAdding(null);
          }}
          onClose={() => setAdding(null)}
        />
      )}

      {creatingDish && (
        // Senza le caselle "Sulle schede": qui il piatto sta per finire in una
        // sezione del menù, non acceso su una scheda AllergiApp
        <DishPanel
          onSave={(data) => saveNewDish(data, creatingDish.sectionId)}
          onClose={() => setCreatingDish(null)}
        />
      )}

      {editingDish && (
        // Stessa ragione: si sta correggendo un piatto già in catalogo, non
        // decidendo su quali schede accenderlo — quella scelta resta a /piatti.
        <DishPanel
          dish={editingDish}
          onSave={saveEditedDish}
          onClose={() => setEditingDish(null)}
        />
      )}

      {sezioneInEliminazione && (
        <ConfirmDialog
          title={
            sezioneInEliminazione.kind === 'note'
              ? d.menuEditor.deleteNoteTitle
              : d.menuEditor.deleteSectionTitle
          }
          // Quanto si perde, detto prima: su una sezione la risposta è
          // "niente" (i piatti risalgono fuori sezione) ed è esattamente la
          // cosa che chi sta per premere non dà per scontata. Su un blocco
          // invece si perde il testo, e va detto altrettanto chiaramente.
          body={
            sezioneInEliminazione.kind === 'note'
              ? d.menuEditor.deleteNoteBody
              : sezioneInEliminazione.items.length === 0
                ? d.menuEditor.deleteSectionEmptyBody
                : fill(d.menuEditor.deleteSectionBody, {
                    count: sezioneInEliminazione.items.length,
                  })
          }
          subject={
            sezioneInEliminazione.name.trim() ||
            (sezioneInEliminazione.kind === 'note'
              ? d.menuEditor.untitledNote
              : d.menuEditor.newSectionName)
          }
          confirmLabel={d.common.delete}
          onCancel={() => setDeletingSection(null)}
          onConfirm={() => {
            save(removeSection(menu, sezioneInEliminazione.id));
            setDeletingSection(null);
          }}
        />
      )}

      {revertingBrand && locale && (
        <ConfirmDialog
          title={d.menuEditor.appearanceRevertTitle}
          // Il corpo dice sia cosa torna indietro sia cosa NON si tocca: la
          // seconda metà è quella che serve davvero, perché "annulla le
          // modifiche" in un editor di menù si legge come "annulla tutto".
          body={d.menuEditor.appearanceRevertBody}
          confirmLabel={d.menuEditor.appearanceRevertConfirm}
          onCancel={() => setRevertingBrand(false)}
          onConfirm={() => {
            void revertIdentity(locale.id);
            setRevertingBrand(false);
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
      // shrink-0 sul link stesso e non su un involucro: un <span> attorno
      // sarebbe un elemento in linea usato come colonna, e la sua riga di
      // testo aggiungerebbe qualche pixel sotto — abbastanza da far sembrare
      // "Tutti i menù" disallineato rispetto al resto della riga.
      //
      // py-1.5 lo rende alto quanto il bottone "Pubblica" che gli compare
      // accanto: così la prima riga è alta uguale anche quando il bottone non
      // c'è, e alla prima modifica il menù sotto non scende (v. PublishBar).
      className="inline-flex shrink-0 items-center gap-1.5 py-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
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
