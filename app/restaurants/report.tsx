import { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Keyboard, Platform } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { REPORT_REASONS } from '../../constants/reportReasons';
import { RestaurantService } from '../../services/restaurantService';
import { useAuth } from '../../contexts/AuthContext';
import HeaderBar from '../../components/HeaderBar';

export default function ReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const descriptionY = useRef(0);
  const isDescriptionFocused = useRef(false);
  const { restaurantId, restaurantName } = useLocalSearchParams<{
    restaurantId: string;
    restaurantName?: string;
  }>();
  const { user } = useAuth();

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = selectedReason !== null && description.trim().length > 0;

  // Scroll al TextInput quando la tastiera si apre (event-driven, cross-platform)
  useEffect(() => {
    const event = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(event, () => {
      if (isDescriptionFocused.current) {
        scrollRef.current?.scrollToEnd({ animated: true });
      }
    });
    return () => sub.remove();
  }, []);

  const handleSubmit = async () => {
    if (!restaurantId || !user || !selectedReason || !description.trim()) return;
    Keyboard.dismiss();

    setIsSubmitting(true);
    const report = await RestaurantService.addReport(
      restaurantId,
      { reason: selectedReason, details: description.trim() },
      user.uid,
    );
    setIsSubmitting(false);

    if (report) {
      Alert.alert(
        'Grazie!',
        'La tua segnalazione è stata inviata. La esamineremo il prima possibile.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } else {
      Alert.alert('Errore', 'Non è stato possibile inviare la segnalazione. Riprova.');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <HeaderBar title="Segnala un problema" />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {/* Banner informativo */}
        <View style={styles.infoBanner}>
          <MaterialCommunityIcons name="information-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.infoBannerText}>
            AllergiApp è una piattaforma collaborativa: i ristoranti e le recensioni sono interamente gestiti dalla community. Usa questa segnalazione solo in caso di problemi reali (informazioni errate, contenuti inappropriati, ecc.). Le azioni che possiamo intraprendere sono limitate poiché non abbiamo rapporti diretti con i ristoranti.
          </Text>
        </View>

        <View style={styles.formSeparator} />

        {/* Info ristorante */}
        {restaurantName && (
          <>
            <View style={styles.restaurantInfo}>
              <MaterialCommunityIcons name="store" size={20} color={theme.colors.primary} />
              <Text style={styles.restaurantName} numberOfLines={1}>{restaurantName}</Text>
            </View>
            <View style={styles.separator} />
          </>
        )}

        {/* Motivi */}
        <Text style={styles.sectionTitle}>Motivo della segnalazione</Text>
        <View style={styles.reasonList}>
          {REPORT_REASONS.map(reason => {
            const isActive = selectedReason === reason.id;
            return (
              <TouchableOpacity
                key={reason.id}
                style={[styles.reasonChip, isActive && styles.reasonChipActive]}
                onPress={() => {
                  setSelectedReason(reason.id);
                  setTimeout(() => {
                    scrollRef.current?.scrollTo({ y: descriptionY.current - 20, animated: true });
                  }, 100);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.reasonIcon}>{reason.icon}</Text>
                <Text style={[styles.reasonText, isActive && styles.reasonTextActive]}>
                  {reason.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.separator} />

        {/* Descrizione */}
        <View onLayout={e => { descriptionY.current = e.nativeEvent.layout.y; }} />
        <Text style={styles.sectionTitle}>Descrizione</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Descrivi il problema in dettaglio..."
          multiline
          maxLength={500}
          mode="outlined"
          style={styles.textInput}
          outlineStyle={styles.textInputOutline}
          onFocus={() => { isDescriptionFocused.current = true; }}
          onBlur={() => { isDescriptionFocused.current = false; }}
        />
        <Text style={styles.charCount}>{description.length}/500</Text>

        <View style={styles.reviewHint}>
          <MaterialCommunityIcons name="lightbulb-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.reviewHintText}>
            Se la tua esperienza può essere utile ad altri, considera di lasciare una recensione. Spesso una recensione rispettosa e costruttiva aiuta più di una segnalazione.
          </Text>
        </View>
      </ScrollView>

      {/* Bottone submit fisso in basso */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[styles.submitButton, (!canSubmit || isSubmitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || !canSubmit}
          activeOpacity={0.7}
        >
          <Text style={styles.submitText}>
            {isSubmitting ? 'Invio in corso...' : 'Invia segnalazione'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 14,
  },
  formSeparator: {
    height: 28,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 14,
  },
  reasonList: {
    gap: 8,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  reasonChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  reasonIcon: {
    fontSize: 18,
  },
  reasonText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  reasonTextActive: {
    color: theme.colors.onPrimary,
  },
  textInput: {
    backgroundColor: theme.colors.surface,
    fontSize: 14,
    minHeight: 120,
  },
  textInputOutline: {
    borderRadius: 12,
    borderColor: theme.colors.border,
  },
  charCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  reviewHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 24,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 14,
  },
  reviewHintText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
