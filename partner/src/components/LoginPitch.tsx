'use client';

// Cosa si può fare qui dentro, detto a chi non è ancora entrato.
//
// Il portale sta fuori dai motori di ricerca (robots.ts) e non ha una pagina
// di presentazione: chi arrivava sull'indirizzo senza sessione si trovava
// davanti a un modulo di accesso che non diceva nemmeno a cosa serve entrare.
// Questa metà della pagina è quella presentazione, e sta QUI e non in una
// pagina a parte: una landing separata sarebbe lo stesso testo da tenere
// allineato in due lingue e in due posti, e chi torna ad accedere — una volta
// al mese — dovrebbe attraversarla ogni volta.
//
// Quattro punti, in quest'ordine: il menù lo fa lui, il cliente lo apre col
// QR, chi ha un'allergia ci trova una cosa che altrove non trova, e in coda
// l'app — che è la seconda cosa, non la prima, e oggi nemmeno completa.
//
// Una riga secca per riquadro: qui si legge in piedi, magari dal telefono, e
// il paragrafo non lo legge nessuno. Chi vuole i dettagli entra.
//
// Corte sì, ma non a costo della verità: il menù NON traduce i nomi dei
// piatti, il filtro RIORDINA e non nasconde (DIGITAL_MENU.md, Tema 18), e
// l'associazione al ristorante è marcata "In arrivo" perché /abbonamenti è
// ancora un tappo.
import { useI18n } from '@/lib/i18n';

// La parte di titolo fra graffe va in verde: è il colore del marchio, e qui
// cade sulle parole che dicono per chi è fatta la cosa. Stessa convenzione di
// EmphasizedText in DishForm — le graffe di fill() in i18n.tsx racchiudono
// invece il NOME di un valore, e le due cose non si incontrano mai nella
// stessa frase.
function Accented({ text }: { text: string }) {
  return (
    <>
      {text.split(/\{|\}/).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="text-[#388E3C]">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

// Un riquadro per cosa, come le card della dashboard: stesso bordo, stesso
// raggio, stessa ombra. Chi entra ritrova la forma che troverà dentro.
//
// Sono alti uguale (flex + h-full) perché affiancati si guardano: due
// riquadri della stessa fila che finiscono a quote diverse sembrano due cose
// di importanza diversa, e qui sono pari.
function Point({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <li className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4CAF50]/10 text-[#388E3C]">
        {icon}
      </span>
      <p className="mt-3 text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-gray-600">{text}</p>
    </li>
  );
}

export default function LoginPitch() {
  const { d } = useI18n();

  return (
    <section className="w-full">
      {/* Due righe dichiarate, non lasciate al caso: ogni pezzo è una frase
          intera e va a capo dove finisce, invece di rompersi dove capita.
          text-balance resta per quando una delle due, sul telefono, deve
          spezzarsi comunque: lì almeno le due porzioni restano pari. */}
      <h2 className="text-2xl font-semibold leading-snug tracking-tight text-gray-900 lg:text-[2rem] lg:leading-[1.2]">
        <span className="block text-balance">{d.pitch.titleLead}</span>
        <span className="block text-balance">
          <Accented text={d.pitch.titleTail} />
        </span>
      </h2>
      <p className="mt-3 max-w-lg text-balance text-sm leading-relaxed text-gray-600">{d.pitch.subtitle}</p>

      {/* Uno sotto l'altro finché la pagina è in colonna, due per fila quando
          diventa a due colonne: quattro riquadri stretti in fila indiana
          sarebbero una lista lunga il doppio del modulo accanto. */}
      <ul className="mt-8 grid gap-4 lg:grid-cols-2">
        <Point
          // L'elenco: le righe di un menù
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h.01M4 12h.01M4 18h.01" />
              <path d="M9 6h11M9 12h11M9 18h7" />
            </svg>
          }
          title={d.pitch.createTitle}
          text={d.pitch.createText}
        />
        <Point
          // Il QR, disegnato per quello che è: i tre quadrati agli angoli
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
              <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
              <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
              <path d="M13.5 13.5h3v3h-3zM20.5 13.5v.01M13.5 20.5v.01M17.5 17.5h3M20.5 20.5h.01" />
            </svg>
          }
          title={d.pitch.qrTitle}
          text={d.pitch.qrText}
        />
        <Point
          // Lo stesso segno del bottone "Filtri" al tavolo: chi l'ha già
          // visto in sala lo riconosce
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M7 12h10M10 17h4" />
            </svg>
          }
          title={d.pitch.filterTitle}
          text={d.pitch.filterText}
        />
        <Point
          // Il segnaposto sulla mappa: la scheda è il locale come lo trova
          // chi lo sta cercando dall'app, non un'altra pagina da compilare
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          }
          title={d.pitch.appTitle}
          text={d.pitch.appText}
        />
      </ul>
    </section>
  );
}
