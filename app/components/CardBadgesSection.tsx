import { useState } from 'react';
import { StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, Dialog, Portal, TextInput, Button } from 'react-native-paper';
import { theme } from '../../constants/theme';
import { useAppContext } from '../../contexts/AppContext';
import { DEFAULT_VEGETARIAN_LEVEL } from '../../constants/dietModes';
import i18n from '../../utils/i18n';

const MAX_NAME_LENGTH = 24;

export default function CardBadgesSection() {
  const { userCards, activeCardId, setActiveCard, createCard, canCreateMoreCards } = useAppContext();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const openCreateDialog = () => {
    setName('');
    setDialogVisible(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogVisible(false);
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
    setDialogVisible(false);
    if (created) {
      await setActiveCard(created.id);
    }
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
            {i18n.t('cardBadges.myAllergies')}
          </Text>
        </Pressable>

        {userCards.map((card) => {
          const isActive = activeCardId === card.id;
          return (
            <Pressable
              key={card.id}
              onPress={() => setActiveCard(card.id)}
              style={[styles.pill, isActive && styles.pillActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
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
        <Dialog visible={dialogVisible} onDismiss={closeDialog}>
          <Dialog.Title>{i18n.t('cardBadges.newCardTitle')}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label={i18n.t('cardBadges.nameLabel')}
              value={name}
              onChangeText={setName}
              maxLength={MAX_NAME_LENGTH}
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDialog} disabled={saving}>
              {i18n.t('common.cancel')}
            </Button>
            <Button onPress={handleCreate} disabled={!name.trim() || saving} loading={saving}>
              {i18n.t('common.add')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    paddingHorizontal: 16,
    minWidth: 44,
    alignItems: 'center',
  },
  pillAddText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
