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

// Contatori anonimi (mig 082): nomi ammessi dalla whitelist di bump_daily_counter.
export type DailyCounterName = 'card_opened';

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
   * Contatori ANONIMI (mig 082): incrementano un aggregato (nome, giorno)
   * senza alcun dato personale, quindi NON passano dal gate del consenso —
   * contano tutti gli utenti. Fire-and-forget come track().
   */
  bumpDailyCounter(name: DailyCounterName): void {
    if (__DEV__) {
      console.log('[SupabaseAnalytics] bumpDailyCounter', name);
      return;
    }
    supabase
      .rpc('bump_daily_counter', { p_name: name })
      .then(() => undefined, (err) => {
        if (__DEV__) console.warn('[SupabaseAnalytics] bump failed', name, err);
      });
  },

  /** Aperture scheda per ristorante, anch'esse anonime (vedi bumpDailyCounter). */
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
