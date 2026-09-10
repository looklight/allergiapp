// Wrapper analytics su Supabase: incanala i nuovi eventi sulla RPC track_event
// (tabella analytics_events). Sostituisce nuovi tracking su Firebase Analytics
// per la strategia "no nuovi eventi su Firebase" (memory: project_firebase_removal).
//
// Caratteristiche:
// - consent-gated allo stesso modo di services/analytics.ts (ATT iOS + GDPR)
// - fire-and-forget: non blocca l'utente se la RPC fallisce o la rete e' giu'
// - in dev logga su console invece di chiamare la RPC, per non sporcare la
//   tabella analytics_events con eventi di sviluppo

import { supabase } from './supabase';
import type { TrackingConsent } from '../types';

// Catalogo eventi tipizzato. Aggiungere qui prima di chiamare track().
export type EventName =
  | 'onboarding_completed'
  | 'location_permission_prompted'
  | 'restaurant_viewed'
  | 'restaurant_search'
  | 'review_created'
  | 'sign_in'
  | 'restaurant_shared'
  | 'user_followed'
  | 'user_unfollowed'
  | 'user_blocked'
  | 'user_search'
  | 'profile_shared'
  | 'profile_link_copied'
  | 'followed_filter_enabled'
  | 'list_published'
  | 'list_unpublished'
  | 'filter_applied';

type EventProperties = Record<string, string | number | boolean | null | string[]>;

// Contatori anonimi con una dimensione (mig 086): nomi ammessi dalla whitelist
// di bump_daily_dimensions. Una chiave per esigenza, MAI la combinazione — vedi
// il commento in testa alla migration.
export type DimensionName = 'card_need' | 'card_language' | 'filter_need';

let isTrackingAuthorized = false;

export const SupabaseAnalytics = {
  setTrackingConsent(consent: TrackingConsent) {
    isTrackingAuthorized = consent.status === 'authorized';
    if (__DEV__) {
      console.log(`[SupabaseAnalytics] Tracking authorized: ${isTrackingAuthorized}`);
    }
  },

  isAuthorized(): boolean {
    return isTrackingAuthorized;
  },

  /**
   * Tracca un evento. Fire-and-forget: non aspettiamo la risposta.
   * In dev logga solo a console (no chiamata RPC).
   */
  track(name: EventName, properties?: EventProperties): void {
    if (!isTrackingAuthorized) return;

    // Difesa best-effort: la RPC blocca event_name > 100 char.
    if (name.length > 100) return;

    if (__DEV__) {
      console.log('[SupabaseAnalytics] track', name, properties ?? {});
      return;
    }

    supabase
      .rpc('track_event', {
        p_event_name: name,
        p_properties: properties ?? {},
      })
      .then(() => undefined, (err) => {
        // Errori silenziati: analytics non deve mai degradare l'UX.
        if (__DEV__) console.warn('[SupabaseAnalytics] track failed', name, err);
      });
  },

  /**
   * Contatori con una dimensione (mig 086): incrementano (nome, giorno, chiave)
   * senza alcun dato personale, quindi NON passano dal gate del consenso —
   * contano tutti gli utenti. Una sola chiamata per tutte le chiavi; i
   * duplicati li scarta la RPC.
   */
  bumpDimensions(name: DimensionName, keys: string[]): void {
    if (keys.length === 0) return;
    if (__DEV__) {
      console.log('[SupabaseAnalytics] bumpDimensions', name, keys);
      return;
    }
    supabase
      .rpc('bump_daily_dimensions', { p_name: name, p_keys: keys })
      .then(() => undefined, (err) => {
        if (__DEV__) console.warn('[SupabaseAnalytics] bumpDimensions failed', name, err);
      });
  },

  /**
   * Apertura della card (mig 086): totale + esigenze + lingua in UN round trip.
   * Incrementa anche daily_counters 'card_opened' lato server, quindi il widget
   * storico continua a funzionare: non aggiungere una seconda chiamata per il
   * totale, o conterebbe due volte. Anonima come sopra.
   */
  bumpCardOpen(needs: string[], language: string): void {
    if (__DEV__) {
      console.log('[SupabaseAnalytics] bumpCardOpen', language, needs);
      return;
    }
    supabase
      .rpc('bump_card_open', { p_needs: needs, p_language: language })
      .then(() => undefined, (err) => {
        if (__DEV__) console.warn('[SupabaseAnalytics] bumpCardOpen failed', err);
      });
  },

  /** Aperture scheda per ristorante, anch'esse anonime (vedi bumpDimensions). */
  bumpRestaurantView(restaurantId: string): void {
    if (__DEV__) {
      console.log('[SupabaseAnalytics] bumpRestaurantView', restaurantId);
      return;
    }
    supabase
      .rpc('bump_restaurant_view', { p_restaurant_id: restaurantId })
      .then(() => undefined, (err) => {
        if (__DEV__) console.warn('[SupabaseAnalytics] bump failed', restaurantId, err);
      });
  },
};
