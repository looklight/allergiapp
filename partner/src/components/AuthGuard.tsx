'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import PartnerOnboarding from './PartnerOnboarding';
import { loadPartnerProfile } from '@/lib/partnerProfile';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const { d } = useI18n();
  const router = useRouter();
  // Il profilo partner ora è una riga sul database, quindi va chiesto e
  // aspettato: 'chiedendo' finché non si sa, e non si può indovinare
  const [profile, setProfile] = useState<'chiedendo' | 'assente' | 'presente'>('chiedendo');
  const userId = session?.user?.id;

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [loading, session, router]);

  useEffect(() => {
    if (!userId) return;
    let annullato = false;
    setProfile('chiedendo');
    loadPartnerProfile(userId).then((p) => {
      if (!annullato) setProfile(p ? 'presente' : 'assente');
    });
    return () => {
      annullato = true;
    };
  }, [userId]);

  // La creazione del profilo non emette nessun evento di sessione: è
  // l'onboarding a dire al guard che adesso può passare
  const onCreated = useCallback(() => setProfile('presente'), []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        {d.common.loading}
      </div>
    );
  }

  if (!session) return null;

  if (profile === 'chiedendo') {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        {d.common.loading}
      </div>
    );
  }

  // Essere autenticati non basta: al portale si entra col profilo partner,
  // che è un atto deliberato e non una conseguenza dell'avere un account
  // AllergiApp. Il controllo guarda la riga in partner_accounts, protetta da
  // RLS: è il cancello vero, non un dato che il client può riscriversi.
  if (profile === 'assente') {
    return <PartnerOnboarding session={session} onCreated={onCreated} />;
  }

  return <>{children}</>;
}
