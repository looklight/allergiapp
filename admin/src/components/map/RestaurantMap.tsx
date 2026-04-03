'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapRestaurant {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  average_rating: number;
}

interface RestaurantMapProps {
  restaurants: MapRestaurant[];
}

export default function RestaurantMap({ restaurants }: RestaurantMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current).setView([42, 12], 5);

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
    if (!map || restaurants.length === 0) return;

    // Rimuovi marker precedenti
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) map.removeLayer(layer);
    });

    const bounds: L.LatLngExpression[] = [];

    for (const r of restaurants) {
      const latlng: L.LatLngExpression = [r.latitude, r.longitude];
      bounds.push(latlng);

      const color = '#2563eb';

      const marker = L.circleMarker(latlng, {
        radius: 6,
        fillColor: color,
        fillOpacity: 0.8,
        color: '#fff',
        weight: 1.5,
      }).addTo(map);

      const location = [r.city, r.country].filter(Boolean).join(', ');
      const detailUrl = `/restaurants/${r.id}`;

      marker.bindTooltip(
        `<strong>${r.name}</strong>${location ? `<br/><span style="color:#6b7280">${location}</span>` : ''}<br/><a href="${detailUrl}" target="_blank" rel="noreferrer" style="color:#2563eb;font-size:12px" onclick="event.stopPropagation()">Apri scheda &rarr;</a>`,
        { direction: 'top', offset: [0, -8], opacity: 1, className: 'restaurant-tooltip' }
      );

      marker.on('click', () => {
        window.open(detailUrl, '_blank');
      });
    }

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] });
    }
  }, [restaurants]);

  return <div ref={containerRef} className="w-full h-full rounded-lg" />;
}
