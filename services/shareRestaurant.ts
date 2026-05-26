// Compone e attiva lo share di un ristorante via share sheet nativo iOS/Android.
// Tracciato come evento Supabase 'restaurant_shared' (no Firebase per nuovi eventi).

import { Share, Alert } from 'react-native';
import { SupabaseAnalytics } from './supabaseAnalytics';
import i18n from '../utils/i18n';

const SHARE_BASE_URL = 'https://allergiapp.com/r';

interface ShareRestaurantInput {
  id: string;
  /** Lo slug puo' essere undefined quando il ristorante viene da una RPC che non lo proietta. */
  slug?: string | null;
  name: string;
  city?: string | null;
}

export async function shareRestaurant(restaurant: ShareRestaurantInput): Promise<void> {
  if (!restaurant?.slug) {
    // No-op silenzioso: senza slug non possiamo costruire l'URL share.
    if (__DEV__) console.warn('[share] missing slug, share aborted');
    return;
  }

  const url = `${SHARE_BASE_URL}/${encodeURIComponent(restaurant.slug)}?ref=share`;
  const headline = restaurant.city
    ? `${restaurant.name}, ${restaurant.city}`
    : restaurant.name;
  const message = `${headline} — ${i18n.t('share.suffix')}\n${url}`;

  try {
    const result = await Share.share({ message, url }, { dialogTitle: i18n.t('share.dialogTitle') });

    // L'utente puo' annullare il share — non e' un errore.
    if (result.action === Share.dismissedAction) return;

    SupabaseAnalytics.track('restaurant_shared', {
      restaurant_id: restaurant.id,
      slug: restaurant.slug,
    });
  } catch (err) {
    if (__DEV__) console.warn('[share] share error', err);
    Alert.alert(i18n.t('common.error'), i18n.t('share.error'));
  }
}
