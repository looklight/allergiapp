import { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Switch,
} from 'react-native';
import { Text, Surface, TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/auth';
import HeaderBar from '../../components/HeaderBar';
import i18n from '../../utils/i18n';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, userProfile, refreshProfile } = useAuth();

  const currentDisplayName = userProfile?.display_name ?? user?.displayName ?? '';

  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [isAnonymous, setIsAnonymous] = useState(userProfile?.is_anonymous ?? false);
  const email = user?.email ?? '';
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const stepAnim = useRef(new Animated.Value(0)).current;

  const nameChanged = displayName.trim() !== currentDisplayName;
  const anonymousChanged = isAnonymous !== (userProfile?.is_anonymous ?? false);
  const hasChanges = nameChanged || anonymousChanged;

  const handleSave = async () => {
    if (!user) return;
    const trimmed = displayName.trim();
    if (!trimmed && !isAnonymous) {
      Alert.alert(i18n.t('restaurants.editProfile.nameRequiredTitle'), i18n.t('restaurants.editProfile.nameRequiredMsg'));
      return;
    }
    if (!hasChanges) {
      router.back();
      return;
    }
    setSaving(true);
    try {
      const promises: Promise<void>[] = [];
      if (nameChanged) promises.push(AuthService.updateDisplayName(user.uid, trimmed));
      if (anonymousChanged) promises.push(AuthService.updateAnonymous(user.uid, isAnonymous));
      await Promise.all(promises);
      await refreshProfile();
      router.back();
    } catch {
      Alert.alert(i18n.t('common.error'), i18n.t('restaurants.editProfile.saveError'));
    } finally {
      setSaving(false);
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
      Alert.alert(i18n.t('common.error'), i18n.t('restaurants.editProfile.deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  const deleteWord = i18n.t('restaurants.editProfile.deleteWord');
  const deleteConfirmValid = deleteConfirmText.trim().toUpperCase() === deleteWord.toUpperCase();
  const writeConfirmTemplate = i18n.t('restaurants.editProfile.deleteWriteConfirm');
  const [writeConfirmPrefix, writeConfirmSuffix = ''] = writeConfirmTemplate.split('{{word}}');

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <HeaderBar title={i18n.t('restaurants.editProfile.title')} />

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>

        {/* Informazioni account */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.sectionTitle}>{i18n.t('restaurants.editProfile.accountSection')}</Text>
          <TextInput
            mode="outlined"
            label={i18n.t('restaurants.editProfile.nicknameLabel')}
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={30}
            outlineColor={theme.colors.divider}
            activeOutlineColor={theme.colors.primary}
            style={styles.textInput}
          />
          <View style={styles.anonymousRow}>
            <View style={styles.anonymousTextGroup}>
              <Text style={styles.anonymousLabel}>{i18n.t('restaurants.editProfile.anonymousLabel')}</Text>
              <Text style={styles.anonymousHint}>
                {i18n.t('restaurants.editProfile.anonymousHint')}
              </Text>
            </View>
            <Switch
              value={isAnonymous}
              onValueChange={setIsAnonymous}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          <TextInput
            mode="outlined"
            label={i18n.t('restaurants.editProfile.emailLabel')}
            value={email}
            editable={false}
            outlineColor={theme.colors.divider}
            style={[styles.textInput, styles.textInputDisabled]}
            textColor={theme.colors.textSecondary}
          />
          <Text style={styles.emailHint}>{i18n.t('restaurants.editProfile.emailHint')}</Text>
        </Surface>

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving || !hasChanges}
          style={styles.saveButton}
          labelStyle={styles.saveButtonLabel}
        >
          {i18n.t('restaurants.editProfile.save')}
        </Button>

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
          {i18n.t('restaurants.editProfile.deleteAccount')}
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
                  <Text style={styles.deleteModalTitle}>{i18n.t('restaurants.editProfile.deleteAccount')}</Text>
                  <Text style={styles.deleteModalText}>
                    {i18n.t('restaurants.editProfile.deleteWillRemove')}
                  </Text>
                  <View style={styles.deleteBulletList}>
                    <Text style={styles.deleteBulletItem}>{i18n.t('restaurants.editProfile.deleteBullet1')}</Text>
                    <Text style={styles.deleteBulletItem}>{i18n.t('restaurants.editProfile.deleteBullet2')}</Text>
                    <Text style={[styles.deleteBulletItem, styles.deleteBulletItemBold]}>{i18n.t('restaurants.editProfile.deleteBullet3')}</Text>
                  </View>
                  <Text style={styles.deleteNote}>
                    {i18n.t('restaurants.editProfile.deleteNote')}
                  </Text>
                  <View style={styles.deleteModalButtons}>
                    <Button
                      mode="outlined"
                      onPress={closeDeleteModal}
                      style={styles.deleteModalCancelBtn}
                    >
                      {i18n.t('common.cancel')}
                    </Button>
                    <Button
                      mode="contained"
                      onPress={() => animateToStep(2)}
                      buttonColor={theme.colors.error}
                      style={styles.deleteModalConfirmBtn}
                    >
                      {i18n.t('restaurants.editProfile.continue')}
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
                    {writeConfirmPrefix}<Text style={styles.deleteModalBold}>{deleteWord}</Text>{writeConfirmSuffix}
                  </Text>
                  <TextInput
                    mode="outlined"
                    placeholder={i18n.t('restaurants.editProfile.deletePlaceholder', { word: deleteWord })}
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
                      {i18n.t('restaurants.editProfile.back')}
                    </Button>
                    <Button
                      mode="contained"
                      onPress={executeDeleteAccount}
                      loading={deleting}
                      disabled={!deleteConfirmValid || deleting}
                      buttonColor={theme.colors.error}
                      style={styles.deleteModalConfirmBtn}
                    >
                      {i18n.t('restaurants.editProfile.deleteFinal')}
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
  content: {
    flex: 1,
    padding: 20,
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
  anonymousRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 8,
  },
  anonymousTextGroup: {
    flex: 1,
    marginRight: 12,
    gap: 2,
  },
  anonymousLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  anonymousHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.overlay,
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
