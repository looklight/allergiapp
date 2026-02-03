import { useState } from 'react';
import { View, Modal, StyleSheet, Image, Platform } from 'react-native';
import { Text, Button, TouchableRipple } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../utils/AppContext';
import { useTrackingPermission } from '../hooks/useTrackingPermission';
import { Analytics } from '../utils/analytics';
import { theme } from '../constants/theme';
import i18n from '../utils/i18n';
import LegalDialogs from './components/LegalDialogs';

interface ConsentModalProps {
  visible: boolean;
}

export default function ConsentModal({ visible }: ConsentModalProps) {
  const insets = useSafeAreaInsets();
  const { acceptLegalTerms, setTrackingConsent } = useAppContext();
  const { requestPermission, canRequestPermission } = useTrackingPermission();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);

  const handleAccept = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Accept legal terms
      await acceptLegalTerms();

      // Request tracking permission on iOS
      let trackingConsentResult;
      if (Platform.OS === 'ios' && canRequestPermission) {
        trackingConsentResult = await requestPermission();
      } else {
        // On Android or if already asked, use authorized
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

  // Hide consent modal when legal dialogs are open to prevent z-index issues
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
          <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.content}>
              {/* Logo */}
              <Image
                source={require('../assets/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />

              {/* Title */}
              <Text style={styles.title}>{i18n.t('consent.title')}</Text>

              {/* Disclaimer */}
              <Text style={styles.disclaimer}>
                {i18n.t('consent.disclaimerShort')}
              </Text>

              {/* Legal links */}
              <View style={styles.legalLinks}>
                <TouchableRipple
                  onPress={() => setShowPrivacyDialog(true)}
                  style={styles.legalLink}
                >
                  <Text style={styles.legalLinkText}>{i18n.t('consent.privacyTitle')}</Text>
                </TouchableRipple>
                <Text style={styles.separator}>|</Text>
                <TouchableRipple
                  onPress={() => setShowTermsDialog(true)}
                  style={styles.legalLink}
                >
                  <Text style={styles.legalLinkText}>{i18n.t('consent.termsTitle')}</Text>
                </TouchableRipple>
              </View>

              {/* Accept button */}
              <Button
                mode="contained"
                onPress={handleAccept}
                loading={isProcessing}
                disabled={isProcessing}
                style={styles.button}
                labelStyle={styles.buttonLabel}
              >
                {i18n.t('consent.acceptButton')}
              </Button>

              {/* Terms note */}
              <Text style={styles.termsNote}>
                {i18n.t('consent.termsNote')}
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Legal dialogs - rendered outside of Modal to appear on top */}
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
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
    borderRadius: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  legalLink: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  legalLinkText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  separator: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  button: {
    width: '100%',
    paddingVertical: 4,
    borderRadius: 12,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  termsNote: {
    fontSize: 11,
    color: '#999999',
    textAlign: 'center',
    marginTop: 16,
  },
});
