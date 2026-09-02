'use client';

// Il LOCALE del partner: nome, link, e i piatti accesi sulla sua scheda
// AllergiApp. Dal 30/08 vive nelle tabelle partner_*; dal 31/08 la tabella si
// chiama partner_venues (migration 703).
//
// La parola "vetrina" non esiste più, in nessuno dei due sensi in cui veniva
// usata: il contenitore è il LOCALE (questo file), e quello che finisce
// nell'app è la SCHEDA AllergiApp, che esiste solo dopo il claim. Erano la
// stessa cosa per sbaglio, e la stessa riga si chiamava in due modi diversi
// in due schermate — "Nome della vetrina" nell'editor, "Nome del locale" nel
// menù — mentre il cliente al tavolo leggeva la seconda (Tema 16).
//
// COSA È CAMBIATO SOTTO (703): i piatti accesi non pendono più dal locale ma
// dalla SCHEDA AllergiApp, che esiste solo dopo aver associato un ristorante.
// Senza scheda non c'è niente da accendere, e `cardId` è null: le schermate
// devono spegnere quei comandi invece di far scrivere a vuoto.
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { supabase } from './supabase';
import { currentUserId, onForget, reportError, useDebouncedSave, useRemoteList } from './storage';
import { deleteLogo } from './photos';
import { write } from './saveState';

// I tre stili dei titoli di sezione. Sono un elenco chiuso anche nel
// database (CHECK della 709): aggiungerne uno vuol dire toccare tutte e due.
export const SECTION_STYLES = ['underline', 'banner', 'plain'] as const;
export type SectionStyle = (typeof SECTION_STYLES)[number];

export interface MenuLink {
  language: string; // codice lingua; '' = predefinito (fallback)
  url: string;
}

export interface DeliveryLink {
  provider: string; // codice da DELIVERY_PROVIDERS, 'other' o '' (non scelto)
  label: string; // nome del servizio quando provider = 'other'
  url: string;
}

// Prenotazione: link, telefono o entrambi. Con tutti e due la scheda
// mostra sempre una pill sola e fa scegliere all'utente.
export interface BookingLink {
  url: string;
  phone: string; // come l'ha scritto il ristoratore; il tel: lo ripulisce
}

export interface DraftLinks {
  booking: BookingLink;
  website: string;
  deliveries: DeliveryLink[];
  menus: MenuLink[];
}

export interface VenueDraft {
  // Il nome del LOCALE. Non è un'etichetta privata: è quello che il cliente
  // legge in cima al menù al tavolo, ed è l'unica fonte possibile per chi non
  // farà mai il claim (Tema 16). Sulla scheda AllergiApp, invece,
  // l'intestazione continua ad arrivare dal ristorante rivendicato.
  venueName: string;
  // Piatti del catalogo accesi sulla scheda di questo locale. È l'UNICO
  // stato di disponibilità: spegnerne uno qui non lo tocca sulle altre schede.
  dishIds: string[];
  links: DraftLinks;
}

export interface Venue extends VenueDraft {
  id: string;
  // L'identità che il cliente vede in cima al menù. Sta qui e non in un
  // modulo suo perché è la STESSA riga che questo file legge già: due
  // interrogazioni sulla stessa tabella sono esattamente quello che il
  // livello dati condiviso è stato scritto per togliere.
  logoUrl: string; // vuoto = compare quello di AllergiApp
  accent: string;  // codice da MENU_ACCENTS
  // Le CONDIZIONI AL TAVOLO: coperto, servizio, pagamenti. Poche righe in
  // fondo a OGNI menù di questo locale, ed è la ragione per cui stanno qui e
  // non sul menù — le linguette in cima alla pagina (carta, pranzo, bevande)
  // sono lo stesso tavolo, e il coperto non cambia passando dall'una
  // all'altra. Quello che è del singolo menù si scrive in un blocco di testo.
  // Le legge il cliente: qui dentro non va niente di interno.
  tableConditions: string;
  // La scheda AllergiApp di questo locale, se esiste. null = nessun
  // ristorante associato, quindi nessun posto dove accendere i piatti.
  cardId: string | null;
  // COME SI VEDE IL MENÙ AL TAVOLO. Sta sul locale e non sul menù come il
  // logo e il colore: al tavolo è UNA pagina sola (Tema 13).
  //
  // Le foto stanno sul PIATTO nel catalogo e si caricano una volta sola: qui
  // si decide soltanto se QUESTA superficie le mostra. La scheda AllergiApp
  // in app continua a mostrarle comunque — là siamo noi a presentare un
  // ristorante a chi lo sceglie da lontano.
  showDishPhotos: boolean;
  // Le descrizioni sotto il nome, in lista. Spente = si leggono aprendo il
  // piatto, che è il comportamento di sempre.
  showDishDescriptions: boolean;
  // Come si vedono i titoli delle sezioni nel menù al tavolo (migration 709).
  // 'underline' è quello di sempre.
  sectionStyle: SectionStyle;
  // L'indirizzo pubblico del menù: allergiapp.com/menu/<slug>. Vuoto = non
  // ancora scelto, ed è lo stato di tutti i locali che esistono oggi. Ne
  // esiste UNO alla volta e cambiandolo il precedente torna libero
  // (migration 707, DIGITAL_MENU.md Tema 17). NON è ancora attivo: la
  // pagina pubblica è la fase successiva, qui il nome si mette solo al
  // sicuro.
  slug: string;
}

// La chiave del piatto acceso su una scheda, condivisa fra accensione e
// spegnimento (v. setDishOn)
function acceso(venueId: string, dishId: string) {
  return `su-scheda:${venueId}:${dishId}`;
}

function emptyLinks(): DraftLinks {
  return { booking: { url: '', phone: '' }, website: '', deliveries: [], menus: [] };
}

/* eslint-disable @typescript-eslint/no-explicit-any */

// Le righe di partner_links diventano la forma che l'editor si aspetta:
// una prenotazione sola, un sito solo, e liste per delivery e menù.
function toLinks(righe: any[]): DraftLinks {
  const links = emptyLinks();
  for (const r of righe ?? []) {
    if (r.kind === 'booking') {
      links.booking = { url: r.url ?? '', phone: r.phone ?? '' };
    } else if (r.kind === 'website') {
      links.website = r.url ?? '';
    } else if (r.kind === 'delivery') {
      links.deliveries.push({ provider: r.provider ?? '', label: r.label ?? '', url: r.url ?? '' });
    } else if (r.kind === 'menu') {
      links.menus.push({ language: r.language ?? '', url: r.url ?? '' });
    }
  }
  return links;
}

// …e viceversa. Solo le righe che portano da qualche parte: il database ha un
// vincolo che rifiuta un link senza indirizzo (tranne la prenotazione col
// telefono), e comunque una riga vuota non è un link.
function fromLinks(venueId: string, links: DraftLinks) {
  const righe: Record<string, unknown>[] = [];
  const booking = links.booking;
  if (booking.url.trim() !== '' || booking.phone.trim() !== '') {
    righe.push({
      venue_id: venueId,
      kind: 'booking',
      url: booking.url.trim() || null,
      phone: booking.phone.trim() || null,
    });
  }
  if (links.website.trim() !== '') {
    righe.push({ venue_id: venueId, kind: 'website', url: links.website.trim() });
  }
  links.deliveries.forEach((del, i) => {
    if (del.url.trim() === '') return;
    righe.push({
      venue_id: venueId,
      kind: 'delivery',
      url: del.url.trim(),
      provider: del.provider || null,
      label: del.label || null,
      sort_order: i,
    });
  });
  links.menus.forEach((menu, i) => {
    if (menu.url.trim() === '') return;
    righe.push({
      venue_id: venueId,
      kind: 'menu',
      url: menu.url.trim(),
      language: menu.language || null,
      sort_order: i,
    });
  });
  return righe;
}

// Una query sola con gli innesti: locali, i loro link e gli id dei piatti
// accesi. Le RLS mostrano solo le proprie, quindi non serve filtrare.
async function loadVenues(): Promise<Venue[]> {
  // Un innesto in più rispetto a prima: i piatti accesi stanno sotto la
  // scheda, non sotto il locale. La scheda è al massimo una (indice unico
  // sul ristorante), quindi si prende la prima e basta.
  const { data, error } = await supabase
    .from('partner_venues')
    .select(
      'id, name, slug, logo_url, accent, table_conditions, show_dish_photos, ' +
        'show_dish_descriptions, section_style, ' +
        'partner_links(*), partner_cards(id, partner_card_dishes(dish_id))'
    )
    .order('created_at', { ascending: true });
  reportError('lettura locali', error);

  return (data ?? []).map((row: any) => {
    const card = (row.partner_cards ?? [])[0] ?? null;
    return {
      id: row.id,
      venueName: row.name ?? '',
      logoUrl: row.logo_url ?? '',
      accent: row.accent ?? 'charcoal',
      tableConditions: row.table_conditions ?? '',
      slug: row.slug ?? '',
      showDishPhotos: row.show_dish_photos ?? true,
      showDishDescriptions: row.show_dish_descriptions ?? false,
      sectionStyle: (row.section_style ?? 'underline') as SectionStyle,
      cardId: card?.id ?? null,
      dishIds: (card?.partner_card_dishes ?? []).map((d: any) => d.dish_id),
      links: toLinks(row.partner_links),
    };
  });
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// Cosa è già stato scritto per ogni locale, per non riscrivere ciò che non è
// cambiato. Scrivendo il nome si fa una pausa a ogni parola, e senza questo
// ogni pausa porterebbe con sé anche la cancellazione e la riscrittura di
// TUTTI i link, che non c'entrano niente. Parte vuota a ogni apertura: cosa
// c'è sul server non lo sappiamo, e la prima scrittura lo mette in chiaro.
const ultimoSalvato = new Map<string, { nome: string; link: string; condizioni: string }>();
onForget(() => ultimoSalvato.clear());

// Il contenuto di un locale si riscrive tutto: i link sono pochi, l'ordine
// conta, e calcolare la differenza costerebbe più di quanto faccia risparmiare.
// Quello che si evita è riscrivere un blocco che non è stato toccato affatto.
async function saveVenueContent(venue: Venue) {
  const righe = fromLinks(venue.id, venue.links);
  const nome = venue.venueName;
  const link = JSON.stringify(righe);
  const condizioni = venue.tableConditions;
  const precedente = ultimoSalvato.get(venue.id);
  // Si segna come scritto solo ciò che il server ha accettato: dandolo per
  // buono a prescindere, una scrittura rifiutata verrebbe saltata anche la
  // volta dopo e il dato non arriverebbe mai
  const fatto = {
    nome: precedente?.nome ?? '\u0000',
    link: precedente?.link ?? '\u0000',
    condizioni: precedente?.condizioni ?? '\u0000',
  };

  if (precedente?.nome !== nome) {
    const { error } = await write(
      'salvataggio nome locale',
      () =>
        supabase
          .from('partner_venues')
          .update({ name: nome })
          .eq('id', venue.id),
      // Stessa chiave che usa rename() dalla lista: è lo stesso campo della
      // stessa riga, e fra due modi di scriverlo vale l'ultimo
      `nome:${venue.id}`
    );
    if (!error) fatto.nome = nome;
  }

  // Si battono a mano come il nome, quindi stessa pausa e stesso confronto:
  // senza, ogni pausa nella battitura riscriverebbe anche i link.
  if (precedente?.condizioni !== condizioni) {
    const { error } = await write(
      'salvataggio condizioni al tavolo',
      () =>
        supabase
          .from('partner_venues')
          .update({ table_conditions: condizioni.trim() || null })
          .eq('id', venue.id),
      `condizioni:${venue.id}`
    );
    if (!error) fatto.condizioni = condizioni;
  }

  if (precedente?.link !== link) {
    const { error: cancellati } = await write(
      'cancellazione link',
      () => supabase.from('partner_links').delete().eq('venue_id', venue.id),
      `link-cancella:${venue.id}`
    );
    let scritti = null;
    if (righe.length > 0) {
      ({ error: scritti } = await write(
        'scrittura link',
        () => supabase.from('partner_links').insert(righe),
        `link-scrivi:${venue.id}`
      ));
    }
    if (!cancellati && !scritti) fatto.link = link;
  }

  ultimoSalvato.set(venue.id, fatto);
}

// Se un indirizzo è già di qualcun altro. Passa da una funzione del database
// (`partner_slug_taken`, migration 707) e non da una select: le RLS mostrano a
// ogni partner solo i PROPRI locali, quindi una select direbbe "libero" anche
// per un indirizzo preso — e il ristoratore scoprirebbe il contrario solo dal
// rifiuto della scrittura. La funzione risponde sì/no e non dice di chi sia.
//
// null = non si è potuto controllare (rete, server). È diverso da "libero", e
// chi chiama non deve confonderli: l'ultima parola ce l'ha comunque l'indice
// unico del database.
export async function slugOccupato(slug: string): Promise<boolean | null> {
  const { data, error } = await supabase.rpc('partner_slug_taken', { candidate: slug });
  if (error) {
    reportError('controllo indirizzo del menù', error);
    return null;
  }
  return data === true;
}

// ------------------------------------------------------------------
// BOZZA E PUBBLICATO
// Il portale continua a salvare da solo mentre si scrive — la bozza non si
// perde mai — ma quello che il cliente legge al tavolo cambia solo quando il
// ristoratore preme "Pubblica le modifiche" (DIGITAL_MENU.md, Tema 24).
// ------------------------------------------------------------------

export interface PublishState {
  // quando è stato pubblicato l'ultima volta; null = mai
  publishedAt: string | null;
  // la bozza è più avanti dello scatto pubblicato
  hasChanges: boolean;
  // …e fra le modifiche ci sono ALLERGENI. È la ragione per cui questo campo
  // esiste: un allergene corretto e mai pubblicato resta vecchio sul tavolo, e
  // dal portale non si vede — lì la correzione c'è. L'avviso deve poter
  // nominare quel rischio invece di dire genericamente "hai modifiche".
  allergensChanged: boolean;
}

export async function menuPublishState(venueId: string): Promise<PublishState | null> {
  const { data, error } = await supabase.rpc('menu_publish_state', { p_venue_id: venueId });
  if (error) {
    reportError('stato di pubblicazione', error);
    return null;
  }
  return (data as PublishState) ?? null;
}

// Restituisce quando è stata fatta, o null se non è andata. Passa da write()
// come tutte le altre scritture: se fallisce si vede nella barra di stato e
// si può riprovare, invece di lasciare il ristoratore convinto di aver
// pubblicato.
export async function publishMenu(venueId: string): Promise<string | null> {
  const { data, error } = await write('pubblicazione del menù', () =>
    supabase.rpc('publish_menu', { p_venue_id: venueId })
  );
  if (error) return null;
  return (data as string) ?? null;
}

// Stacca il menù dalla sala (migration 709). Non cancella niente: chi
// inquadra il QR da quel momento legge che il menù non è al momento
// disponibile, e riattivare si fa ripubblicando — con lo scatto nuovo, non
// con quello di sei mesi fa.
export async function unpublishMenu(venueId: string): Promise<boolean> {
  const { data, error } = await write('ritiro del menù', () =>
    supabase.rpc('unpublish_menu', { p_venue_id: venueId })
  );
  if (error) return false;
  return data === true;
}

// venues è null finché la prima lettura non è tornata
export function useVenues() {
  const { list: venues, setList, reload } = useRemoteList('locali', loadVenues);
  // L'editor cambia la bozza a ogni tasto: si scrive dopo la pausa
  const { schedule } = useDebouncedSave(saveVenueContent);

  async function create(venueName = ''): Promise<Venue | null> {
    const ownerId = await currentUserId();
    if (!ownerId) return null;
    const { data } = await write('creazione locale', () =>
      supabase
        .from('partner_venues')
        .insert({ owner_user_id: ownerId, name: venueName })
        .select('id')
        .single()
    );
    if (!data) return null;
    const creata: Venue = {
      id: data.id,
      venueName,
      logoUrl: '',
      accent: 'charcoal',
      tableConditions: '',
      slug: '',
      showDishPhotos: true,
      showDishDescriptions: false,
      sectionStyle: 'underline',
      cardId: null,
      dishIds: [],
      links: emptyLinks(),
    };
    // La barra laterale elenca i locali e guarda questa stessa lista:
    // aggiornandola qui si aggiorna anche là, senza tornare al server
    setList([...(venues ?? []), creata]);
    return creata;
  }

  // Contenuto del locale: nome e link. NON tocca i piatti accesi, che
  // passano da setDishOn — l'editor non li cambia mai per questa strada.
  function update(id: string, draft: VenueDraft) {
    // cardId non sta nella bozza (l'editor non lo tocca) e va conservato,
    // o salvando il nome si perderebbe la scheda associata
    const next = (venues ?? []).map((s) =>
      s.id === id
        ? {
            ...draft,
            id,
            cardId: s.cardId,
            logoUrl: s.logoUrl,
            accent: s.accent,
            tableConditions: s.tableConditions,
            slug: s.slug,
            showDishPhotos: s.showDishPhotos,
            showDishDescriptions: s.showDishDescriptions,
            sectionStyle: s.sectionStyle,
          }
        : s
    );
    setList(next);
    const aggiornata = next.find((s) => s.id === id);
    if (aggiornata) schedule(aggiornata);
  }

  function rename(id: string, venueName: string) {
    setList((venues ?? []).map((s) => (s.id === id ? { ...s, venueName } : s)));
    void write(
      'rinomina locale',
      () => supabase.from('partner_venues').update({ name: venueName }).eq('id', id),
      `nome:${id}`
    );
  }

  // Logo e colore del locale: quello che il cliente vede in cima al menù.
  // Scrittura immediata e non ritardata — sono gesti singoli (scegli un
  // colore, carichi un logo), non una battitura continua. Il nome invece
  // passa da rename(), che la pausa ce l'ha già.
  function setIdentity(
    id: string,
    next: Partial<
      Pick<Venue, 'logoUrl' | 'accent' | 'showDishPhotos' | 'showDishDescriptions' | 'sectionStyle'>
    >
  ) {
    // Il logo che c'era prima, letto PRIMA di sovrascrivere la lista: se la
    // scrittura riesce, quel file non è più di nessuno e va portato via.
    const precedente = (venues ?? []).find((s) => s.id === id)?.logoUrl ?? '';
    setList((venues ?? []).map((s) => (s.id === id ? { ...s, ...next } : s)));
    const riga: Record<string, unknown> = {};
    if (next.logoUrl !== undefined) riga.logo_url = next.logoUrl || null;
    if (next.accent !== undefined) riga.accent = next.accent;
    if (next.showDishPhotos !== undefined) riga.show_dish_photos = next.showDishPhotos;
    if (next.showDishDescriptions !== undefined) riga.show_dish_descriptions = next.showDishDescriptions;
    if (next.sectionStyle !== undefined) riga.section_style = next.sectionStyle;
    void write(
      'salvataggio aspetto del locale',
      () => supabase.from('partner_venues').update(riga).eq('id', id),
      `aspetto:${id}`
    ).then(({ error }) => {
      // Solo DOPO che il nuovo logo è stato scritto davvero: cancellando
      // prima, una scrittura fallita lascerebbe la riga che punta a un file
      // che nel frattempo abbiamo distrutto noi. Sui loghi vecchi, che sono
      // data-URL e non file, deleteLogo non fa niente.
      if (error || next.logoUrl === undefined) return;
      if (precedente !== '' && precedente !== next.logoUrl) void deleteLogo(precedente);
    });
  }

  // Le condizioni al tavolo si battono a mano: passano dalla stessa pausa del
  // nome e dei link (schedule), non dalla scrittura immediata di setIdentity —
  // quella è per i gesti singoli, scegliere un colore o caricare un logo.
  function setTableConditions(id: string, tableConditions: string) {
    const next = (venues ?? []).map((s) => (s.id === id ? { ...s, tableConditions } : s));
    setList(next);
    const aggiornata = next.find((s) => s.id === id);
    if (aggiornata) schedule(aggiornata);
  }

  // L'indirizzo del menù. Gesto singolo come il logo e il colore, quindi
  // scrittura immediata: non è una battitura continua: si scrive nel campo,
  // si controlla che sia libero, si conferma.
  //
  // Dice se ha funzionato, e non per pignoleria: l'unicità è del database, e
  // fra il controllo di disponibilità e questa scrittura ci sta in mezzo
  // qualcun altro che si prende lo stesso nome. Chi chiama deve poterlo dire
  // invece di mostrare un indirizzo che non è suo.
  async function setSlug(id: string, slug: string): Promise<boolean> {
    const { error } = await write(
      'salvataggio indirizzo del menù',
      () => supabase.from('partner_venues').update({ slug: slug || null }).eq('id', id),
      `slug:${id}`
    );
    if (error) return false;
    setList((venues ?? []).map((s) => (s.id === id ? { ...s, slug } : s)));
    return true;
  }

  function remove(id: string) {
    setList((venues ?? []).filter((s) => s.id !== id));
    void write('eliminazione locale', () =>
      supabase.from('partner_venues').delete().eq('id', id)
    );
  }

  // Ripristino dopo l'undo: il locale torna com'era, id compreso, così i
  // link e i piatti accesi si riattaccano alla stessa riga. Torna anche al
  // suo posto nella lista, perché l'ordine è quello di creazione.
  async function restore(venue: Venue) {
    const ownerId = await currentUserId();
    if (!ownerId) return;
    await write('ripristino locale', () =>
      supabase
        .from('partner_venues')
        .insert({
          id: venue.id,
          owner_user_id: ownerId,
          name: venue.venueName,
          logo_url: venue.logoUrl || null,
          accent: venue.accent,
          table_conditions: venue.tableConditions.trim() || null,
          // L'indirizzo torna col locale: eliminandolo era tornato libero, e
          // se nel frattempo se l'è preso qualcun altro questa insert fallisce
          // — il ripristino si vede fallire nella barra di stato, che è meglio
          // di un locale che torna con un indirizzo diverso da quello che
          // aveva.
          slug: venue.slug || null,
          show_dish_photos: venue.showDishPhotos,
          show_dish_descriptions: venue.showDishDescriptions,
          section_style: venue.sectionStyle,
        })
    );
    const righe = fromLinks(venue.id, venue.links);
    if (righe.length > 0) {
      await write('ripristino link', () => supabase.from('partner_links').insert(righe));
    }
    // I piatti accesi tornano sulla SCHEDA, non sul locale — e solo se la
    // scheda c'è ancora. Senza, non si perde niente di importante: i piatti
    // vivono nel catalogo, qui c'era solo dove comparivano.
    if (venue.cardId !== null && venue.dishIds.length > 0) {
      await write('ripristino piatti sulla scheda', () =>
        supabase.from('partner_card_dishes').insert(
          venue.dishIds.map((dishId) => ({
            card_id: venue.cardId,
            dish_id: dishId,
            owner_user_id: ownerId,
          }))
        )
      );
    }
    await reload();
  }

  // Accende o spegne un piatto sulla SCHEDA AllergiApp di un locale: una riga
  // che c'è o non c'è. Accendere e spegnere condividono la chiave, pur essendo
  // due scritture opposte: sono lo stesso interruttore, e dopo due tocchi
  // rapidi da rifare c'è solo l'ultimo.
  //
  // Senza scheda non si scrive niente e non si finge che sia successo: chi
  // chiama deve aver già spento il comando (v. `cardId`).
  async function setDishOn(venueId: string, dishId: string, on: boolean) {
    const cardId = (venues ?? []).find((s) => s.id === venueId)?.cardId ?? null;
    if (cardId === null) return;
    setList(
      (venues ?? []).map((s) =>
        s.id !== venueId
          ? s
          : {
              ...s,
              dishIds: on
                ? s.dishIds.includes(dishId)
                  ? s.dishIds
                  : [...s.dishIds, dishId]
                : s.dishIds.filter((id) => id !== dishId),
            }
      )
    );
    if (on) {
      const ownerId = await currentUserId();
      if (!ownerId) return;
      await write(
        'accensione piatto',
        () =>
          supabase
            .from('partner_card_dishes')
            .insert({ card_id: cardId, dish_id: dishId, owner_user_id: ownerId }),
        acceso(venueId, dishId)
      );
    } else {
      await write(
        'spegnimento piatto',
        () =>
          supabase
            .from('partner_card_dishes')
            .delete()
            .eq('card_id', cardId)
            .eq('dish_id', dishId),
        acceso(venueId, dishId)
      );
    }
  }

  return {
    venues,
    create,
    update,
    rename,
    remove,
    restore,
    setDishOn,
    setIdentity,
    setSlug,
    setTableConditions,
  };
}

// Indirizzo scritto senza schema (www.osteria.it): l'app non saprebbe
// aprirlo, quindi lo completiamo noi quando il campo perde il fuoco.
export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed === '' || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// La pill Prenota si accende col link, col telefono o con entrambi
export function hasBooking(booking: BookingLink): boolean {
  return booking.url.trim() !== '' || booking.phone.trim() !== '';
}

// Quante pill compilate ha un locale (riga di riepilogo in lista):
// la prenotazione conta una volta anche con link e telefono insieme
export function countLinks(links: DraftLinks): number {
  return (
    (hasBooking(links.booking) ? 1 : 0) +
    (links.website.trim() !== '' ? 1 : 0) +
    links.deliveries.filter((del) => del.url.trim() !== '').length +
    links.menus.filter((menu) => menu.url.trim() !== '').length
  );
}


// ------------------------------------------------------------------
// IL LOCALE CHE SI STA GUARDANDO
//
// Non è un dato del partner: è dove eravamo rimasti su QUESTA postazione,
// quindi vive nel browser. Ma lo guardano in due — la home, che ha la tendina
// per cambiarlo, e la barra laterale, che ci punta la voce "Scheda
// AllergiApp" — e con due stati separati cambiando locale dalla home la barra
// avrebbe continuato a puntare al precedente. Quindi UNO condiviso, come le
// liste in storage.ts: chi lo cambia lo cambia per tutti.
// ------------------------------------------------------------------
const ULTIMO_LOCALE = 'partner-venue';

let scelto: string | null = null;
const ascoltatori = new Set<() => void>();

function annuncia() {
  for (const ascolta of ascoltatori) ascolta();
}

// Cambiando persona il locale ricordato è di un'altra: si dimentica con
// tutto il resto (v. forgetServerState)
onForget(() => {
  scelto = null;
  try {
    localStorage.removeItem(ULTIMO_LOCALE);
  } catch {
    // storage negato: non c'era niente da dimenticare
  }
  annuncia();
});

export function useVenueChoice() {
  const id = useSyncExternalStore(
    (ascolta) => {
      ascoltatori.add(ascolta);
      return () => ascoltatori.delete(ascolta);
    },
    () => scelto,
    // Sul server non c'è nessun browser da cui sapere dove eravamo rimasti,
    // e rispondere diversamente qui vorrebbe dire due HTML che non combaciano
    () => null
  );

  // La lettura sta in un effetto per la stessa ragione: il primo disegno
  // deve essere identico a quello del server, poi si aggiusta
  useEffect(() => {
    if (scelto !== null) return;
    try {
      const salvato = localStorage.getItem(ULTIMO_LOCALE);
      if (salvato) {
        scelto = salvato;
        annuncia();
      }
    } catch {
      // navigazione privata: si parte dal primo locale
    }
  }, []);

  const scegli = useCallback((venueId: string) => {
    scelto = venueId;
    try {
      localStorage.setItem(ULTIMO_LOCALE, venueId);
    } catch {
      // se non si può ricordare, pazienza: la scelta vale per questa visita
    }
    annuncia();
  }, []);

  return { venueId: id, scegli };
}

// Il locale ricordato può non esistere più (eliminato, o di un'altra persona
// dopo un cambio di account): in quel caso si ricade sul primo. Sta qui e non
// nelle schermate perché la home e la barra laterale devono ricadere sullo
// STESSO, o punterebbero a due locali diversi.
export function currentVenue(venues: Venue[] | null, venueId: string | null): Venue | null {
  return venues?.find((v) => v.id === venueId) ?? venues?.[0] ?? null;
}
