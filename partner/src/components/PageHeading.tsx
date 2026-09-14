// Il titolo e la frase d'apertura delle pagine principali (home, menù,
// piatti, account, abbonamenti, scheda).
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
