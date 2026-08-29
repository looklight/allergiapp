import { useEffect, useState } from 'react';
import { fetchVersionGate, VersionGate } from '../services/appConfig';

/**
 * Check una-tantum al cold start del gate versione (mig 083).
 *
 * Parte "aperto" e resta aperto finche' il server non dice il contrario: l'app
 * non aspetta mai questa risposta per mostrarsi. Nel caso peggiore l'utente
 * vede l'app per un istante prima del muro — preferibile a uno schermo fermo
 * su rete lenta, e comunque il check e' rapido.
 */
export function useVersionGate(): VersionGate {
  const [gate, setGate] = useState<VersionGate>({ blocked: false, recommended: null });

  useEffect(() => {
    let cancelled = false;
    // fetchVersionGate non lancia mai: il catch e' solo cintura di sicurezza.
    fetchVersionGate()
      .then(result => {
        if (!cancelled) setGate(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return gate;
}
