import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Restaurant } from '@/lib/types';
import { CUISINE_CATEGORIES, ACCOMMODATION_CATEGORIES } from '@/lib/restaurantCategories';
import { getCountryName } from '@/lib/countryName';
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
  const { session } = useAuth();
  const [editingCategories, setEditingCategories] = useState(false);
  // adminVotes = stato dei voti dell'admin loggato per questo ristorante.
  // pendingCategories = stato in editing (diff con adminVotes per save).
  const [adminVotes, setAdminVotes] = useState<string[]>([]);
  const [pendingCategories, setPendingCategories] = useState<string[]>([]);
  const [isSavingCategories, setIsSavingCategories] = useState(false);

  // Faccette lodging (colonne dirette su restaurants — correzione dati errati).
  const [editingFacets, setEditingFacets] = useState(false);
  const [pendingServesFood, setPendingServesFood] = useState(true);
  const [pendingOffersLodging, setPendingOffersLodging] = useState(false);
  const [pendingLodgingType, setPendingLodgingType] = useState<string>('');
  const [isSavingFacets, setIsSavingFacets] = useState(false);

  const startEditingCategories = async () => {
    if (!session) {
      alert('Sessione non valida');
      return;
    }
    const { data, error } = await supabase
      .from('restaurant_cuisine_votes')
      .select('cuisine_id')
      .eq('restaurant_id', restaurant.id)
      .eq('user_id', session.user.id);
    if (error) {
      alert(`Errore durante il caricamento dei voti: ${error.message}`);
      return;
    }
    const votes = (data ?? []).map(v => v.cuisine_id as string);
    setAdminVotes(votes);
    setPendingCategories(votes);
    setEditingCategories(true);
  };

  const toggleCategory = (id: string) => {
    setPendingCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const saveCuisineTypes = async () => {
    if (!session) return;
    setIsSavingCategories(true);

    const toAdd = pendingCategories.filter(c => !adminVotes.includes(c));
    const toRemove = adminVotes.filter(c => !pendingCategories.includes(c));

    if (toAdd.length > 0) {
      const { error } = await supabase
        .from('restaurant_cuisine_votes')
        .insert(toAdd.map(cuisine_id => ({
          restaurant_id: restaurant.id,
          user_id: session.user.id,
          cuisine_id,
        })));
      if (error) {
        setIsSavingCategories(false);
        alert(`Errore aggiunta voti: ${error.message}`);
        return;
      }
    }

    if (toRemove.length > 0) {
      const { error } = await supabase
        .from('restaurant_cuisine_votes')
        .delete()
        .eq('restaurant_id', restaurant.id)
        .eq('user_id', session.user.id)
        .in('cuisine_id', toRemove);
      if (error) {
        setIsSavingCategories(false);
        alert(`Errore rimozione voti: ${error.message}`);
        return;
      }
    }

    // Trigger sync_restaurant_cuisine_types (migration 014) ricalcola
    // restaurants.cuisine_types da tutti i voti — rileggiamo per la UI.
    const { data: refreshed, error: refreshError } = await supabase
      .from('restaurants')
      .select('cuisine_types')
      .eq('id', restaurant.id)
      .single();

    setIsSavingCategories(false);
    if (refreshError) {
      alert(`Errore aggiornamento UI: ${refreshError.message}`);
      return;
    }

    setAdminVotes(pendingCategories);
    onRestaurantUpdate({ ...restaurant, cuisine_types: refreshed?.cuisine_types ?? [] });
    setEditingCategories(false);
  };

  const startEditingFacets = () => {
    setPendingServesFood(restaurant.serves_food ?? true);
    setPendingOffersLodging(restaurant.offers_lodging ?? false);
    setPendingLodgingType(restaurant.lodging_type ?? '');
    setEditingFacets(true);
  };

  const saveFacets = async () => {
    // Vincolo DB (CHECK): un luogo deve essere almeno ristorante o struttura.
    if (!pendingServesFood && !pendingOffersLodging) {
      alert('Un luogo deve essere almeno un ristorante o una struttura ricettiva.');
      return;
    }
    setIsSavingFacets(true);
    // lodging_type ha senso solo se è una struttura (rispetta il CHECK DB).
    const lodging_type = pendingOffersLodging ? (pendingLodgingType || null) : null;
    const { error } = await supabase
      .from('restaurants')
      .update({
        serves_food: pendingServesFood,
        offers_lodging: pendingOffersLodging,
        lodging_type,
      })
      .eq('id', restaurant.id);
    setIsSavingFacets(false);
    if (error) {
      alert(`Errore salvataggio tipo luogo: ${error.message}`);
      return;
    }
    onRestaurantUpdate({
      ...restaurant,
      serves_food: pendingServesFood,
      offers_lodging: pendingOffersLodging,
      lodging_type,
    });
    setEditingFacets(false);
  };

  return (
    <div className="bg-card rounded-lg shadow p-6 mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{restaurant.name}</h1>
          <p className="text-muted-foreground">
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
              aria-label="Apri in Google Maps"
              className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft-hover rounded-full text-xs font-medium ml-2 transition-colors"
            >
              Apri in
              <svg className="w-4 h-4" viewBox="0 0 92.3 132.3" xmlns="http://www.w3.org/2000/svg"><path fill="#1a73e8" d="M60.2 2.2C55.8.8 51 0 46.1 0 32 0 19.3 6.4 10.8 16.5l21.8 18.3L60.2 2.2z"/><path fill="#ea4335" d="M10.8 16.5C4.1 24.5 0 34.9 0 46.1c0 8.7 1.7 15.7 4.6 22l28-33.3-21.8-18.3z"/><path fill="#4285f4" d="M46.2 28.5c9.8 0 17.7 7.9 17.7 17.7 0 4.3-1.6 8.3-4.2 11.4 0 0 13.9-16.6 27.5-32.7-5.6-10.8-15.3-19-27-22.7L32.6 34.8c3.3-3.8 8.1-6.3 13.6-6.3"/><path fill="#fbbc04" d="M46.2 63.8c-9.8 0-17.7-7.9-17.7-17.7 0-4.3 1.5-8.3 4.1-11.3l-28 33.3c4.8 10.6 12.8 19.2 21 29.9l34.1-40.5c-3.3 3.9-8.1 6.3-13.5 6.3"/><path fill="#34a853" d="M59.1 109.2c15.4-24.1 33.3-35 33.3-63.1 0-9.1-2.4-17.2-6.5-24.3L25.6 98c2.6 3.4 5.3 7.3 7.9 11.3 9.4 14.5 6.8 23.1 12.8 23.1s3.4-8.7 12.8-23.2"/></svg>
            </a>
            {restaurant.slug && (
              <a
                href={`https://allergiapp.com/r/${encodeURIComponent(restaurant.slug)}?ref=admin`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Apri in AllergiApp"
                className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft-hover rounded-full text-xs font-medium ml-2 transition-colors"
              >
                Apri in
                <img src="/avatars/plate_main_logo.png" alt="" width={20} height={20} className="w-5 h-5 -my-0.5" />
              </a>
            )}
          </p>
          <p className="text-faint text-sm">
            {restaurant.city}, {getCountryName(restaurant.country_code, restaurant.country)} &middot; Aggiunto da {restaurant.added_by ? (
              <Link href={`/users/${restaurant.added_by}`} className="text-primary hover:underline">{restaurant.adder_name ?? '—'}</Link>
            ) : <span className="italic text-faint">Utente inattivo</span>}
          </p>
          {/* Categorie — visualizzazione e editing */}
          <div className="mt-3">
            {!editingCategories ? (
              <div className="flex flex-wrap gap-1.5 items-center">
                {restaurant.cuisine_types?.length > 0
                  ? restaurant.cuisine_types.map(id => {
                      const cat = CUISINE_CATEGORIES.find(c => c.id === id);
                      return (
                        <span key={id} className="px-2 py-0.5 bg-muted text-foreground-secondary rounded text-xs">
                          {cat?.label ?? id}
                        </span>
                      );
                    })
                  : <span className="text-faint text-sm">Nessuna cucina</span>
                }
                <button
                  onClick={startEditingCategories}
                  className="ml-1 text-xs text-primary hover:underline"
                >
                  Modifica
                </button>
              </div>
            ) : (
              <div className="border rounded p-3 bg-background">
                <p className="text-xs font-medium text-muted-foreground mb-1">Cucina</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Le tue selezioni contano come 1 voto. I voti della community restano invariati.
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {CUISINE_CATEGORIES.map(cat => {
                    const isActive = pendingCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition ${
                          isActive
                            ? 'bg-primary border-primary text-white hover:bg-primary-hover'
                            : 'bg-card border-input text-foreground-secondary hover:bg-background'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveCuisineTypes}
                    disabled={isSavingCategories}
                    className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary-hover disabled:opacity-50"
                  >
                    {isSavingCategories ? 'Salvataggio...' : 'Salva'}
                  </button>
                  <button
                    onClick={() => setEditingCategories(false)}
                    className="px-3 py-1 border rounded text-sm text-foreground-secondary hover:bg-muted"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tipo luogo (faccetta lodging) — visualizzazione e correzione */}
      <div className="mt-4">
        {!editingFacets ? (
          <div className="flex flex-wrap gap-1.5 items-center text-sm">
            <span className="text-muted-foreground">Tipo luogo:</span>
            {restaurant.offers_lodging && (
              <span className="px-2 py-0.5 bg-muted text-foreground-secondary rounded text-xs">
                {ACCOMMODATION_CATEGORIES.find(c => c.id === restaurant.lodging_type)?.label ?? 'Struttura'}
              </span>
            )}
            <span className="px-2 py-0.5 bg-muted text-foreground-secondary rounded text-xs">
              {restaurant.serves_food === false ? 'Senza ristorante pubblico' : 'Ristorante'}
            </span>
            <button
              onClick={startEditingFacets}
              className="ml-1 text-xs text-primary hover:underline"
            >
              Modifica
            </button>
          </div>
        ) : (
          <div className="border rounded p-3 bg-background max-w-md">
            <p className="text-xs font-medium text-muted-foreground mb-2">Tipo luogo</p>
            <label className="flex items-center gap-2 mb-2 text-sm">
              <input
                type="checkbox"
                checked={pendingOffersLodging}
                onChange={e => setPendingOffersLodging(e.target.checked)}
              />
              È una struttura ricettiva (hotel, B&amp;B…)
            </label>
            {pendingOffersLodging && (
              <select
                value={pendingLodgingType}
                onChange={e => setPendingLodgingType(e.target.value)}
                className="mb-2 w-full px-2 py-1.5 border border-input rounded text-sm bg-card"
              >
                <option value="">— Tipo struttura —</option>
                {ACCOMMODATION_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            )}
            <label className="flex items-center gap-2 mb-3 text-sm">
              <input
                type="checkbox"
                checked={pendingServesFood}
                onChange={e => setPendingServesFood(e.target.checked)}
              />
              Ha un ristorante aperto al pubblico (compare tra i ristoranti)
            </label>
            <div className="flex gap-2">
              <button
                onClick={saveFacets}
                disabled={isSavingFacets}
                className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary-hover disabled:opacity-50"
              >
                {isSavingFacets ? 'Salvataggio...' : 'Salva'}
              </button>
              <button
                onClick={() => setEditingFacets(false)}
                className="px-3 py-1 border rounded text-sm text-foreground-secondary hover:bg-muted"
              >
                Annulla
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 mt-4 text-sm">
        <span>Recensioni: <strong>{stats.review_count}</strong></span>
        <span>Rating: <strong>{stats.average_rating.toFixed(1)}</strong> ({stats.review_count})</span>
        <span>Preferiti: <strong>{stats.favorite_count}</strong></span>
        {reportCount > 0 && <span className="text-danger">Segnalazioni: <strong>{reportCount}</strong></span>}
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="px-3 py-1.5 bg-danger text-white rounded text-sm hover:bg-danger-strong disabled:opacity-50"
        >
          {isDeleting ? 'Eliminazione...' : 'Elimina ristorante'}
        </button>
      </div>
    </div>
  );
}
