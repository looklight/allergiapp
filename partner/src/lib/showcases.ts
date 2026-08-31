'use client';

// Il LOCALE del partner: nome, link, e i piatti accesi sulla sua scheda
// AllergiApp. Dal 30/08 vive nelle tabelle partner_*; dal 31/08 la tabella si
// chiama partner_venues (migration 703).
//
// ⚠️ Il tipo qui dentro si chiama ancora Showcase e le schermate dicono
// ancora "vetrina": la rinomina è un passo a sé, deliberatamente separato da
// questo — qui si è solo rimesso il codice in pari col database nuovo, e
// mescolare un guasto da riparare con un cambio di parole vuol dire non
// sapere più quale dei due ha rotto cosa.
//
// COSA È CAMBIATO SOTTO (703): i piatti accesi non pendono più dal locale ma
// dalla SCHEDA AllergiApp, che esiste solo dopo aver associato un ristorante.
// Senza scheda non c'è niente da accendere, e `cardId` è null: le schermate
// devono spegnere quei comandi invece di far scrivere a vuoto.
import { supabase } from './supabase';
import { currentUserId, onForget, reportError, useDebouncedSave, useRemoteList } from './storage';
import { write } from './saveState';

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

export interface ShowcaseDraft {
  // Nome che il partner dà alla vetrina per riconoscerla nella sua lista.
  // NON è il nome del locale: quello arriva dalla scheda con il claim.
  venueName: string;
  // Piatti del catalogo accesi in questa vetrina. È l'UNICO stato di
  // disponibilità: spegnerne uno qui non lo tocca nelle altre vetrine.
  dishIds: string[];
  links: DraftLinks;
}

export interface Showcase extends ShowcaseDraft {
  id: string;
  // L'identità che il cliente vede in cima al menù. Sta qui e non in un
  // modulo suo perché è la STESSA riga che questo file legge già: due
  // interrogazioni sulla stessa tabella sono esattamente quello che il
  // livello dati condiviso è stato scritto per togliere.
  logoUrl: string; // vuoto = compare quello di AllergiApp
  accent: string;  // codice da MENU_ACCENTS
  // La scheda AllergiApp di questo locale, se esiste. null = nessun
  // ristorante associato, quindi nessun posto dove accendere i piatti.
  cardId: string | null;
}

// La chiave del piatto acceso in una vetrina, condivisa fra accensione e
// spegnimento (v. setDishOn)
function acceso(showcaseId: string, dishId: string) {
  return `in-vetrina:${showcaseId}:${dishId}`;
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

// Una query sola con gli innesti: vetrine, i loro link e gli id dei piatti
// accesi. Le RLS mostrano solo le proprie, quindi non serve filtrare.
async function loadShowcases(): Promise<Showcase[]> {
  // Un innesto in più rispetto a prima: i piatti accesi stanno sotto la
  // scheda, non sotto il locale. La scheda è al massimo una (indice unico
  // sul ristorante), quindi si prende la prima e basta.
  const { data, error } = await supabase
    .from('partner_venues')
    .select('id, name, logo_url, accent, partner_links(*), partner_cards(id, partner_card_dishes(dish_id))')
    .order('created_at', { ascending: true });
  reportError('lettura locali', error);

  return (data ?? []).map((row: any) => {
    const card = (row.partner_cards ?? [])[0] ?? null;
    return {
      id: row.id,
      venueName: row.name ?? '',
      logoUrl: row.logo_url ?? '',
      accent: row.accent ?? 'charcoal',
      cardId: card?.id ?? null,
      dishIds: (card?.partner_card_dishes ?? []).map((d: any) => d.dish_id),
      links: toLinks(row.partner_links),
    };
  });
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// Cosa è già stato scritto per ogni vetrina, per non riscrivere ciò che non è
// cambiato. Scrivendo il nome si fa una pausa a ogni parola, e senza questo
// ogni pausa porterebbe con sé anche la cancellazione e la riscrittura di
// TUTTI i link, che non c'entrano niente. Parte vuota a ogni apertura: cosa
// c'è sul server non lo sappiamo, e la prima scrittura lo mette in chiaro.
const ultimoSalvato = new Map<string, { nome: string; link: string }>();
onForget(() => ultimoSalvato.clear());

// Il contenuto di una vetrina si riscrive tutto: i link sono pochi, l'ordine
// conta, e calcolare la differenza costerebbe più di quanto faccia risparmiare.
// Quello che si evita è riscrivere un blocco che non è stato toccato affatto.
async function saveShowcaseContent(showcase: Showcase) {
  const righe = fromLinks(showcase.id, showcase.links);
  const nome = showcase.venueName;
  const link = JSON.stringify(righe);
  const precedente = ultimoSalvato.get(showcase.id);
  // Si segna come scritto solo ciò che il server ha accettato: dandolo per
  // buono a prescindere, una scrittura rifiutata verrebbe saltata anche la
  // volta dopo e il dato non arriverebbe mai
  const fatto = { nome: precedente?.nome ?? '\u0000', link: precedente?.link ?? '\u0000' };

  if (precedente?.nome !== nome) {
    const { error } = await write(
      'salvataggio nome locale',
      () =>
        supabase
          .from('partner_venues')
          .update({ name: nome })
          .eq('id', showcase.id),
      // Stessa chiave che usa rename() dalla lista: è lo stesso campo della
      // stessa riga, e fra due modi di scriverlo vale l'ultimo
      `nome:${showcase.id}`
    );
    if (!error) fatto.nome = nome;
  }

  if (precedente?.link !== link) {
    const { error: cancellati } = await write(
      'cancellazione link',
      () => supabase.from('partner_links').delete().eq('venue_id', showcase.id),
      `link-cancella:${showcase.id}`
    );
    let scritti = null;
    if (righe.length > 0) {
      ({ error: scritti } = await write(
        'scrittura link',
        () => supabase.from('partner_links').insert(righe),
        `link-scrivi:${showcase.id}`
      ));
    }
    if (!cancellati && !scritti) fatto.link = link;
  }

  ultimoSalvato.set(showcase.id, fatto);
}

// showcases è null finché la prima lettura non è tornata
export function useShowcases() {
  const { list: showcases, setList, reload } = useRemoteList('locali', loadShowcases);
  // L'editor cambia la bozza a ogni tasto: si scrive dopo la pausa
  const { schedule } = useDebouncedSave(saveShowcaseContent);

  async function create(venueName = ''): Promise<Showcase | null> {
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
    const creata: Showcase = {
      id: data.id,
      venueName,
      logoUrl: '',
      accent: 'charcoal',
      cardId: null,
      dishIds: [],
      links: emptyLinks(),
    };
    // La barra laterale elenca le vetrine e guarda questa stessa lista:
    // aggiornandola qui si aggiorna anche là, senza tornare al server
    setList([...(showcases ?? []), creata]);
    return creata;
  }

  // Contenuto della vetrina: nome e link. NON tocca i piatti accesi, che
  // passano da setDishOn — l'editor non li cambia mai per questa strada.
  function update(id: string, draft: ShowcaseDraft) {
    // cardId non sta nella bozza (l'editor non lo tocca) e va conservato,
    // o salvando il nome si perderebbe la scheda associata
    const next = (showcases ?? []).map((s) =>
      s.id === id ? { ...draft, id, cardId: s.cardId, logoUrl: s.logoUrl, accent: s.accent } : s
    );
    setList(next);
    const aggiornata = next.find((s) => s.id === id);
    if (aggiornata) schedule(aggiornata);
  }

  function rename(id: string, venueName: string) {
    setList((showcases ?? []).map((s) => (s.id === id ? { ...s, venueName } : s)));
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
  function setIdentity(id: string, next: Partial<Pick<Showcase, 'logoUrl' | 'accent'>>) {
    setList((showcases ?? []).map((s) => (s.id === id ? { ...s, ...next } : s)));
    const riga: Record<string, unknown> = {};
    if (next.logoUrl !== undefined) riga.logo_url = next.logoUrl || null;
    if (next.accent !== undefined) riga.accent = next.accent;
    void write(
      'salvataggio aspetto del locale',
      () => supabase.from('partner_venues').update(riga).eq('id', id),
      `aspetto:${id}`
    );
  }

  function remove(id: string) {
    setList((showcases ?? []).filter((s) => s.id !== id));
    void write('eliminazione locale', () =>
      supabase.from('partner_venues').delete().eq('id', id)
    );
  }

  // Ripristino dopo l'undo: la vetrina torna com'era, id compreso, così i
  // link e i piatti accesi si riattaccano alla stessa riga. Torna anche al
  // suo posto nella lista, perché l'ordine è quello di creazione.
  async function restore(showcase: Showcase) {
    const ownerId = await currentUserId();
    if (!ownerId) return;
    await write('ripristino locale', () =>
      supabase
        .from('partner_venues')
        .insert({
          id: showcase.id,
          owner_user_id: ownerId,
          name: showcase.venueName,
          logo_url: showcase.logoUrl || null,
          accent: showcase.accent,
        })
    );
    const righe = fromLinks(showcase.id, showcase.links);
    if (righe.length > 0) {
      await write('ripristino link', () => supabase.from('partner_links').insert(righe));
    }
    // I piatti accesi tornano sulla SCHEDA, non sul locale — e solo se la
    // scheda c'è ancora. Senza, non si perde niente di importante: i piatti
    // vivono nel catalogo, qui c'era solo dove comparivano.
    if (showcase.cardId !== null && showcase.dishIds.length > 0) {
      await write('ripristino piatti sulla scheda', () =>
        supabase.from('partner_card_dishes').insert(
          showcase.dishIds.map((dishId) => ({
            card_id: showcase.cardId,
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
  async function setDishOn(showcaseId: string, dishId: string, on: boolean) {
    const cardId = (showcases ?? []).find((s) => s.id === showcaseId)?.cardId ?? null;
    if (cardId === null) return;
    setList(
      (showcases ?? []).map((s) =>
        s.id !== showcaseId
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
        acceso(showcaseId, dishId)
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
        acceso(showcaseId, dishId)
      );
    }
  }

  return { showcases, create, update, rename, remove, restore, setDishOn, setIdentity };
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

// Quante pill compilate ha una vetrina (riga di riepilogo in lista):
// la prenotazione conta una volta anche con link e telefono insieme
export function countLinks(links: DraftLinks): number {
  return (
    (hasBooking(links.booking) ? 1 : 0) +
    (links.website.trim() !== '' ? 1 : 0) +
    links.deliveries.filter((del) => del.url.trim() !== '').length +
    links.menus.filter((menu) => menu.url.trim() !== '').length
  );
}
