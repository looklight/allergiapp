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
  | 'restaurant_shared';

type EventProperties = Record<string, string | number | boolean | null>;

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
};
