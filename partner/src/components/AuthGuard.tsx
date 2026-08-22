'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import PartnerOnboarding from './PartnerOnboarding';
import { hasPartnerProfile } from '@/lib/partnerProfile';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const { d } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [loading, session, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        {d.common.loading}
      </div>
    );
  }

  if (!session) return null;

  // Essere autenticati non basta: al portale si entra col profilo partner,
  // che è un atto deliberato e non una conseguenza dell'avere un account
  // AllergiApp. Oggi il controllo guarda i metadati dell'utente; con la
  // migration 700 diventerà la riga in partner_accounts (cancello vero,
  // protetto da RLS invece che da un dato modificabile dal client).
  if (!hasPartnerProfile(session)) {
    return <PartnerOnboarding session={session} />;
  }

  return <>{children}</>;
}
