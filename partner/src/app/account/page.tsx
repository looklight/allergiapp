'use client';

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
