/**
 * useMapClusters — clustering client-side dei pin generici via `supercluster`.
 *
 * Strada B (vedi memoria project_map_clustering): alimentiamo supercluster
 * direttamente con i pin del viewport (`allPins`, già sorgente scalabile), e
 * calcoliamo il colore del cluster dalla STESSA logica di copertura dei pallini
 * (`getExpandedCoverage`) → una sola sorgente di verità. Il colore (miglior match
 * tra le foglie) è aggregato al momento dell'indice via map/reduce, niente
 * getLeaves a runtime.
 *
 * NON gestisce salvati/preferiti/selezionato: quelli restano sempre individuali
 * e sopra le bolle (esclusi a monte dal chiamante). Vedi RestaurantMap.
 */
import { useMemo } from 'react';
import Supercluster from 'supercluster';
import { getExpandedCoverage } from '../../constants/restrictionImplications';
import { isValidCoord, type Region } from './mapConstants';
import type { RestaurantPin } from '../../services/restaurantService';

// Parametri best-practice di PARTENZA — da tarare a runtime su device reale
// (è la regola d'arte: non si fissano a tavolino). Vedi memoria.
// radius: distanza in px entro cui i pin si fondono.
// minPoints: pin minimi perché si formi una bolla; sotto questa soglia restano
//   pallini singoli. 4 = i posti isolati/piccoli gruppi restano visibili, le
//   bolle compaiono solo dove c'è vera densità (e sovrapposizione a schermo).
export const CLUSTER_RADIUS = 60;
export const CLUSTER_MIN_POINTS = 4;
export const CLUSTER_MAX_ZOOM = 20;

/** Punteggio match di un pin: 0 = nessun filtro attivo, 1 = grigio (zero match),
 *  2 = ambra (parziale), 3 = verde (pieno). Allineato alla logica dei pallini in
 *  MapPin (conteggio esigenze coperte su `getExpandedCoverage`). */
function pinScore(pin: RestaurantPin, userNeeds: string[], showMatchInfo: boolean): number {
  if (!showMatchInfo || userNeeds.length === 0) return 0;
  const expanded = getExpandedCoverage([
    ...(pin.supported_allergens ?? []),
    ...(pin.supported_diets ?? []),
  ]);
  let covered = 0;
  for (const n of userNeeds) if (expanded.has(n)) covered++;
  if (covered === 0) return 1;
  return covered >= userNeeds.length ? 3 : 2;
}

type PointProps = { pinId: string; score: number };
type ClusterProps = { score: number };

export type MapCluster = {
  key: string;
  latitude: number;
  longitude: number;
  /** miglior match (max) tra le foglie del cluster, 0..3 */
  score: number;
  count: number;
};

export type MapClusterResult =
  | { kind: 'cluster'; data: MapCluster }
  | { kind: 'point'; pinId: string; latitude: number; longitude: number };

/** zoom tile standard ≈ log2(360 / longitudeDelta), clampato al range valido. */
function regionToZoom(region: Region): number {
  const z = Math.round(Math.log2(360 / Math.max(region.longitudeDelta, 1e-6)));
  return Math.max(0, Math.min(CLUSTER_MAX_ZOOM, z));
}

/**
 * @param pins      pin GENERICI (allPins meno salvati/preferiti — filtrati dal chiamante)
 * @param region    region corrente (per bbox + zoom). null finché non disponibile.
 * @param enabled   true solo nel regime "dot" (zoom largo); false a zoom stretto → nessun cluster.
 */
export function useMapClusters(
  pins: RestaurantPin[],
  userAllergens: string[],
  userDiets: string[],
  showMatchInfo: boolean,
  region: Region | null,
  enabled: boolean,
): MapClusterResult[] {
  const userNeeds = useMemo(
    () => [...userAllergens, ...userDiets],
    [userAllergens, userDiets],
  );

  // Indice ricostruito solo quando cambiano i pin o le esigenze (non sul pan né
  // sulla selezione): getClusters sotto è economico, load è O(n).
  const index = useMemo(() => {
    const sc = new Supercluster<PointProps, ClusterProps>({
      radius: CLUSTER_RADIUS,
      minPoints: CLUSTER_MIN_POINTS,
      maxZoom: CLUSTER_MAX_ZOOM,
      map: (props) => ({ score: props.score }),
      reduce: (acc, props) => {
        if (props.score > acc.score) acc.score = props.score;
      },
    });
    const features = pins
      .filter((p) => isValidCoord(p.latitude, p.longitude))
      .map((p) => ({
        type: 'Feature' as const,
        properties: { pinId: p.id, score: pinScore(p, userNeeds, showMatchInfo) },
        geometry: {
          type: 'Point' as const,
          coordinates: [p.longitude, p.latitude] as [number, number],
        },
      }));
    sc.load(features);
    return sc;
  }, [pins, userNeeds, showMatchInfo]);

  return useMemo(() => {
    if (!enabled || !region) return [];
    const bbox: [number, number, number, number] = [
      region.longitude - region.longitudeDelta / 2,
      region.latitude - region.latitudeDelta / 2,
      region.longitude + region.longitudeDelta / 2,
      region.latitude + region.latitudeDelta / 2,
    ];
    const raw = index.getClusters(bbox, regionToZoom(region));
    return raw.map<MapClusterResult>((f) => {
      const [lng, lat] = f.geometry.coordinates;
      if ('cluster' in f.properties && f.properties.cluster) {
        const props = f.properties;
        return {
          kind: 'cluster',
          data: {
            key: `cluster-${props.cluster_id}`,
            latitude: lat,
            longitude: lng,
            score: props.score ?? 0,
            count: props.point_count,
          },
        };
      }
      const props = f.properties as PointProps;
      return { kind: 'point', pinId: props.pinId, latitude: lat, longitude: lng };
    });
  }, [index, region, enabled]);
}
