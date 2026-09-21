import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { PartnerCardService, type PartnerCardDish } from '../../services/partnerCardService';
import { dishCompat, type DishCompat, type ViewerNeeds } from '../../utils/partnerDish';
import { DISH_CATEGORIES, categoryName } from '../../constants/dishCategories';
import { sortNotes, noteName } from '../../constants/dishNotes';
import { getRestrictionById } from '../../constants/foodRestrictions';
import ImageFullscreenModal from '../../components/ImageFullscreenModal';
import AppHeader from '../components/AppHeader';
import i18n from '../../utils/i18n';
import type { Language } from '../../types';

const PHOTO = 72;

/**
 * Tutti i piatti della scheda del ristoratore, raggruppati per categoria.
 * E' il "Vedi tutto" del carosello nella scheda del ristorante.
 *
 * I piatti si richiedono di nuovo invece di passarli come parametri: sono la
 * stessa lettura di prima (una riga su indice) e cosi' la schermata funziona
 * anche arrivandoci da un'altra strada, senza portarsi dietro mezzo menu'
 * nell'indirizzo.
 *
 * LE FOTO: qui la lista mostra le miniature e la grande arriva solo aprendo
 * un piatto — il database tiene le due misure separate apposta (mig 731).
 */
export default function PartnerMenuScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const { dietaryNeeds } = useAuth();

  const [dishes, setDishes] = useState<PartnerCardDish[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState<string | null>(null);

  const needs: ViewerNeeds = useMemo(
    () => ({ allergens: dietaryNeeds.allergens ?? [], diets: dietaryNeeds.diets ?? [] }),
    [dietaryNeeds],
  );

  useEffect(() => {
    if (!restaurantId) return;
    (async () => {
      const card = await PartnerCardService.getRestaurantCard(restaurantId);
      setDishes(card?.dishes ?? []);
      setIsLoading(false);
    })();
  }, [restaurantId]);

  // I piatti senza categoria vengono PRIMI (decisione di luglio): le sezioni
  // emergono solo se il ristoratore le usa davvero.
  const groups = useMemo(() => {
    const senza = dishes.filter((d) => d.category === '');
    const conCategoria = DISH_CATEGORIES
      .map((c) => ({ code: c.code, dishes: dishes.filter((d) => d.category === c.code) }))
      .filter((g) => g.dishes.length > 0);
    return [
      ...(senza.length > 0 ? [{ code: '', dishes: senza }] : []),
      ...conCategoria,
    ];
  }, [dishes]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader
        title={i18n.t('restaurants.partnerCard.title')}
        titleAlign="center"
        onLeadingPress={() => router.back()}
      />
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.code || 'none'}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <Text style={styles.disclaimer}>{i18n.t('restaurants.partnerCard.disclaimer')}</Text>
          }
          renderItem={({ item: group }) => (
            <View style={styles.group}>
              {group.code !== '' && (
                <Text style={styles.groupTitle}>{categoryName(group.code, i18n.locale)}</Text>
              )}
              {group.dishes.map((dish, i) => (
                <DishRow
                  key={dish.id}
                  dish={dish}
                  compat={dishCompat(dish, needs)}
                  needs={needs}
                  first={i === 0}
                  styles={styles}
                  theme={theme}
                  onPhotoPress={() => dish.photoUrl && setFullscreen(dish.photoUrl)}
                />
              ))}
            </View>
          )}
        />
      )}

      <ImageFullscreenModal
        visible={fullscreen !== null}
        imageUrl={fullscreen}
        onClose={() => setFullscreen(null)}
      />
    </View>
  );
}

function DishRow({
  dish, compat, needs, first, styles, theme, onPhotoPress,
}: {
  dish: PartnerCardDish;
  compat: DishCompat | null;
  needs: ViewerNeeds;
  first: boolean;
  styles: ReturnType<typeof makeStyles>;
  theme: AppTheme;
  onPhotoPress: () => void;
}) {
  return (
    <View style={[styles.row, !first && styles.rowDivided]}>
      <TouchableOpacity activeOpacity={dish.photoUrl ? 0.8 : 1} onPress={onPhotoPress} disabled={!dish.photoUrl}>
        {dish.thumbUrl ? (
          <Image
            source={{ uri: dish.thumbUrl }}
            style={[styles.photo, compat?.level === 'amber' && styles.photoDimmed]}
          />
        ) : (
          <View style={[styles.photo, styles.photoEmpty]}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={22} color={theme.colors.textDisabled} />
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.rowBody}>
        <Text style={styles.dishName}>{dish.name}</Text>
        {dish.description.trim() !== '' && (
          <Text style={styles.dishDescription}>{dish.description}</Text>
        )}
        <View style={styles.pills}>
          <DishPills dish={dish} compat={compat} needs={needs} styles={styles} theme={theme} />
        </View>
      </View>
    </View>
  );
}

/**
 * Le pill sotto un piatto, nell'ordine deciso a luglio.
 *
 * SENZA esigenze nel profilo si legge quello che il ristoratore ha dichiarato:
 * «Contiene: …» e i suoi tag. CON le esigenze si parla di QUELLE: ambra se il
 * piatto contiene un suo allergene, verde se non ne contiene nessuno, e per
 * ogni sua dieta verde (dichiarata) o grigia («non indicato»).
 *
 * L'assenza di dichiarazione non e' mai un no: resta grigia. Le note del
 * piatto stanno in fondo e sono grigie anche loro — non dicono a chi va bene
 * il piatto, dicono un fatto che vale per chiunque.
 */
function DishPills({
  dish, compat, needs, styles, theme,
}: {
  dish: PartnerCardDish;
  compat: DishCompat | null;
  needs: ViewerNeeds;
  styles: ReturnType<typeof makeStyles>;
  theme: AppTheme;
}) {
  const lang = i18n.locale as Language;
  const nome = (code: string) => getRestrictionById(code)?.translations[lang] ?? code;

  if (!compat) {
    return (
      <>
        {dish.allergens.length > 0 ? (
          <>
            <Text style={styles.pillIntro}>{i18n.t('restaurants.partnerCard.contains')}</Text>
            {dish.allergens.map((code) => (
              <View key={code} style={[styles.pill, styles.pillAmber]}>
                <Text style={styles.pillAmberText}>{nome(code)}</Text>
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.pillNone}>{i18n.t('restaurants.partnerCard.noAllergensDeclared')}</Text>
        )}
        {dish.diets.map((code) => (
          <View key={code} style={[styles.pill, styles.pillGreen]}>
            <MaterialCommunityIcons name="check" size={11} color={theme.colors.success} />
            <Text style={styles.pillGreenText}>{nome(code)}</Text>
          </View>
        ))}
        <NotePills notes={dish.notes} styles={styles} />
      </>
    );
  }

  return (
    <>
      {compat.contained.length > 0 ? (
        <View style={[styles.pill, styles.pillAmber]}>
          <Text style={styles.pillAmberText}>
            {i18n.t('restaurants.partnerCard.containsPrefix')}{' '}
            {compat.contained.map((c) => nome(c).toLowerCase()).join(', ')}
          </Text>
        </View>
      ) : needs.allergens.length > 0 ? (
        <View style={[styles.pill, styles.pillGreen]}>
          <MaterialCommunityIcons name="check" size={11} color={theme.colors.success} />
          <Text style={styles.pillGreenText}>
            {i18n.t('restaurants.partnerCard.withoutPrefix')}{' '}
            {needs.allergens.map((c) => nome(c).toLowerCase()).join(', ')}
          </Text>
        </View>
      ) : null}
      {needs.diets.map((code) =>
        dish.diets.includes(code) ? (
          <View key={code} style={[styles.pill, styles.pillGreen]}>
            <MaterialCommunityIcons name="check" size={11} color={theme.colors.success} />
            <Text style={styles.pillGreenText}>{nome(code)}</Text>
          </View>
        ) : (
          <View key={code} style={[styles.pill, styles.pillGray]}>
            <Text style={styles.pillGrayText}>
              {nome(code)}: {i18n.t('restaurants.partnerCard.notDeclared')}
            </Text>
          </View>
        ),
      )}
      <NotePills notes={dish.notes} styles={styles} />
    </>
  );
}

function NotePills({ notes, styles }: { notes: string[]; styles: ReturnType<typeof makeStyles> }) {
  return (
    <>
      {sortNotes(notes).map((code) => (
        <View key={code} style={[styles.pill, styles.pillGray]}>
          <Text style={styles.pillGrayText}>{noteName(code, i18n.locale)}</Text>
        </View>
      ))}
    </>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  disclaimer: {
    paddingTop: 10,
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textDisabled,
  },
  group: { marginTop: 14 },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 10, paddingVertical: 10 },
  rowDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  photo: {
    width: PHOTO,
    height: PHOTO,
    borderRadius: PHOTO / 2,
    backgroundColor: theme.colors.surfaceMuted,
  },
  photoDimmed: { opacity: 0.4 },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, minWidth: 0 },
  dishName: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  dishDescription: { fontSize: 13, lineHeight: 18, color: theme.colors.textSecondary, marginTop: 2 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginTop: 6 },
  pillIntro: { fontSize: 11, color: theme.colors.textDisabled },
  pillNone: { fontSize: 11, fontStyle: 'italic', color: theme.colors.textDisabled },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  pillAmber: { backgroundColor: theme.colors.amberLight, borderWidth: 1, borderColor: theme.colors.amberBorder },
  pillAmberText: { fontSize: 11, fontWeight: '500', color: theme.colors.amberText },
  pillGreen: { backgroundColor: theme.colors.primaryLight },
  pillGreenText: { fontSize: 11, fontWeight: '500', color: theme.colors.success },
  pillGray: { backgroundColor: theme.colors.surfaceMuted, borderWidth: 1, borderColor: theme.colors.border },
  pillGrayText: { fontSize: 11, fontWeight: '500', color: theme.colors.textDisabled },
});
