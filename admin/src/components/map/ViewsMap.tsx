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

    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) map.removeLayer(layer);
    });

    const fillColor = tokenColor('--primary', '#2563eb');
    const ringColor = tokenColor('--card', '#ffffff');
    const locColor = tokenColor('--muted-foreground', '#6b7280');

    const bounds: L.LatLngExpression[] = [];
    const drawn: { marker: L.CircleMarker; views: number }[] = [];

    // Dal più aperto al meno: i cerchi grandi finiscono sotto, così i piccoli
    // restano cliccabili invece di sparire sotto un vicino affollato.
    for (const p of [...points].sort((a, b) => b.views - a.views)) {
      const latlng: L.LatLngExpression = [p.latitude, p.longitude];
      bounds.push(latlng);

      const marker = L.circleMarker(latlng, {
        radius: 4,
        fillColor,
        fillOpacity: 0.35,
        color: ringColor,
        weight: 1,
      }).addTo(map);

      const location = p.city ? `<br/><span style="color:${locColor}">${p.city}</span>` : '';
      marker.bindTooltip(
        `<strong>${p.name}</strong>${location}<br/>${p.views} apertur${p.views === 1 ? 'a' : 'e'}`,
        { direction: 'top', offset: [0, -8], opacity: 1, className: 'restaurant-tooltip' },
      );

      marker.on('click', () => {
        window.open(`/restaurants/${p.restaurant_id}`, '_blank');
      });

      drawn.push({ marker, views: p.views });
    }

    // Riscala sul contenuto visibile a ogni spostamento o zoom.
    const rescale = () => {
      const view = map.getBounds();
      const visible = drawn.filter((d) => view.contains(d.marker.getLatLng()));
      // Fuori da ogni punto (mare aperto) si tiene l'ultima scala buona invece
      // di far pulsare i cerchi rimasti ai bordi.
      if (visible.length === 0) return;
      const max = Math.max(...visible.map((d) => d.views));
      for (const d of drawn) d.marker.setRadius(radiusFor(d.views, max));
    };

    map.on('moveend', rescale);

    if (bounds.length > 0) {
      // fitBounds muove la mappa e fa scattare 'moveend', che disegna la prima
      // scala. Se i punti ci stanno già tutti non si muove nulla e l'evento non
      // arriva: la chiamata esplicita copre quel caso.
      map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] });
    }
    rescale();

    return () => { map.off('moveend', rescale); };
  }, [points]);

  return <div ref={containerRef} className="w-full h-full rounded-lg" />;
}
