import { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { Text, Surface, TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/auth';
import { AVATARS, getAvatarById } from '../../constants/avatars';
import { PROFILE_COLORS, getProfileColor } from '../../constants/profileColors';
import DietaryNeedsEditor from '../../components/restaurants/DietaryNeedsEditor';
import type { DietaryNeeds } from '../../types';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const toggleLayout = () =>
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, userProfile, dietaryNeeds, refreshProfile } = useAuth();

  const currentDisplayName = userProfile?.displayName ?? user?.displayName ?? '';
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const email = userProfile?.email ?? user?.email ?? '';
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingColor, setSavingColor] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const stepAnim = useRef(new Animated.Value(0)).current;

  // Accordion state
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  const currentAvatarId = userProfile?.avatarId;
  const currentAvatar = currentAvatarId ? getAvatarById(currentAvatarId) : undefined;
  const currentProfileColor = getProfileColor(userProfile?.profileColor);
  const initial = currentDisplayName.charAt(0).toUpperCase() || '?';

  const handleSelectAvatar = async (avatarId: string) => {
    if (!user || savingAvatar) return;
    setSavingAvatar(true);
    try {
      await AuthService.updateUserAvatar(user.uid, avatarId);
      await refreshProfile();
    } catch {
      Alert.alert('Errore', "Impossibile salvare l'avatar. Riprova.");
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleSelectColor = async (colorHex: string) => {
    if (!user || savingColor) return;
    setSavingColor(true);
    try {
      await AuthService.updateProfileColor(user.uid, colorHex);
      await refreshProfile();
    } catch {
      Alert.alert('Errore', 'Impossibile salvare il colore. Riprova.');
    } finally {
      setSavingColor(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const trimmed = displayName.trim();
    if (!trimmed) {
      Alert.alert('Nome obbligatorio', 'Inserisci un nome visualizzato.');
      return;
    }
    if (trimmed === currentDisplayName) {
      router.back();
      return;
    }
    setSavingName(true);
    try {
      await AuthService.updateDisplayName(user.uid, trimmed);
      await refreshProfile();
      router.back();
    } catch {
      Alert.alert('Errore', 'Impossibile aggiornare il nome. Riprova.');
    } finally {
      setSavingName(false);
    }
  };

  const handleDeleteAccount = () => {
    setDeleteConfirmText('');
    setDeleteStep(1);
    stepAnim.setValue(1);
    setDeleteModalVisible(true);
  };

  const animateToStep = useCallback((target: 1 | 2) => {
    Animated.timing(stepAnim, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      setDeleteStep(target);
      if (target === 1) setDeleteConfirmText('');
      Animated.timing(stepAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    });
  }, [stepAnim]);

  const closeDeleteModal = useCallback(() => {
    setDeleteModalVisible(false);
    setDeleteStep(1);
    setDeleteConfirmText('');
    stepAnim.setValue(1);
  }, [stepAnim]);

  const executeDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await AuthService.deleteAccount(user.uid);
      closeDeleteModal();
      router.dismissAll();
    } catch (error: any) {
      closeDeleteModal();
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert(
          'Riautenticazione necessaria',
          'Per motivi di sicurezza, esci e accedi di nuovo prima di eliminare l\'account.'
        );
      } else {
        Alert.alert('Errore', 'Impossibile eliminare l\'account. Riprova.');
      }
    } finally {
      setDeleting(false);
    }
  };

  const deleteConfirmValid = deleteConfirmText.trim().toUpperCase() === 'ELIMINA';
  const nameChanged = displayName.trim() !== currentDisplayName;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.customHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.6}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifica profilo</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>

        {/* Profilo: avatar + nome */}
        <View style={styles.profileSection}>
          <View style={[styles.avatarRing, { borderColor: currentProfileColor.hex }]}>
            {currentAvatar ? (
              <Image source={currentAvatar.source} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: currentProfileColor.hex }]}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            )}
          </View>
          <Text style={styles.displayName}>{currentDisplayName}</Text>
          <Text style={styles.emailLabel}>{email}</Text>
        </View>

        {/* Cambia avatar — menuItem espandibile */}
        <View style={styles.expandableCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => { toggleLayout(); setAvatarOpen((v) => !v); }}
            activeOpacity={0.6}
          >
            <MaterialCommunityIcons name="emoticon-outline" size={22} color={theme.colors.primary} />
            <Text style={styles.menuItemText}>Cambia avatar</Text>
            <MaterialCommunityIcons
              name={avatarOpen ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
          {avatarOpen && (
            <View style={styles.expandedContent}>
              <View style={styles.avatarGrid}>
                {AVATARS.map((item) => {
                  const isSelected = currentAvatarId === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleSelectAvatar(item.id)}
                      activeOpacity={0.7}
                      disabled={savingAvatar}
                      style={[styles.avatarOption, isSelected && styles.avatarOptionSelected]}
                    >
                      <Image source={item.source} style={styles.avatarOptionImage} />
                      {isSelected && (
                        <View style={styles.checkBadge}>
                          <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Colore profilo — menuItem espandibile */}
        <View style={[styles.expandableCard, { marginTop: 10 }]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => { toggleLayout(); setColorOpen((v) => !v); }}
            activeOpacity={0.6}
          >
            <MaterialCommunityIcons name="palette-outline" size={22} color={theme.colors.primary} />
            <Text style={styles.menuItemText}>Colore profilo</Text>
            <View style={[styles.colorPreviewDot, { backgroundColor: currentProfileColor.hex }]} />
            <MaterialCommunityIcons
              name={colorOpen ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
          {colorOpen && (
            <View style={styles.expandedContent}>
              <View style={styles.colorRow}>
                {PROFILE_COLORS.map((color) => {
                  const isSelected = currentProfileColor.hex === color.hex;
                  return (
                    <TouchableOpacity
                      key={color.id}
                      onPress={() => handleSelectColor(color.hex)}
                      activeOpacity={0.7}
                      disabled={savingColor}
                      accessibilityLabel={color.label}
                    >
                      <View
                        style={[
                          styles.colorCircle,
                          { backgroundColor: color.hex },
                          isSelected && styles.colorCircleSelected,
                        ]}
                      >
                        {isSelected && (
                          <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Informazioni account */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.sectionTitle}>Informazioni account</Text>
          <TextInput
            mode="outlined"
            label="Nickname"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={30}
            outlineColor={theme.colors.divider}
            activeOutlineColor={theme.colors.primary}
            style={styles.textInput}
          />
          <TextInput
            mode="outlined"
            label="Email"
            value={email}
            editable={false}
            outlineColor={theme.colors.divider}
            style={[styles.textInput, styles.textInputDisabled]}
            textColor={theme.colors.textSecondary}
          />
          <Text style={styles.emailHint}>L'indirizzo email non è modificabile.</Text>
        </Surface>

        <Button
          mode="contained"
          onPress={handleSave}
          loading={savingName}
          disabled={savingName || !nameChanged}
          style={styles.saveButton}
          labelStyle={styles.saveButtonLabel}
        >
          Salva
        </Button>

        {/* Esigenze alimentari */}
        <Surface style={[styles.card, { marginTop: 20 }]} elevation={1}>
          <DietaryNeedsEditor
            initialNeeds={dietaryNeeds}
            lang="it"
            onSave={async (needs: DietaryNeeds) => {
              if (!user) return;
              await AuthService.updateDietaryNeeds(user.uid, needs);
              await refreshProfile();
            }}
          />
        </Surface>

        {/* Elimina account */}
        <Button
          mode="text"
          onPress={handleDeleteAccount}
          loading={deleting}
          disabled={deleting}
          textColor={theme.colors.error}
          icon="delete-outline"
          style={styles.deleteButton}
        >
          Elimina account
        </Button>
      </ScrollView>

      {/* Modal conferma eliminazione — 2 step animati */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <KeyboardAvoidingView
          style={styles.deleteModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDeleteModal} />
          <Surface style={styles.deleteModalContent} elevation={4}>
            <Animated.View style={[styles.deleteStepContainer, { opacity: stepAnim }]}>
              {deleteStep === 1 ? (
                <>
                  <MaterialCommunityIcons
                    name="shield-alert-outline"
                    size={48}
                    color={theme.colors.error}
                    style={styles.deleteModalIcon}
                  />
                  <Text style={styles.deleteModalTitle}>Elimina account</Text>
                  <Text style={styles.deleteModalText}>
                    Verranno eliminati in modo permanente:
                  </Text>
                  <View style={styles.deleteBulletList}>
                    <Text style={styles.deleteBulletItem}>{'•  Il tuo profilo e avatar'}</Text>
                    <Text style={styles.deleteBulletItem}>{'•  Le tue preferenze'}</Text>
                    <Text style={[styles.deleteBulletItem, styles.deleteBulletItemBold]}>{'•  Non potrai recuperare questi dati'}</Text>
                  </View>
                  <Text style={styles.deleteNote}>
                    I contributi alla community (ristoranti, piatti, recensioni) resteranno visibili in forma anonima.
                  </Text>
                  <View style={styles.deleteModalButtons}>
                    <Button
                      mode="outlined"
                      onPress={closeDeleteModal}
                      style={styles.deleteModalCancelBtn}
                    >
                      Annulla
                    </Button>
                    <Button
                      mode="contained"
                      onPress={() => animateToStep(2)}
                      buttonColor={theme.colors.error}
                      style={styles.deleteModalConfirmBtn}
                    >
                      Continua
                    </Button>
                  </View>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={48}
                    color={theme.colors.error}
                    style={styles.deleteModalIcon}
                  />
                  <Text style={styles.deleteModalText}>
                    Scrivi <Text style={styles.deleteModalBold}>ELIMINA</Text> per confermare
                  </Text>
                  <TextInput
                    mode="outlined"
                    placeholder="Scrivi ELIMINA"
                    value={deleteConfirmText}
                    onChangeText={setDeleteConfirmText}
                    autoCapitalize="characters"
                    outlineColor={theme.colors.divider}
                    activeOutlineColor={theme.colors.error}
                    style={styles.deleteModalInput}
                  />
                  <View style={styles.deleteModalButtons}>
                    <Button
                      mode="outlined"
                      onPress={() => animateToStep(1)}
                      style={styles.deleteModalCancelBtn}
                    >
                      Indietro
                    </Button>
                    <Button
                      mode="contained"
                      onPress={executeDeleteAccount}
                      loading={deleting}
                      disabled={!deleteConfirmValid || deleting}
                      buttonColor={theme.colors.error}
                      style={styles.deleteModalConfirmBtn}
                    >
                      Elimina definitivamente
                    </Button>
                  </View>
                </>
              )}
            </Animated.View>
          </Surface>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  customHeader: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },

  // Profilo hero
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    padding: 3,
    marginBottom: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  emailLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },

  // Menu item espandibile (stile profile.tsx)
  expandableCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Avatar grid
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  avatarOption: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'transparent',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  avatarOptionImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  checkBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Color picker
  colorPreviewDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 4,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },

  // Card info account
  card: {
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    padding: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: theme.colors.surface,
    marginBottom: 12,
  },
  textInputDisabled: {
    opacity: 0.7,
  },
  emailHint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: -4,
  },
  saveButton: {
    borderRadius: 10,
    marginTop: 16,
  },
  saveButtonLabel: {
    fontSize: 16,
  },
  deleteButton: {
    marginTop: 32,
  },

  // Delete modal
  deleteModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 24,
  },
  deleteModalContent: {
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    overflow: 'hidden',
  },
  deleteStepContainer: {
    width: '100%',
    alignItems: 'center',
  },
  deleteModalIcon: {
    marginBottom: 12,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  deleteModalText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  deleteModalBold: {
    fontWeight: '700',
    color: theme.colors.error,
  },
  deleteBulletList: {
    width: '100%',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  deleteBulletItem: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  deleteBulletItemBold: {
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  deleteNote: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  deleteModalInput: {
    backgroundColor: theme.colors.surface,
    width: '100%',
    marginBottom: 20,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalCancelBtn: {
    flex: 1,
    borderRadius: 10,
  },
  deleteModalConfirmBtn: {
    flex: 1,
    borderRadius: 10,
  },
});
