import { useState, useEffect, useMemo } from 'react';
import { View, Modal, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { usePathname } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import { isPopupSuppressedPath, POPUP_REVEAL_DELAY_MS } from '../../utils/globalPopups';
import { openStoreListing } from '../../utils/storeLinks';
import { storage } from '../../utils/storage';
import i18n from '../../utils/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  /** Versione consigliata dal server, o null se non c'e' niente da suggerire.
   *  Fa anche da chiave del "gia' chiuso": l'avviso ricompare solo se cambia. */
  recommendedVersion: string | null;
}

/**
 * Avviso "aggiornamento disponibile": livello morbido del gate versione
 * (mig 083). Chiudibile, e mostrato UNA VOLTA per versione consigliata — chi
 * lo chiude non lo rivede finche' non esce una versione successiva.
 */
export default function UpdatePopup({ recommendedVersion }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!recommendedVersion) {
      setVisible(false);
      return;
    }
    let cancelled = false;
    storage.getDismissedUpdateVersion().then(dismissed => {
      if (!cancelled && dismissed !== recommendedVersion) setVisible(true);
    });
    return () => {
      cancelled = true;
    };
  }, [recommendedVersion]);

  // Stesso gate degli altri popup globali: niente interruzioni nei flussi
  // auth/onboarding e comparsa ritardata per non flashare sulla transizione.
  const eligible = visible && !isPopupSuppressedPath(pathname);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!eligible) {
      setShown(false);
      return;
    }
    const timer = setTimeout(() => setShown(true), POPUP_REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [eligible]);

  const handleDismiss = async () => {
    if (recommendedVersion) await storage.dismissUpdateVersion(recommendedVersion);
    setVisible(false);
  };

  const handleUpdate = async () => {
    await handleDismiss();
    openStoreListing();
  };

  if (!recommendedVersion) return null;

  return (
    <Modal
      visible={shown}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <Pressable style={styles.overlay} onPress={handleDismiss}>
        <Pressable style={styles.container} onPress={() => {}}>
          <View style={styles.content}>
            <Text style={styles.title}>{i18n.t('update.popupTitle')}</Text>
            <Text style={styles.message}>{i18n.t('update.popupMessage')}</Text>
            <Button mode="contained" onPress={handleUpdate} style={styles.primaryButton}>
              {i18n.t('update.openStore')}
            </Button>
            <Button mode="text" onPress={handleDismiss} style={styles.secondaryButton}>
              {i18n.t('update.later')}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      width: SCREEN_WIDTH * 0.85,
      maxWidth: 380,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      overflow: 'hidden',
      elevation: 8,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
    },
    content: { padding: 24 },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginBottom: 8,
    },
    message: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    primaryButton: { borderRadius: 12 },
    secondaryButton: { marginTop: 4 },
  });
