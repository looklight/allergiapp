import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList, ScrollView, Image, TouchableOpacity, ActivityIndicator, Modal, Pressable } from 'react-native';
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
  // dishId: si arriva qui toccando un piatto nel carosello della scheda, e
  // quel piatto si apre da solo. Senza, si atterra sulla lista.
  const { restaurantId, dishId } = useLocalSearchParams<{ restaurantId: string; dishId?: string }>();
  const { dietaryNeeds } = useAuth();

  const [dishes, setDishes] = useState<PartnerCardDish[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Il piatto aperto, come posizione nella lista stesa: da li' le freccine
  // sanno qual e' quello prima e quello dopo.
  const [openAt, setOpenAt] = useState<number | null>(null);

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

  // La lista stesa in una fila sola, nell'ordine in cui si legge.
  const inFila = useMemo(() => groups.flatMap((g) => g.dishes), [groups]);

  useEffect(() => {
    if (!dishId || inFila.length === 0) return;
    const i = inFila.findIndex((d) => d.id === dishId);
    if (i >= 0) setOpenAt(i);
    // solo all'arrivo: richiuso il piatto, non si riapre da solo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dishId, inFila.length]);

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
            // Senza piatti non c'e' niente da avvisare: succede solo se la
            // scheda sparisce fra un tocco e l'altro (abbonamento scaduto,
            // collegamento sospeso), e un avviso da solo su una pagina vuota
            // sarebbe peggio del vuoto.
            groups.length === 0 ? null : (
              <Text style={styles.disclaimer}>{i18n.t('restaurants.partnerCard.disclaimer')}</Text>
            )
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
                  onPress={() => setOpenAt(inFila.findIndex((d) => d.id === dish.id))}
                />
              ))}
            </View>
          )}
        />
      )}

      {openAt !== null && inFila[openAt] && (
        <DishDetail
          dish={inFila[openAt]}
          needs={needs}
          styles={styles}
          theme={theme}
          onPrev={openAt > 0 ? () => setOpenAt(openAt - 1) : null}
          onNext={openAt < inFila.length - 1 ? () => setOpenAt(openAt + 1) : null}
          onClose={() => setOpenAt(null)}
        />
      )}
    </View>
  );
}

/**
 * IL PIATTO APERTO. Serve perche' la riga della lista mostra quello che
 * riguarda chi guarda, mentre qui c'e' TUTTO: la foto grande, la descrizione
 * intera, e soprattutto l'elenco completo degli allergeni dichiarati — chi ha
 * un'allergia vuole controllare la lista intera prima di ordinare, non solo
 * il pezzo che lo riguarda.
 *
 * E' la stessa finestra del menu' al tavolo (partner: DishDetailSheet): un
 * popup al centro, la foto 4:3 cosi' gli allergeni stanno nella stessa
 * schermata del piatto, e le freccine per passare al piatto prima o dopo —
 * chi legge un menu' confronta due o tre piatti, e senza di quelle ogni
 * confronto costa chiudi-scorri-riapri.
 */
function DishDetail({
  dish, needs, styles, theme, onPrev, onNext, onClose,
}: {
  dish: PartnerCardDish;
  needs: ViewerNeeds;
  styles: ReturnType<typeof makeStyles>;
  theme: AppTheme;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  onClose: () => void;
}) {
  const lang = i18n.locale as Language;
  const nome = (code: string) => getRestrictionById(code)?.translations[lang] ?? code;
  const daEvitare = new Set(needs.allergens.filter((c) => dish.allergens.includes(c)));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.detailBackdrop}>
        {/* Il velo e' un fratello della finestra, non suo genitore: un
            Pressable senza onPress non trattiene il tocco, e toccare la
            finestra chiudeva il piatto. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.detailCard}>
          {/* I comandi restano in vista: la X di un popup che se ne va in
              cima e' la X che non si trova piu'. */}
          <View style={styles.detailBar}>
            <Comando icon="chevron-left" onPress={onPrev} theme={theme} styles={styles} />
            <Comando icon="chevron-right" onPress={onNext} theme={theme} styles={styles} />
            <View style={styles.titleSpacer} />
            <Comando icon="close" onPress={onClose} theme={theme} styles={styles} />
          </View>

          <ScrollView contentContainerStyle={styles.detailBody}>
            {dish.photoUrl !== '' && (
              <Image source={{ uri: dish.photoUrl }} style={styles.detailPhoto} resizeMode="cover" />
            )}
            <Text style={styles.detailName}>{dish.name}</Text>
            {dish.description.trim() !== '' && (
              <Text style={styles.detailDescription}>{dish.description}</Text>
            )}

            <Text style={styles.detailLabel}>{i18n.t('restaurants.partnerCard.allergensTitle')}</Text>
            {dish.allergens.length === 0 ? (
              <Text style={styles.detailEmpty}>{i18n.t('restaurants.partnerCard.noAllergensDeclared')}</Text>
            ) : (
              <View style={styles.detailChips}>
                {dish.allergens.map((code) => {
                  // In ambra solo quelli che riguardano chi guarda: gli altri
                  // restano neutri, non e' colpa loro.
                  const evitare = daEvitare.has(code);
                  return (
                    <View key={code} style={[styles.pill, evitare ? styles.pillAmber : styles.pillGray]}>
                      <Text style={evitare ? styles.pillAmberText : styles.pillGrayText}>{nome(code)}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {dish.diets.length > 0 && (
              <>
                <Text style={styles.detailLabel}>{i18n.t('restaurants.partnerCard.dietsTitle')}</Text>
                <View style={styles.detailChips}>
                  {dish.diets.map((code) => (
                    <View key={code} style={[styles.pill, styles.pillGreen]}>
                      <MaterialCommunityIcons name="check" size={11} color={theme.colors.success} />
                      <Text style={styles.pillGreenText}>{nome(code)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Le note ULTIME, dopo le compatibilita': prima a chi va bene il
                piatto, poi com'e' fatto. */}
            {dish.notes.length > 0 && (
              <>
                <Text style={styles.detailLabel}>{i18n.t('restaurants.partnerCard.notesTitle')}</Text>
                <View style={styles.detailChips}>
                  {sortNotes(dish.notes).map((code) => (
                    <View key={code} style={[styles.pill, styles.pillGray]}>
                      <Text style={styles.pillGrayText}>{noteName(code, i18n.locale)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Le freccine non spariscono mai: si spengono. Arrivati in fondo, l'altra si
// sposterebbe sotto il dito.
function Comando({
  icon, onPress, theme, styles,
}: {
  icon: 'chevron-left' | 'chevron-right' | 'close';
  onPress: (() => void) | null;
  theme: AppTheme;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <TouchableOpacity
      style={styles.detailCommand}
      onPress={onPress ?? undefined}
      disabled={onPress === null}
      activeOpacity={0.6}
    >
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={onPress === null ? theme.colors.textDisabled : theme.colors.textPrimary}
      />
    </TouchableOpacity>
  );
}

function DishRow({
  dish, compat, needs, first, styles, theme, onPress,
}: {
  dish: PartnerCardDish;
  compat: DishCompat | null;
  needs: ViewerNeeds;
  first: boolean;
  styles: ReturnType<typeof makeStyles>;
  theme: AppTheme;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, !first && styles.rowDivided]}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={dish.name}
    >
      <View>
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
      </View>

      <View style={styles.rowBody}>
        <Text style={styles.dishName}>{dish.name}</Text>
        {dish.description.trim() !== '' && (
          <Text style={styles.dishDescription}>{dish.description}</Text>
        )}
        <View style={styles.pills}>
          <DishPills dish={dish} compat={compat} needs={needs} styles={styles} theme={theme} />
        </View>
      </View>
    </TouchableOpacity>
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

  titleSpacer: { flex: 1 },
  detailBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  detailCard: {
    width: '100%',
    maxHeight: '100%',
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  detailBar: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingTop: 8 },
  detailCommand: { padding: 6 },
  detailBody: { paddingHorizontal: 16, paddingBottom: 20 },
  detailPhoto: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: theme.colors.surfaceMuted },
  detailName: { marginTop: 12, fontSize: 19, fontWeight: '600', color: theme.colors.textPrimary },
  detailDescription: { marginTop: 6, fontSize: 15, lineHeight: 21, color: theme.colors.textSecondary },
  detailLabel: {
    marginTop: 14,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.textDisabled,
  },
  detailEmpty: { marginTop: 4, fontSize: 15, color: theme.colors.textSecondary },
  detailChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
});
