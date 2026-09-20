'use client';

// È libero questo indirizzo? Lo chiedono in due: la sezione dell'indirizzo in
// fondo all'editor del menù e la finestra della prima pubblicazione (19/09).
// Un posto solo, così dicono sempre la stessa cosa.
//
// Il controllo parte dopo una pausa, non a ogni tasto: chi scrive
// "trattoria" passerebbe per nove indirizzi che non ha mai avuto intenzione di
// usare. Nessun controllo sul PROPRIO indirizzo, che risulterebbe "occupato"
// da sé stesso. La risposta che arriva tardi si butta (`vivo`): scrivendo
// ancora, racconterebbe di un testo che non c'è più nel campo.
import { useEffect, useState } from 'react';
import { slugValido } from './slug';
import { slugOccupato } from './venues';

// Cosa sappiamo del testo nel campo. "ignoto" non è "libero": il controllo
// può non essere riuscito, e le due cose non vanno confuse.
export type SlugStato = 'fermo' | 'controllo' | 'libero' | 'occupato' | 'ignoto' | 'malformato';

export function useSlugCheck(pulita: string, attuale: string) {
  const [stato, setStato] = useState<SlugStato>('fermo');

  useEffect(() => {
    if (attuale === pulita || pulita === '') {
      setStato('fermo');
      return;
    }
    if (!slugValido(pulita)) {
      setStato('malformato');
      return;
    }
    let vivo = true;
    setStato('controllo');
    const attesa = setTimeout(async () => {
      const esito = await slugOccupato(pulita);
      if (!vivo) return;
      setStato(esito === null ? 'ignoto' : esito ? 'occupato' : 'libero');
    }, 500);
    return () => {
      vivo = false;
      clearTimeout(attesa);
    };
  }, [pulita, attuale]);

  // Il database ha l'ultima parola: chi salva e se lo vede rifiutare lo dice
  return { stato, setStato };
}
