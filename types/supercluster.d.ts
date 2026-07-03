// Dichiarazione ambient minimale per `supercluster` (8.0.1) — il pacchetto non
// spedisce tipi e @types/supercluster non è installato. Copre solo la superficie
// API effettivamente usata da useMapClusters. Se in futuro servisse di più,
// preferire l'installazione di @types/supercluster a un'espansione di questo shim.
declare module 'supercluster' {
  export interface Options<P, C> {
    minZoom?: number;
    maxZoom?: number;
    minPoints?: number;
    radius?: number;
    extent?: number;
    nodeSize?: number;
    log?: boolean;
    generateId?: boolean;
    map?: (props: P) => C;
    reduce?: (accumulated: C, props: C) => void;
  }

  export interface PointFeature<P> {
    type: 'Feature';
    properties: P;
    geometry: { type: 'Point'; coordinates: [number, number] };
  }

  export interface ClusterProperties {
    cluster: true;
    cluster_id: number;
    point_count: number;
    point_count_abbreviated: number | string;
  }

  export interface ClusterFeature<C> {
    type: 'Feature';
    id: number;
    properties: C & ClusterProperties;
    geometry: { type: 'Point'; coordinates: [number, number] };
  }

  export default class Supercluster<P = Record<string, unknown>, C = Record<string, unknown>> {
    constructor(options?: Options<P, C>);
    load(points: PointFeature<P>[]): this;
    getClusters(
      bbox: [number, number, number, number],
      zoom: number,
    ): (PointFeature<P> | ClusterFeature<C>)[];
    getChildren(clusterId: number): (PointFeature<P> | ClusterFeature<C>)[];
    getLeaves(clusterId: number, limit?: number, offset?: number): PointFeature<P>[];
    getClusterExpansionZoom(clusterId: number): number;
  }
}
