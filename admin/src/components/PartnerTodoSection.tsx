'use client';

// LE ASSOCIAZIONI CHE ASPETTANO NOI, in cima alla Dashboard (richiesta
// dell'utente, 19/09). Compare solo quando c'è qualcosa: una casella fissa
// con «0» smette di essere guardata, e il giorno che conta passa inosservata.
//
// Due cose, perché sono le due che bloccano un ristoratore:
//   - associazioni da approvare: la sua scheda non si vede finché non
//     arriva l'approvazione (724);
//   - richieste in attesa: ristorante già gestito da un altro account, o
//     ritorno dopo una revoca.
// Le prime righe e basta: si decide nella pagina Associazioni, qui si vede
// che c'è da fare. Stesso conteggio del numerino nella barra laterale.
//
// In evidenza ma della stessa famiglia delle altre sezioni della Dashboard
// (richiesta dell'utente, 19/09): la stessa card bianca, il titolo come gli
// altri; a distinguerla bastano la posizione in cima, il pallino ambra e il
// numero. Il fondo giallo gridava più di quanto serva.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const QUANTE = 3;

interface Riga {
  id: string;
  created_at: string;
  locale: string;
  ristorante: string;
}

type Grezza = {
  id: string;
  created_at: string;
  partner_venues: { name: string | null } | null;
  restaurants: { name: string } | null;
};

function righe(data: unknown): Riga[] {
  return ((data as Grezza[] | null) ?? []).map((r) => ({
    id: r.id,
    created_at: r.created_at,
    locale: r.partner_venues?.name?.trim() || 'Locale senza nome',
    ristorante: r.restaurants?.name ?? '',
  }));
}

function data(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

export default function PartnerTodoSection() {
  const [approvare, setApprovare] = useState<{ n: number; righe: Riga[] }>({ n: 0, righe: [] });
  const [richieste, setRichieste] = useState<{ n: number; righe: Riga[] }>({ n: 0, righe: [] });

  useEffect(() => {
    // Le più vecchie in cima: è l'ordine in cui si smaltiscono
    Promise.all([
      supabase
        .from('partner_cards')
        .select('id, created_at, partner_venues(name), restaurants(name)', { count: 'exact' })
        .is('reviewed_at', null)
        .order('created_at', { ascending: true })
        .limit(QUANTE),
      supabase
        .from('partner_card_requests')
        .select('id, created_at, partner_venues(name), restaurants(name)', { count: 'exact' })
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(QUANTE),
    ]).then(([a, r]) => {
      setApprovare({ n: a.count ?? 0, righe: righe(a.data) });
      setRichieste({ n: r.count ?? 0, righe: righe(r.data) });
    });
  }, []);

  if (approvare.n === 0 && richieste.n === 0) return null;

  return (
    <div className="mb-8 bg-card rounded-lg shadow p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-warning" aria-hidden="true" />
          Associazioni partner da gestire
        </h2>
        <Link href="/associations" className="text-sm text-primary hover:underline">
          Apri Associazioni →
        </Link>
      </div>
      <div className="grid md:grid-cols-2 gap-4 mt-3">
        {approvare.n > 0 && <Gruppo titolo="Da approvare" n={approvare.n} righe={approvare.righe} verbo="→" />}
        {richieste.n > 0 && <Gruppo titolo="Richieste in attesa" n={richieste.n} righe={richieste.righe} verbo="chiede" />}
      </div>
    </div>
  );
}

function Gruppo({ titolo, n, righe, verbo }: { titolo: string; n: number; righe: Riga[]; verbo: string }) {
  return (
    <div>
      <p className="text-xs text-faint uppercase tracking-wide">
        {titolo} <span className="font-semibold text-foreground">{n}</span>
      </p>
      <ul className="mt-1.5 space-y-1 text-sm">
        {righe.map((r) => (
          <li key={r.id} className="truncate">
            <span className="text-faint">{data(r.created_at)}</span> · {r.locale}{' '}
            <span className="text-faint">{verbo}</span> {r.ristorante}
          </li>
        ))}
        {n > righe.length && <li className="text-faint">e altre {n - righe.length}</li>}
      </ul>
    </div>
  );
}
