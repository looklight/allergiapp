'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapViewPoint {
  restaurant_id: string;
  name: string;
  city: string | null;
  latitude: number;
  longitude: number;
  views: number;
}

interface ViewsMapProps {
  points: MapViewPoint[];
}

/** Come in RestaurantMap: i marker Leaflet vivono fuori da Tailwind, quindi il
 *  colore va risolto dal design token per seguire tema e palette. */
function tokenColor(varName: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const probe = document.createElement('span');
  probe.style.color = `var(${varName})`;
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved || fallback;
}

// Cerchi proporzionali invece di una macchia di calore continua: una heat map
// interpola il colore fra i punti e afferma una densità dove nessuno ha
// misurato niente. Da lontano si leggono le stesse zone calde, ma ogni cerchio
// sta su un locale che esiste.
//
// Raggio sulla RADICE delle aperture, non sul valore: l'area del cerchio cresce
// così in modo proporzionale al numero, ed è l'area che l'occhio confronta. Con
// il raggio lineare un locale con 100 aperture sembrerebbe cento volte un altro
// con 1, invece di dieci.
//
// `max` è il massimo di quello che si VEDE adesso, non di tutto il mondo:
// altrimenti zoomando su una città i cerchi resterebbero schiacciati contro il
// minimo dal locale più aperto di un altro continente, e la città sarebbe una
// distesa di puntini uguali. Ricalcolandolo a ogni spostamento, la scala è
// sempre quella della domanda che ti stai facendo: fra continenti quando guardi
// il mondo, fra ristoranti quando guardi una via.
function radiusFor(views: number, max: number): number {
  const MIN = 4;
  const MAX = 22;
  if (max <= 1) return MIN;
  return MIN + (MAX - MIN) * Math.sqrt(views / max);
}

// Raggruppa i punti vicini SULLO SCHERMO, non nello spazio geografico: a
// livello mondo una città intera sta in pochi pixel e deve leggersi come un
// numero solo, mentre zoomando gli stessi punti si separano da soli. La griglia
// è in pixel proiettati, quindi il raggruppamento segue lo zoom senza soglie
// geografiche da inventare (che sarebbero sbagliate: 10 km sono un quartiere a
// Milano e una regione in Lapponia).
const CELL = 52;

interface Cluster {
  lat: number;
  lng: number;
  views: number;
  points: MapViewPoint[];
}

function clusterize(map: L.Map, points: MapViewPoint[]): Cluster[] {
  const zoom = map.getZoom();
  const buckets = new Map<string, Cluster>();

  for (const p of points) {
    const pt = map.project([p.latitude, p.longitude], zoom);
    const key = `${Math.floor(pt.x / CELL)}:${Math.floor(pt.y / CELL)}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.views += p.views;
      existing.points.push(p);
    } else {
      buckets.set(key, { lat: p.latitude, lng: p.longitude, views: p.views, points: [p] });
    }
  }

  // Centro pesato sulle aperture: il cerchio si posa dove sta l'attività, non
  // nel mezzo geometrico di locali che contano in modo diverso.
  for (const c of buckets.values()) {
    if (c.points.length === 1) continue;
    const total = c.points.reduce((s, p) => s + p.views, 0) || c.points.length;
    c.lat = c.points.reduce((s, p) => s + p.latitude * p.views, 0) / total;
    c.lng = c.points.reduce((s, p) => s + p.longitude * p.views, 0) / total;
  }

  return [...buckets.values()];
}

export default function ViewsMap({ points }: ViewsMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current).setView([42, 12], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || points.length === 0) return;

    const fillColor = tokenColor('--primary', '#2563eb');
    const ringColor = tokenColor('--card', '#ffffff');
    const locColor = tokenColor('--muted-foreground', '#6b7280');

    // Ridisegna a ogni spostamento: cambia il raggruppamento (lo zoom separa i
    // gruppi) e con esso la scala, che resta sempre relativa a ciò che si vede.
    const redraw = () => {
      map.eachLayer((layer) => {
        if (layer instanceof L.CircleMarker) map.removeLayer(layer);
      });

      const view = map.getBounds();
      const clusters = clusterize(map, points);
      const visible = clusters.filter((c) => view.contains([c.lat, c.lng]));
      const max = Math.max(...(visible.length > 0 ? visible : clusters).map((c) => c.views));

      // Dal più aperto al meno: i grandi finiscono sotto e i piccoli restano
      // cliccabili sopra di loro.
      for (const c of [...clusters].sort((a, b) => b.views - a.views)) {
        const marker = L.circleMarker([c.lat, c.lng], {
          radius: radiusFor(c.views, max),
          fillColor,
          fillOpacity: 0.35,
          color: ringColor,
          weight: 1,
        }).addTo(map);

        if (c.points.length === 1) {
          const p = c.points[0];
          const where = p.city ? `<br/><span style="color:${locColor}">${p.city}</span>` : '';
          marker.bindTooltip(
            `<strong>${p.name}</strong>${where}<br/>${p.views} apertur${p.views === 1 ? 'a' : 'e'}`,
            { direction: 'top', offset: [0, -8], opacity: 1, className: 'restaurant-tooltip' },
          );
          marker.on('click', () => window.open(`/restaurants/${p.restaurant_id}`, '_blank'));
        } else {
          // Su un gruppo il clic non può aprire una scheda sola: avvicina, e a
          // furia di avvicinarsi il gruppo si scioglie nei suoi locali.
          const cities = [...new Set(c.points.map((p) => p.city).filter(Boolean))];
          const where = cities.length > 0
            ? `<br/><span style="color:${locColor}">${cities.slice(0, 3).join(', ')}${cities.length > 3 ? '…' : ''}</span>`
            : '';
          marker.bindTooltip(
            `<strong>${c.views} aperture</strong>${where}<br/>${c.points.length} locali`,
            { direction: 'top', offset: [0, -8], opacity: 1, className: 'restaurant-tooltip' },
          );
          marker.on('click', () => map.setView([c.lat, c.lng], Math.min(map.getZoom() + 3, 18)));
        }
      }
    };

    map.on('moveend', redraw);

    const bounds = points.map((p) => [p.latitude, p.longitude] as L.LatLngExpression);
    // fitBounds fa scattare 'moveend' e quindi il primo disegno; se i punti ci
    // stanno già tutti la mappa non si muove e l'evento non arriva, per questo
    // la chiamata esplicita.
    map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] });
    redraw();

    return () => { map.off('moveend', redraw); };
  }, [points]);

  return <div ref={containerRef} className="w-full h-full rounded-lg" />;
}
