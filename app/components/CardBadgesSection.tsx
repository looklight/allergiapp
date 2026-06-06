import { useState, useMemo } from 'react';
import { StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { Text, Button, Dialog, Portal } from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import { useAppContext } from '../../contexts/AppContext';
import { DEFAULT_VEGETARIAN_LEVEL } from '../../constants/dietModes';
import { UserCard } from '../../types/card';
import i18n from '../../utils/i18n';

const MAX_NAME_LENGTH = 24;

export default function CardBadgesSection() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { userCards, activeCardId, setActiveCard, createCard, deleteCard, canCreateMoreCards } = useAppContext();
  const [createVisible, setCreateVisible] = useState(false);
  const [name, setName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<UserCard | null>(null);

  const openCreateDialog = () => {
    setName('');
    setCreateVisible(true);
  };

  const closeCreateDialog = () => setCreateVisible(false);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreateVisible(false);
    const created = await createCard({
      name: trimmed,
      allergens: [],
      otherFoods: [],
      restrictions: [],
      dietModes: [],
      vegetarianLevel: DEFAULT_VEGETARIAN_LEVEL,
    });
    if (created) {
      await setActiveCard(created.id);
    }
  };

  const closeDeleteDialog = () => setDeleteTarget(null);

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    deleteCard(id);
  };

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
            {i18n.t('cardBadges.myCard')}
          </Text>
        </Pressable>

        {userCards.map((card) => {
          const isActive = activeCardId === card.id;
          return (
            <Pressable
              key={card.id}
              onPress={() => setActiveCard(card.id)}
              onLongPress={() => setDeleteTarget(card)}
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

      <Portal>
        <Dialog
          visible={createVisible}
          onDismiss={closeCreateDialog}
          style={[styles.dialog, styles.createDialogOffset]}
        >
          <Dialog.Content style={styles.dialogContent}>
            <Text style={styles.dialogTitle}>
              {i18n.t('cardBadges.newCardTitle')}
            </Text>
            <Text style={styles.dialogDescription}>
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
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              mode="text"
              onPress={closeCreateDialog}
              labelStyle={styles.secondaryButtonLabel}
              contentStyle={styles.dialogButtonContent}
              rippleColor="transparent"
            >
              {i18n.t('common.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleCreate}
              disabled={!name.trim()}
              labelStyle={styles.primaryButtonLabel}
              contentStyle={styles.dialogButtonContent}
              rippleColor="transparent"
            >
              {i18n.t('common.add')}
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={deleteTarget !== null}
          onDismiss={closeDeleteDialog}
          style={styles.dialog}
        >
          <Dialog.Content style={styles.dialogContent}>
            <Text style={styles.dialogTitle}>
              {i18n.t('cardBadges.deleteTitle')}
            </Text>
            <Text style={styles.dialogMessage}>
              {i18n.t('cardBadges.deleteMessage', { name: deleteTarget?.name ?? '' })}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              mode="text"
              onPress={closeDeleteDialog}
              labelStyle={styles.secondaryButtonLabel}
              contentStyle={styles.dialogButtonContent}
              rippleColor="transparent"
            >
              {i18n.t('common.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirmDelete}
              buttonColor={theme.colors.error}
              labelStyle={styles.primaryButtonLabel}
              contentStyle={styles.dialogButtonContent}
              rippleColor="transparent"
            >
              {i18n.t('common.delete')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  scroll: {
    marginBottom: 14,
    marginHorizontal: -16,
  },
  scrollContent: {
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
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
    fontSize: 18,
    fontWeight: '300',
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  dialog: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
  },
  createDialogOffset: {
    transform: [{ translateY: -100 }],
  },
  dialogContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  dialogDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  dialogMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  dialogButtonContent: {
    paddingHorizontal: 8,
  },
  primaryButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
});
