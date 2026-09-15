// Il titolo e la frase d'apertura delle pagine principali (home, menù,
// piatti, account, abbonamenti, scheda), e l'azione principale della pagina.
//
// Stanno in un posto solo perché prima ogni pagina se li scriveva da sé, con
// le stesse classi copiate — e quando si è voluto dare più respiro ai titoli
// (richiesta dell'utente, 15/09) andavano ritoccati in sei file, col rischio
// di dimenticarne uno. Quello che cambia da pagina a pagina (logo accanto,
// etichetta "in arrivo", distanza dal contenuto sotto) resta alla pagina, via
// className o avvolgendoli.

export function PageTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h1 className={`text-2xl font-semibold tracking-tight text-gray-900 md:text-[1.75rem] md:leading-9 ${className}`}>
      {children}
    </h1>
  );
}

// Larga quanto la pagina: con una larghezza massima le frasi d'apertura, che
// sono di una riga sola, andavano a capo su due righe corte e sembravano un
// paragrafo (provato e scartato dall'utente, 15/09).
// text-pretty e non text-balance: balance divide la frase in righe di pari
// lunghezza, quindi una frase appena più lunga dello spazio diventava due
// mezze righe con metà pagina vuota accanto. pretty riempie la prima riga e
// si limita a non lasciare una parola sola sull'ultima.
export function PageIntro({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`mt-3 text-pretty text-[15px] leading-relaxed text-gray-600 ${className}`}>
      {children}
    </p>
  );
}

// LA RIGA DEL TITOLO CON L'AZIONE PRINCIPALE A DESTRA (richiesta dell'utente,
// 15/09). Il "crea" di una pagina — nuovo piatto, nuovo menù — sta qui, sempre
// nello stesso punto: si trova senza scorrere e non si confonde con gli
// strumenti della lista (ricerca, filtri, selezione), che servono a guardare
// quello che c'è. Prima "Nuovo piatto" stava in fila con la ricerca e "Nuovo
// menù" in fondo all'elenco: due posti per lo stesso gesto.
//
// Solo la riga del titolo: la frase d'apertura va sotto, larga quanto la
// pagina, e non si fa stringere dal bottone.
export function PageTitleRow({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <PageTitle className="min-w-0">{children}</PageTitle>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// Il bottone "crea" delle pagine: nero, col più. Su telefono resta solo il
// più — la parola accanto al titolo lo stringerebbe — e la parola passa
// all'etichetta per chi usa un lettore di schermo.
export function CreateButton({
  label,
  onClick,
  buttonRef,
}: {
  label: string;
  onClick: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      aria-label={label}
      className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 sm:px-4"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
