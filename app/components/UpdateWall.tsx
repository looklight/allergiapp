import { useMemo } from 'react';
import { StyleSheet, Image } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import { openStoreListing } from '../../utils/storeLinks';
import i18n from '../../utils/i18n';

const logo = require('../../assets/splash-icon.png');

/**
 * Muro "aggiorna per continuare": sostituisce l'intera app, non e' un overlay.
 * Nessun modo per chiuderlo — e' il livello duro del gate (mig 083), da usare
 * raramente e solo per rotture vere.
 */
export default function UpdateWall() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <Image source={logo} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>{i18n.t('update.wallTitle')}</Text>
      <Text style={styles.message}>{i18n.t('update.wallMessage')}</Text>
      <Button mode="contained" onPress={openStoreListing} style={styles.button}>
        {i18n.t('update.openStore')}
      </Button>
    </SafeAreaView>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      backgroundColor: theme.colors.surface,
    },
    logo: { width: 120, height: 120, marginBottom: 24 },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginBottom: 12,
    },
    message: {
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 28,
    },
    button: { minWidth: 200 },
  });
