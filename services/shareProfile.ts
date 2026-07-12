// Compone e attiva lo share di un profilo utente via share sheet nativo.
// Speculare a shareRestaurant.ts; evento Supabase 'profile_shared'.

import { Share, Alert } from 'react-native';
import { SupabaseAnalytics } from './supabaseAnalytics';
import i18n from '../utils/i18n';

const SHARE_BASE_URL = 'https://allergiapp.com/u';

interface ShareProfileInput {
  id: string;
  username?: string | null;
  isAnonymous?: boolean;
}

export async function shareProfile(profile: ShareProfileInput): Promise<void> {
  // Gli anonimi non sono condivisibili (l'URL esporrebbe lo username reale);
  // i chiamanti nascondono già il bottone, questo è il guardrail.
  if (!profile?.username || profile.isAnonymous) {
    if (__DEV__) console.warn('[share] profilo non condivisibile, share aborted');
    return;
  }

  const url = `${SHARE_BASE_URL}/${encodeURIComponent(profile.username)}?ref=share`;
  const message = `${profile.username} — ${i18n.t('share.profileSuffix')}\n${url}`;

  try {
    const result = await Share.share({ message, url }, { dialogTitle: i18n.t('share.profileDialogTitle') });

    // L'utente puo' annullare il share — non e' un errore.
    if (result.action === Share.dismissedAction) return;

    SupabaseAnalytics.track('profile_shared', { profile_id: profile.id });
  } catch (err) {
    if (__DEV__) console.warn('[share] share error', err);
    Alert.alert(i18n.t('common.error'), i18n.t('share.error'));
  }
}
