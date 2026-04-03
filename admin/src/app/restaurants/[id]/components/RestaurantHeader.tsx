import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Restaurant } from '@/lib/types';
import { ALL_CATEGORIES, DIETARY_CATEGORIES, CUISINE_CATEGORIES } from '@/lib/restaurantCategories';
import Link from 'next/link';

interface Props {
  restaurant: Restaurant;
  stats: { review_count: number; average_rating: number; favorite_count: number };
  reportCount: number;
  isDeleting: boolean;
  onDelete: () => void;
  onRestaurantUpdate: (r: Restaurant) => void;
}

export default function RestaurantHeader({ restaurant, stats, reportCount, isDeleting, onDelete, onRestaurantUpdate }: Props) {
  const [editingCategories, setEditingCategories] = useState(false);
  const [pendingCategories, setPendingCategories] = useState<string[]>([]);
  const [isSavingCategories, setIsSavingCategories] = useState(false);

  const startEditingCategories = () => {
    setPendingCategories(restaurant.cuisine_types ?? []);
    setEditingCategories(true);
  };

  const toggleCategory = (id: string) => {
    setPendingCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const saveCuisineTypes = async () => {
    setIsSavingCategories(true);
    const { error } = await supabase
      .from('restaurants')
      .update({ cuisine_types: pendingCategories })
      .eq('id', restaurant.id);
    setIsSavingCategories(false);
    if (error) {
      alert(`Errore durante il salvataggio: ${error.message}`);
      return;
    }
    onRestaurantUpdate({ ...restaurant, cuisine_types: pendingCategories });
    setEditingCategories(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{restaurant.name}</h1>
          <p className="text-gray-500">
            {restaurant.address}
            {' '}
            <a
              href={
                restaurant.google_place_id
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.address ?? ''}`)}&query_place_id=${restaurant.google_place_id}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.address ?? ''} ${restaurant.city ?? ''}`)}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-full text-xs font-medium ml-2 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 92.3 132.3" xmlns="http://www.w3.org/2000/svg"><path fill="#1a73e8" d="M60.2 2.2C55.8.8 51 0 46.1 0 32 0 19.3 6.4 10.8 16.5l21.8 18.3L60.2 2.2z"/><path fill="#ea4335" d="M10.8 16.5C4.1 24.5 0 34.9 0 46.1c0 8.7 1.7 15.7 4.6 22l28-33.3-21.8-18.3z"/><path fill="#4285f4" d="M46.2 28.5c9.8 0 17.7 7.9 17.7 17.7 0 4.3-1.6 8.3-4.2 11.4 0 0 13.9-16.6 27.5-32.7-5.6-10.8-15.3-19-27-22.7L32.6 34.8c3.3-3.8 8.1-6.3 13.6-6.3"/><path fill="#fbbc04" d="M46.2 63.8c-9.8 0-17.7-7.9-17.7-17.7 0-4.3 1.5-8.3 4.1-11.3l-28 33.3c4.8 10.6 12.8 19.2 21 29.9l34.1-40.5c-3.3 3.9-8.1 6.3-13.5 6.3"/><path fill="#34a853" d="M59.1 109.2c15.4-24.1 33.3-35 33.3-63.1 0-9.1-2.4-17.2-6.5-24.3L25.6 98c2.6 3.4 5.3 7.3 7.9 11.3 9.4 14.5 6.8 23.1 12.8 23.1s3.4-8.7 12.8-23.2"/></svg>
              Apri in Google Maps
            </a>
          </p>
          <p className="text-gray-400 text-sm">
            {restaurant.city}, {restaurant.country} &middot; Aggiunto da {restaurant.added_by ? (
              <Link href={`/users/${restaurant.added_by}`} className="text-blue-600 hover:underline">{restaurant.adder_name ?? '—'}</Link>
            ) : '—'}
          </p>
          {/* Categorie — visualizzazione e editing */}
          <div className="mt-3">
            {!editingCategories ? (
              <div className="flex flex-wrap gap-1.5 items-center">
                {restaurant.cuisine_types?.length > 0
                  ? restaurant.cuisine_types.map(id => {
                      const cat = ALL_CATEGORIES.find(c => c.id === id);
                      return (
                        <span key={id} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          {cat?.label ?? id}
                        </span>
                      );
                    })
                  : <span className="text-gray-400 text-sm">Nessuna categoria</span>
                }
                <button
                  onClick={startEditingCategories}
                  className="ml-1 text-xs text-blue-600 hover:underline"
                >
                  Modifica
                </button>
              </div>
            ) : (
              <div className="border rounded p-3 bg-gray-50">
                <p className="text-xs font-medium text-gray-500 mb-2">Dietetico</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {DIETARY_CATEGORIES.map(cat => (
                    <label key={cat.id} className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={pendingCategories.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                      />
                      {cat.label}
                    </label>
                  ))}
                </div>
                <p className="text-xs font-medium text-gray-500 mb-2">Cucina</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {CUISINE_CATEGORIES.map(cat => (
                    <label key={cat.id} className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={pendingCategories.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                      />
                      {cat.label}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveCuisineTypes}
                    disabled={isSavingCategories}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSavingCategories ? 'Salvataggio...' : 'Salva'}
                  </button>
                  <button
                    onClick={() => setEditingCategories(false)}
                    className="px-3 py-1 border rounded text-sm text-gray-600 hover:bg-gray-100"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-4 mt-4 text-sm">
        <span>Recensioni: <strong>{stats.review_count}</strong></span>
        <span>Rating: <strong>{stats.average_rating.toFixed(1)}</strong> ({stats.review_count})</span>
        <span>Preferiti: <strong>{stats.favorite_count}</strong></span>
        {reportCount > 0 && <span className="text-red-600">Segnalazioni: <strong>{reportCount}</strong></span>}
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
        >
          {isDeleting ? 'Eliminazione...' : 'Elimina ristorante'}
        </button>
      </div>
    </div>
  );
}
