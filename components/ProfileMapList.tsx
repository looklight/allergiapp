import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Animated, Easing, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import type { AppTheme } from '../constants/theme';
import i18n from '../utils/i18n';
import ProfileCard from './ProfileCard';
import Avatar from './Avatar';
import CountryFilterChips from './CountryFilterChips';
import MyRestaurantsMap, { type MapPinItem } from '../app/components/my-restaurants/MyRestaurantsMap';
import RestaurantDetailSheet from './restaurants/RestaurantDetailSheet';
import { useLocationFilters, type LocationParts } from '../hooks/useLocationFilters';
import type { UserProfile } from '../services/auth';

interface ProfileMapListProps<T> {
  /** Profilo già "visibile" (username eventualmente mascherato per anonimi). */
  profile: UserProfile;
  stats?: { likes?: number; reviews?: number };
  likesSlot?: React.ReactNode;
  reviewsSlot?: React.ReactNode;
  onBack: () => void;
  onEdit?: () => void;
  onEditDietary?: () => void;
  onAvatarPress?: () => void;
  /** Se presente, mostra un pulsante "+" sulla mappa (specchiato al mini-avatar)
   *  che apre la schermata di aggiunta ristorante. Passato solo dal profilo
   *  personale: sui profili altrui non viene fornito e il pulsante non compare. */
  onAddRestaurant?: () => void;

  /** Elenco completo (non filtrato): il filtro paese è applicato internamente. */
  items: T[];
  getLocation: (item: T) => LocationParts;
  getMapPin: (item: T) => MapPinItem;
  /** Id del ristorante usato per agganciare un pin alla riga corrispondente. */
  getPinId: (item: T) => string;
  getRowKey: (item: T) => string;
  /** Render della singola card; `onPress` apre lo sheet di dettaglio. */
  renderRow: (item: T, onPress: () => void) => React.ReactNode;
  sectionTitle?: string;

  /** Chiamato dopo la chiusura dello sheet (es. ricaricare i dati). */
  onDetailClose?: () => void;

  /** Reso nella sticky header sopra le pill nazioni (toggle Preferiti/Recensioni). */
  filterSlot?: React.ReactNode;
  /** Pulsanti d'azione resi sopra la sticky header (scorrono via). */
  topActions?: React.ReactNode;
  /** Forza la visibilità della sticky header indipendentemente da `items`.
   *  Serve quando il toggle deve restare visibile anche se il filtro corrente è
   *  vuoto (es. nessuna recensione ma ci sono preferiti). Default: items.length > 0. */
  headerVisible?: boolean;
  /** Reso al posto della lista quando il filtro corrente non ha elementi. */
  emptyState?: React.ReactNode;
}

/**
 * Scaffold condiviso "profilo + mappa": ProfileCard con sticky header (filtri +
 * mini-mappa) e lista misurata con scroll-to-pin e flash di evidenziazione.
 * Usato dal profilo pubblico (sole recensioni) e dal profilo privato
 * (preferiti/recensioni via `filterSlot`).
 */
export default function ProfileMapList<T>({
  profile,
  stats,
  likesSlot,
  reviewsSlot,
  onBack,
  onEdit,
  onEditDietary,
  onAvatarPress,
  onAddRestaurant,
  items,
  getLocation,
  getMapPin,
  getPinId,
  getRowKey,
  renderRow,
  sectionTitle,
  onDetailClose,
  filterSlot,
  topActions,
  headerVisible,
  emptyState,
}: ProfileMapListProps<T>) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  // Pin evidenziato sulla mappa: impostato aprendo una riga, azzerato al tap
  // sulla mappa. Persiste a scheda chiusa così il ristorante resta selezionato.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);
  const cardYRef = useRef<Record<string, number>>({});
  const stickyHeightRef = useRef(0);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { countryOptions, selectedCountry, setSelectedCountry, filteredItems } =
    useLocationFilters(items, getLocation);

  // Tap su un pin: scrolla alla riga corrispondente (sotto l'header sticky)
  // e la evidenzia con un breve flash.
  const handlePinPress = useCallback((restaurantId: string) => {
    const y = cardYRef.current[restaurantId];
    if (y != null) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - stickyHeightRef.current - 12), animated: true });
    }
    setHighlightedId(restaurantId);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightedId(null), 1400);
  }, []);

  // Tap sul mini-avatar che compare sulla mappa quando l'header è agganciato:
  // riporta la lista in cima (l'avatar grande del profilo torna visibile).
  const handleBackToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  useEffect(() => () => { if (highlightTimer.current) clearTimeout(highlightTimer.current); }, []);

  const handleCloseDetail = () => {
    setDetailId(null);
    onDetailClose?.();
  };

  const showHeader = headerVisible ?? items.length > 0;

  return (
    <>
      <ProfileCard
        profile={profile}
        stats={stats}
        likesSlot={likesSlot}
        reviewsSlot={reviewsSlot}
        onBack={onBack}
        onEdit={onEdit}
        onEditDietary={onEditDietary}
        onAvatarPress={onAvatarPress}
        scrollRef={scrollRef}
        beforeStickyHeader={topActions}
        stickyHeader={showHeader ? (pinned, isPinned) => (
          <View
            style={styles.stickyHeader}
            onLayout={(e) => { stickyHeightRef.current = e.nativeEvent.layout.height; }}
          >
            {filterSlot}
            <CountryFilterChips
              options={countryOptions}
              selected={selectedCountry}
              onSelect={setSelectedCountry}
            />
            {filteredItems.length > 0 && (
              <View>
                <MyRestaurantsMap
                  items={filteredItems.map(getMapPin)}
                  onSelect={handlePinPress}
                  selectedId={selectedId}
                  onDeselect={() => setSelectedId(null)}
                  height={260}
                />
                {/* Mini-avatar che compare in alto a sinistra sulla mappa quando
                    l'header si aggancia in cima (l'avatar grande è scrollato via).
                    Premuto riporta la lista in cima. È premibile solo da agganciato
                    (isPinned): quando è trasparente non deve rubare i tap ai pin. */}
                <Animated.View
                  pointerEvents={isPinned ? 'auto' : 'none'}
                  style={[styles.mapAvatar, { opacity: pinned }]}
                >
                  <TouchableOpacity
                    onPress={handleBackToTop}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={i18n.t('restaurants.user.backToTop')}
                  >
                    <Avatar
                      avatarId={profile.avatar_url}
                      isAnonymous={profile.is_anonymous}
                      initial={profile.username ?? undefined}
                      size={36}
                    />
                  </TouchableOpacity>
                </Animated.View>
                {/* Pulsante "+" specchiato a destra: compare con la stessa
                    animazione del mini-avatar quando l'header si aggancia.
                    Reso solo se il consumer passa onAddRestaurant (profilo
                    personale); premibile solo da agganciato per non rubare i
                    tap ai pin quando è trasparente. */}
                {onAddRestaurant && (
                  <Animated.View
                    pointerEvents={isPinned ? 'auto' : 'none'}
                    style={[styles.mapAddButton, { opacity: pinned }]}
                  >
                    <TouchableOpacity
                      onPress={onAddRestaurant}
                      activeOpacity={0.7}
                      style={styles.mapAddButtonTouch}
                      accessibilityRole="button"
                      accessibilityLabel={i18n.t('restaurants.user.addRestaurant')}
                    >
                      <MaterialCommunityIcons name="plus" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </View>
            )}
          </View>
        ) : undefined}
      >
        {filteredItems.length > 0 ? (
          <>
            {sectionTitle ? <Text style={styles.sectionTitle}>{sectionTitle}</Text> : null}
            {filteredItems.map((item) => {
              const pinId = getPinId(item);
              return (
                <MeasuredRow
                  key={getRowKey(item)}
                  pinId={pinId}
                  highlighted={highlightedId === pinId}
                  onMeasure={(id, y) => { cardYRef.current[id] = y; }}
                >
                  {renderRow(item, () => { setDetailId(pinId); setSelectedId(pinId); })}
                </MeasuredRow>
              );
            })}
          </>
        ) : (showHeader ? emptyState : null)}
      </ProfileCard>

      {detailId && (
        <RestaurantDetailSheet
          restaurantId={detailId}
          onClose={handleCloseDetail}
        />
      )}
    </>
  );
}

/** Riga con misura della propria posizione (per lo scroll dai pin) e flash di
 *  evidenziazione quando viene selezionata dalla mappa. */
function MeasuredRow({
  pinId,
  highlighted,
  onMeasure,
  children,
}: {
  pinId: string;
  highlighted: boolean;
  onMeasure: (pinId: string, y: number) => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!highlighted) return;
    flash.setValue(1);
    Animated.timing(flash, {
      toValue: 0,
      duration: 1300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [highlighted, flash]);

  return (
    <View onLayout={(e) => onMeasure(pinId, e.nativeEvent.layout.y)}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.flash,
          { opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.2] }) },
        ]}
      />
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  flash: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
  },
  mapAvatar: {
    position: 'absolute',
    top: 8,
    left: 8,
    padding: 2,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  mapAddButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  // Riempie l'intero cerchio (40px) così tutta l'area visibile è premibile,
  // non solo l'icona interna.
  mapAddButtonTouch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyHeader: {
    backgroundColor: theme.colors.surface,
    gap: 6,
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});
