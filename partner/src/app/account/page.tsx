'use client';

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function AccountPage() {
  const { session } = useAuth();
  const { d } = useI18n();

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold md:text-2xl">{d.account.title}</h1>

      <div className="max-w-xl space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-1 text-sm font-medium text-gray-700">{d.account.email}</p>
          <p className="text-sm text-gray-600">{session?.user.email}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm font-medium text-gray-700">{d.account.language}</p>
          <LanguageSwitcher />
        </div>

        {/* Gli abbonamenti stanno qui dentro finché sono un tappo: una voce
            nella barra laterale prometteva una sezione, e dietro c'è una
            pagina che non fa ancora niente. */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700">{d.account.subsTitle}</p>
              <p className="mt-0.5 text-xs text-gray-500">{d.account.subsHint}</p>
            </div>
            <Link
              href="/abbonamenti"
              className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              {d.account.subsOpen}
            </Link>
          </div>
        </div>

        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"
        >
          {d.common.signOut}
        </button>
      </div>
    </div>
  );
}
