'use client';

// La finestra che si apre su "Nuovo menù".
//
// LA DOMANDA È IL RISTORANTE, NON IL MENÙ. Un menù non è "la Carta": è il menù
// DI un locale, e il nome che conta — quello che il cliente legge in cima alla
// pagina e da cui uscirà l'indirizzo pubblico — è quello del ristorante.
// Il nome del menù è solo l'etichetta della linguetta, e serve a distinguerlo
// dagli altri: quindi si chiede SOLO dal secondo menù dello stesso locale in
// poi. Al primo non c'è niente da distinguere, e sarebbe una domanda in più
// prima di aver visto qualcosa.
//
// Il ristorante non c'è nessun altro modo di saperlo: chi non associa una
// scheda AllergiApp non ha nessun nome da nessuna parte (v. Tema 16).
import { useId, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useModal } from '@/lib/useModal';
import type { Venue } from '@/lib/venues';
import type { Menu } from '@/lib/menus';

// Valore della tendina che vuol dire "non è nessuno di questi"
const NUOVO = 'nuovo';

export default function NewMenuDialog({
  venues,
  fixed,
  menusOf,
  onCancel,
  onCreate,
}: {
  venues: Venue[];
  // Il locale già deciso da chi ha aperto la finestra: dalla home ci si sta
  // dentro, quindi la tendina non ha niente da chiedere. Resta solo quello
  // che qui ancora manca — il nome del menù, o quello del locale se è vuoto.
  fixed?: Venue | null;
  // i menù di quel locale: da uno in su il nome serve a distinguerli, e se
  // quello che c'è già non ce l'ha va chiesto adesso (v. senzaNome)
  menusOf: (venueId: string) => Menu[];
  onCancel: () => void;
  // venueId null = va creato, col nome scritto qui.
  // rename = il menù che c'era già, battezzato qui perché adesso serve.
  onCreate: (
    venueId: string | null,
    venueName: string,
    menuName: string,
    rename?: { id: string; name: string }
  ) => void;
}) {
  const { d } = useI18n();
  const panel = useModal<HTMLDivElement>(onCancel);
  const titleId = useId();
  const venueField = useId();
  const menuField = useId();

  // Con un locale solo si parte da quello: la tendina esiste per chi ne ha di
  // più, e a chi ne ha uno non deve chiedere niente.
  const [scelto, setScelto] = useState<string>(fixed?.id ?? venues[0]?.id ?? NUOVO);
  const [nuovoNome, setNuovoNome] = useState('');
  // Vuoto, non "Carta": il nome si chiede SOLO quando c'è già un menù da cui
  // distinguere questo, e proporre lo stesso nome del primo è il contrario di
  // quello che serve
  const [menuName, setMenuName] = useState('');
  const [nomeEsistente, setNomeEsistente] = useState('');

  const locale = venues.find((v) => v.id === scelto) ?? null;
  // Un locale può esistere senza nome (prima della 703 non lo si chiedeva):
  // in quel caso si chiede adesso, perché senza il menù non ha intestazione.
  const serveNome = locale === null || locale.venueName.trim() === '';
  // Il nome del menù solo quando c'è già qualcosa da cui distinguerlo
  const esistenti = locale === null ? [] : menusOf(locale.id);
  const serveNomeMenu = esistenti.length > 0;
  // …e se quello che c'è già è rimasto senza nome, adesso ne ha bisogno pure
  // lui: da qui in poi sono due linguette accanto, e una senza nome sarebbe
  // l'unica cosa che il cliente non sa scegliere.
  const senzaNome = esistenti.find((m) => m.name.trim() === '') ?? null;
  // Non si conferma finché non c'è la risposta alla domanda che si è fatta:
  // se il nome del menù serve, serve davvero
  const pronto =
    (!serveNome || nuovoNome.trim() !== '') &&
    (!serveNomeMenu || menuName.trim() !== '') &&
    (senzaNome === null || nomeEsistente.trim() !== '');

  function conferma() {
    if (!pronto) return;
    onCreate(
      locale?.id ?? null,
      serveNome ? nuovoNome.trim() : locale!.venueName,
      // senza nome si resta senza: il primo menù non ne ha bisogno, e
      // inventargliene uno vuol dire farglielo cancellare
      serveNomeMenu ? menuName.trim() : '',
      senzaNome ? { id: senzaNome.id, name: nomeEsistente.trim() } : undefined
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="backdrop-enter absolute inset-0 bg-black/40" />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="dialog-enter relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-semibold text-gray-900">
          {d.menus.create}
        </h2>

        {/* La tendina compare solo se c'è davvero una scelta da fare: con un
            locale solo non c'è niente da scegliere, e "+ Un altro locale" ha
            comunque una strada dedicata dalla home (NewVenueDialog). */}
        {venues.length > 1 && !fixed && (
          <div className="mt-4">
            <label htmlFor={venueField} className="mb-1 block text-sm font-medium text-gray-700">
              {d.menus.forVenue}
            </label>
            <select
              id={venueField}
              value={scelto}
              onChange={(e) => setScelto(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.venueName.trim() || d.home.unnamed}
                </option>
              ))}
              <option value={NUOVO}>{d.menus.newVenue}</option>
            </select>
          </div>
        )}

        {serveNome && (
          <div className="mt-4">
            <label htmlFor={`${venueField}-nome`} className="mb-1 block text-sm font-medium text-gray-700">
              {d.menus.venueNameLabel}
            </label>
            <input
              id={`${venueField}-nome`}
              type="text"
              value={nuovoNome}
              autoFocus
              onChange={(e) => setNuovoNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && conferma()}
              placeholder={d.menus.venuePlaceholder}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">{d.menus.venueHint}</p>
          </div>
        )}

        {serveNomeMenu && (
          <div className="mt-4">
            <label htmlFor={menuField} className="mb-1 block text-sm font-medium text-gray-700">
              {d.menus.menuNameLabel}
            </label>
            <input
              id={menuField}
              type="text"
              value={menuName}
              autoFocus={!serveNome}
              onChange={(e) => setMenuName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && conferma()}
              placeholder={d.menuEditor.namePlaceholder}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">{d.menus.menuNameHint}</p>
          </div>
        )}

        {senzaNome && (
          <div className="mt-4">
            <label htmlFor={`${menuField}-esistente`} className="mb-1 block text-sm font-medium text-gray-700">
              {d.menus.existingNameLabel}
            </label>
            <input
              id={`${menuField}-esistente`}
              type="text"
              value={nomeEsistente}
              onChange={(e) => setNomeEsistente(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && conferma()}
              placeholder={d.menus.existingNamePlaceholder}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">{d.menus.existingNameHint}</p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            {d.common.cancel}
          </button>
          <button
            onClick={conferma}
            disabled={!pronto}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-900"
          >
            {d.menus.create}
          </button>
        </div>
      </div>
    </div>
  );
}
