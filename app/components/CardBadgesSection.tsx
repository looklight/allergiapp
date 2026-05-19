import { useState } from 'react';
import { StyleSheet, ScrollView, Pressable, Modal, View, TextInput, Dimensions } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { theme } from '../../constants/theme';
import { useAppContext } from '../../contexts/AppContext';
import { DEFAULT_VEGETARIAN_LEVEL } from '../../constants/dietModes';
import i18n from '../../utils/i18n';

const MAX_NAME_LENGTH = 24;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MODAL_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 380);

export default function CardBadgesSection() {
  const { userCards, activeCardId, setActiveCard, createCard, deleteCard, canCreateMoreCards } = useAppContext();
  const [createVisible, setCreateVisible] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreateDialog = () => {
    setName('');
    setCreateVisible(true);
  };

  const closeCreateDialog = () => {
    if (saving) return;
    setCreateVisible(false);
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    const created = await createCard({
      name: trimmed,
      allergens: [],
      otherFoods: [],
      restrictions: [],
      dietModes: [],
      vegetarianLevel: DEFAULT_VEGETARIAN_LEVEL,
    });
    setSaving(false);
    setCreateVisible(false);
    if (created) {
      await setActiveCard(created.id);
    }
  };

  const closeDeleteDialog = () => {
    if (deleting) return;
    setDeleteTargetId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    await deleteCard(deleteTargetId);
    setDeleting(false);
    setDeleteTargetId(null);
  };

  const deleteTargetCard = deleteTargetId
    ? userCards.find((c) => c.id === deleteTargetId) ?? null
    : null;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
      >
        <Pressable
          onPress={() => setActiveCard(null)}
          style={[styles.pill, activeCardId === null && styles.pillActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: activeCardId === null }}
        >
          <Text style={[styles.pillText, activeCardId === null && styles.pillTextActive]}>
            {i18n.t('cardBadges.myAllergies')}
          </Text>
        </Pressable>

        {userCards.map((card) => {
          const isActive = activeCardId === card.id;
          return (
            <Pressable
              key={card.id}
              onPress={() => setActiveCard(card.id)}
              onLongPress={() => setDeleteTargetId(card.id)}
              delayLongPress={400}
              style={[styles.pill, isActive && styles.pillActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityHint={i18n.t('cardBadges.longPressHint')}
            >
              <Text
                numberOfLines={1}
                style={[styles.pillText, isActive && styles.pillTextActive]}
              >
                {card.name}
              </Text>
            </Pressable>
          );
        })}

        {canCreateMoreCards && (
          <Pressable
            onPress={openCreateDialog}
            style={[styles.pill, styles.pillAdd]}
            accessibilityRole="button"
            accessibilityLabel={i18n.t('cardBadges.addCard')}
          >
            <Text style={styles.pillAddText}>+</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal
        visible={createVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeCreateDialog}
      >
        <Pressable style={styles.overlay} onPress={closeCreateDialog}>
          <Pressable style={styles.modalContainer} onPress={() => {}}>
            <Pressable style={styles.closeButton} onPress={closeCreateDialog} hitSlop={8}>
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{i18n.t('cardBadges.newCardTitle')}</Text>
              <Text style={styles.modalDescription}>
                {i18n.t('cardBadges.newCardDescription')}
              </Text>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder={i18n.t('cardBadges.nameLabel')}
                placeholderTextColor={theme.colors.textSecondary}
                maxLength={MAX_NAME_LENGTH}
                autoFocus
                selectionColor={theme.colors.primary}
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />
              <View style={styles.modalButtons}>
                <Button
                  mode="text"
                  onPress={closeCreateDialog}
                  disabled={saving}
                  style={styles.secondaryButton}
                  labelStyle={styles.secondaryButtonLabel}
                >
                  {i18n.t('common.cancel')}
                </Button>
                <Button
                  mode="contained"
                  onPress={handleCreate}
                  disabled={!name.trim() || saving}
                  loading={saving}
                  style={styles.primaryButton}
                  labelStyle={styles.primaryButtonLabel}
                >
                  {i18n.t('common.add')}
                </Button>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={deleteTargetCard !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeDeleteDialog}
      >
        <Pressable style={styles.overlay} onPress={closeDeleteDialog}>
          <Pressable style={styles.modalContainer} onPress={() => {}}>
            <Pressable style={styles.closeButton} onPress={closeDeleteDialog} hitSlop={8}>
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{i18n.t('cardBadges.deleteTitle')}</Text>
              <Text style={styles.modalMessage}>
                {i18n.t('cardBadges.deleteMessage', { name: deleteTargetCard?.name ?? '' })}
              </Text>
              <View style={styles.modalButtons}>
                <Button
                  mode="text"
                  onPress={closeDeleteDialog}
                  disabled={deleting}
                  style={styles.secondaryButton}
                  labelStyle={styles.secondaryButtonLabel}
                >
                  {i18n.t('common.cancel')}
                </Button>
                <Button
                  mode="contained"
                  onPress={handleConfirmDelete}
                  disabled={deleting}
                  loading={deleting}
                  style={[styles.primaryButton, { backgroundColor: theme.colors.error }]}
                  labelStyle={styles.primaryButtonLabel}
                >
                  {i18n.t('common.delete')}
                </Button>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginBottom: 14,
  },
  scrollContent: {
    gap: 8,
    alignItems: 'center',
    paddingRight: 4,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    maxWidth: 200,
  },
  pillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  pillTextActive: {
    color: theme.colors.onPrimary,
  },
  pillAdd: {
    width: 36,
    height: 36,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillAddText: {
    fontSize: 22,
    fontWeight: '400',
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: MODAL_WIDTH,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 14,
    zIndex: 1,
  },
  closeIcon: {
    fontSize: 22,
    color: theme.colors.textSecondary,
  },
  modalContent: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalMessage: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  primaryButton: {
    borderRadius: theme.radius.lg,
    paddingHorizontal: 6,
  },
  primaryButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: theme.radius.lg,
  },
  secondaryButtonLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});
