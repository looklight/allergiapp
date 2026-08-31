'use client';

// Le vetrine del partner: una per locale, con i suoi link e i piatti accesi.
// Dal 30/08 vivono nelle tabelle partner_* invece che nel localStorage.
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
function fromLinks(showcaseId: string, links: DraftLinks) {
  const righe: Record<string, unknown>[] = [];
  const booking = links.booking;
  if (booking.url.trim() !== '' || booking.phone.trim() !== '') {
    righe.push({
      showcase_id: showcaseId,
      kind: 'booking',
      url: booking.url.trim() || null,
      phone: booking.phone.trim() || null,
    });
  }
  if (links.website.trim() !== '') {
    righe.push({ showcase_id: showcaseId, kind: 'website', url: links.website.trim() });
  }
  links.deliveries.forEach((del, i) => {
    if (del.url.trim() === '') return;
    righe.push({
      showcase_id: showcaseId,
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
      showcase_id: showcaseId,
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
  const { data, error } = await supabase
    .from('partner_showcases')
    .select('id, venue_name, partner_links(*), partner_showcase_dishes(dish_id)')
    .order('created_at', { ascending: true });
  reportError('lettura vetrine', error);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    venueName: row.venue_name ?? '',
    dishIds: (row.partner_showcase_dishes ?? []).map((d: any) => d.dish_id),
    links: toLinks(row.partner_links),
  }));
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
      'salvataggio nome vetrina',
      () =>
        supabase
          .from('partner_showcases')
          .update({ venue_name: nome })
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
      () => supabase.from('partner_links').delete().eq('showcase_id', showcase.id),
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
  const { list: showcases, setList, reload } = useRemoteList('vetrine', loadShowcases);
  // L'editor cambia la bozza a ogni tasto: si scrive dopo la pausa
  const { schedule } = useDebouncedSave(saveShowcaseContent);

  async function create(venueName = ''): Promise<Showcase | null> {
    const ownerId = await currentUserId();
    if (!ownerId) return null;
    const { data } = await write('creazione vetrina', () =>
      supabase
        .from('partner_showcases')
        .insert({ owner_user_id: ownerId, venue_name: venueName })
        .select('id')
        .single()
    );
    if (!data) return null;
    const creata: Showcase = { id: data.id, venueName, dishIds: [], links: emptyLinks() };
    // La barra laterale elenca le vetrine e guarda questa stessa lista:
    // aggiornandola qui si aggiorna anche là, senza tornare al server
    setList([...(showcases ?? []), creata]);
    return creata;
  }

  // Contenuto della vetrina: nome e link. NON tocca i piatti accesi, che
  // passano da setDishOn — l'editor non li cambia mai per questa strada.
  function update(id: string, draft: ShowcaseDraft) {
    const next = (showcases ?? []).map((s) => (s.id === id ? { ...draft, id } : s));
    setList(next);
    const aggiornata = next.find((s) => s.id === id);
    if (aggiornata) schedule(aggiornata);
  }

  function rename(id: string, venueName: string) {
    setList((showcases ?? []).map((s) => (s.id === id ? { ...s, venueName } : s)));
    void write(
      'rinomina vetrina',
      () => supabase.from('partner_showcases').update({ venue_name: venueName }).eq('id', id),
      `nome:${id}`
    );
  }

  function remove(id: string) {
    setList((showcases ?? []).filter((s) => s.id !== id));
    void write('eliminazione vetrina', () =>
      supabase.from('partner_showcases').delete().eq('id', id)
    );
  }

  // Ripristino dopo l'undo: la vetrina torna com'era, id compreso, così i
  // link e i piatti accesi si riattaccano alla stessa riga. Torna anche al
  // suo posto nella lista, perché l'ordine è quello di creazione.
  async function restore(showcase: Showcase) {
    const ownerId = await currentUserId();
    if (!ownerId) return;
    await write('ripristino vetrina', () =>
      supabase
        .from('partner_showcases')
        .insert({ id: showcase.id, owner_user_id: ownerId, venue_name: showcase.venueName })
    );
    const righe = fromLinks(showcase.id, showcase.links);
    if (righe.length > 0) {
      await write('ripristino link', () => supabase.from('partner_links').insert(righe));
    }
    if (showcase.dishIds.length > 0) {
      await write('ripristino piatti in vetrina', () =>
        supabase.from('partner_showcase_dishes').insert(
          showcase.dishIds.map((dishId) => ({
            showcase_id: showcase.id,
            dish_id: dishId,
            owner_user_id: ownerId,
          }))
        )
      );
    }
    await reload();
  }

  // Accende o spegne un piatto in una vetrina: una riga che c'è o non c'è.
  // Accendere e spegnere condividono la chiave, pur essendo due scritture
  // opposte: sono lo stesso interruttore, e dopo due tocchi rapidi da
  // rifare c'è solo l'ultimo.
  async function setDishOn(showcaseId: string, dishId: string, on: boolean) {
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
            .from('partner_showcase_dishes')
            .insert({ showcase_id: showcaseId, dish_id: dishId, owner_user_id: ownerId }),
        acceso(showcaseId, dishId)
      );
    } else {
      await write(
        'spegnimento piatto',
        () =>
          supabase
            .from('partner_showcase_dishes')
            .delete()
            .eq('showcase_id', showcaseId)
            .eq('dish_id', dishId),
        acceso(showcaseId, dishId)
      );
    }
  }

  return { showcases, create, update, rename, remove, restore, setDishOn };
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
