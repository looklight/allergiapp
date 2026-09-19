import Link from 'next/link';

// Il profilo partner di questa credenziale (727, get_partner_account_admin).
// Email e password sono le stesse per app e portale: chi elimina l'utente
// elimina anche questo, e deve vederlo prima di premere.
export interface PartnerAccount {
  first_name: string;
  last_name: string;
  email: string | null;
  created_at: string;
  venues: number;
  renewing_subscriptions: number;
}

interface Props {
  partner: PartnerAccount;
  // Senza profilo dell'app: questa è tutta la scheda, col pulsante
  standalone: boolean;
  isDeleting: boolean;
  onDelete: () => void;
}

export default function PartnerAccountCard({ partner, standalone, isDeleting, onDelete }: Props) {
  const nome = `${partner.first_name} ${partner.last_name}`.trim();
  const locali = `${partner.venues} ${partner.venues === 1 ? 'locale' : 'locali'}`;

  if (!standalone) {
    return (
      <div className="bg-card rounded-lg shadow px-6 py-3 mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary-soft text-primary-soft-foreground">
          Anche partner
        </span>
        <span>{nome}</span>
        <span className="text-faint">·</span>
        <span className="text-muted-foreground">{locali}</span>
        {partner.renewing_subscriptions > 0 && (
          <>
            <span className="text-faint">·</span>
            <span className="text-muted-foreground">abbonamento in corso</span>
          </>
        )}
        <Link href="/partners" className="ml-auto text-primary hover:underline">
          Vedi in Partner
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow p-6 mt-4 mb-6">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold min-w-0 break-words">{nome || 'Senza nome'}</h1>
          <p className="text-sm mt-1">
            {partner.email && <span className="text-muted-foreground">{partner.email}</span>}
            {partner.email && <span className="text-faint"> · </span>}
            <span className="text-faint">
              Iscritto al portale il {new Date(partner.created_at).toLocaleDateString('it-IT')}
            </span>
          </p>
          <p className="text-sm text-muted-foreground mt-3">
            Iscritto solo al portale partner: non ha un profilo nell&apos;app.
          </p>
          <p className="text-sm mt-1">
            {locali}
            {partner.renewing_subscriptions > 0 && ' · abbonamento in corso'}
            {' · '}
            <Link href="/partners" className="text-primary hover:underline">
              Vedi in Partner
            </Link>
          </p>
        </div>

        <button
          onClick={onDelete}
          disabled={isDeleting}
          title="Elimina account"
          aria-label="Elimina account"
          className="shrink-0 inline-flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 text-sm text-danger border border-danger-border rounded hover:bg-danger-soft disabled:opacity-50 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
          <span className="hidden sm:inline">{isDeleting ? 'Eliminazione...' : 'Elimina account'}</span>
        </button>
      </div>
    </div>
  );
}
