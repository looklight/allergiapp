import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import i18n from '../utils/i18n';
import type { UsernameValidationState } from '../hooks/useUsernameValidation';

interface Props {
  state: UsernameValidationState;
  isAnonymous?: boolean;
}

/**
 * Riga di feedback sotto un input username:
 * mostra icone+messaggi (check verde, errore, spinner di verifica) oppure
 * in stato idle un hint sul formato consentito.
 * Se isAnonymous, mostra una nota aggiuntiva "(non visibile mentre sei anonimo)".
 */
export default function UsernameFeedback({ state, isAnonymous }: Props) {
  return (
    <View style={styles.container}>
      {renderRow(state)}
      {isAnonymous && (
        <Text style={styles.anonymousNote}>{i18n.t('username.anonymousNote')}</Text>
      )}
    </View>
  );
}

function renderRow(state: UsernameValidationState) {
  switch (state.kind) {
    case 'idle':
      return <Text style={styles.hint}>{i18n.t('username.hint')}</Text>;
    case 'too-short':
      return <Row icon="alert-circle-outline" color={theme.colors.warning} text={i18n.t('username.tooShort')} />;
    case 'too-long':
      return <Row icon="alert-circle-outline" color={theme.colors.warning} text={i18n.t('username.tooLong')} />;
    case 'invalid-format':
      return <Row icon="alert-circle-outline" color={theme.colors.warning} text={i18n.t('username.formatError')} />;
    case 'checking':
      return (
        <View style={styles.row}>
          <ActivityIndicator size="small" color={theme.colors.textSecondary} />
          <Text style={styles.hint}>{i18n.t('username.checking')}</Text>
        </View>
      );
    case 'available':
      return <Row icon="check-circle-outline" color={theme.colors.success ?? theme.colors.primary} text={i18n.t('username.available')} />;
    case 'unavailable':
      return <Row icon="close-circle-outline" color={theme.colors.error} text={i18n.t('username.unavailable')} />;
  }
}

function Row({ icon, color, text }: { icon: any; color: string; text: string }) {
  return (
    <View style={styles.row}>
      <MaterialCommunityIcons name={icon} size={16} color={color} />
      <Text style={[styles.message, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: -8,
    marginBottom: 8,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  message: {
    fontSize: 12,
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  anonymousNote: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
});
