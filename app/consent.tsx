import { useState } from 'react';
import { View, StyleSheet, Pressable, Platform, Modal, Image } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { theme } from '../constants/theme';
import i18n from '../utils/i18n';
import { useAppContext } from '../utils/AppContext';
import LegalDialogs from './components/LegalDialogs';
import { useTrackingPermission } from '../hooks/useTrackingPermission';
import { Analytics } from '../utils/analytics';

interface ConsentModalProps {
  visible: boolean;
}

export default function ConsentModal({ visible }: ConsentModalProps) {
  const { acceptLegalTerms, setTrackingConsent } = useAppContext();
  const { requestPermission, canRequestPermission } = useTrackingPermission();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);

  const handleAccept = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      await acceptLegalTerms();

      let trackingConsentResult;
      if (Platform.OS === 'ios' && canRequestPermission) {
        trackingConsentResult = await requestPermission();
      } else {
        trackingConsentResult = {
          status: 'authorized' as const,
          askedAt: new Date().toISOString(),
        };
      }

      await setTrackingConsent(trackingConsentResult);
      Analytics.setTrackingConsent(trackingConsentResult);
      Analytics.logAppOpened();
    } catch (error) {
      console.error('Error during consent flow:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const isLegalDialogOpen = showPrivacyDialog || showTermsDialog;

  return (
    <>
      <Modal
        visible={visible && !isLegalDialogOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <Surface style={styles.modal} elevation={5}>
            <Image
              source={require('../assets/icon.png')}
              style={styles.logo}
            />
            <Text style={styles.title}>{i18n.t('consent.title')}</Text>

            <Text style={styles.disclaimer}>{i18n.t('consent.disclaimerShort')}</Text>

            <Button
              mode="contained"
              onPress={handleAccept}
              disabled={isProcessing}
              loading={isProcessing}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              {i18n.t('consent.acceptButton')}
            </Button>

            <Text style={styles.termsNote}>{i18n.t('consent.termsNote')}</Text>

            <View style={styles.linksRow}>
              <Pressable onPress={() => setShowPrivacyDialog(true)} hitSlop={8}>
                <Text style={styles.link}>{i18n.t('consent.privacyTitle')}</Text>
              </Pressable>
              <Text style={styles.separator}>·</Text>
              <Pressable onPress={() => setShowTermsDialog(true)} hitSlop={8}>
                <Text style={styles.link}>{i18n.t('consent.termsTitle')}</Text>
              </Pressable>
            </View>
          </Surface>
        </View>
      </Modal>

      <LegalDialogs
        showPrivacyDialog={showPrivacyDialog}
        showDisclaimerDialog={showTermsDialog}
        onDismissPrivacy={() => setShowPrivacyDialog(false)}
        onDismissDisclaimer={() => setShowTermsDialog(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modal: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  button: {
    borderRadius: 12,
    width: '100%',
  },
  buttonContent: {
    paddingVertical: 6,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  termsNote: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  link: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  separator: {
    fontSize: 14,
    color: theme.colors.textDisabled,
  },
});
