import { Linking } from 'react-native';
import { Portal, Dialog, Button, Text } from 'react-native-paper';
import i18n from '../../utils/i18n';
import { APP_CONFIG } from '../../constants/config';

interface LegalDialogsProps {
  showPrivacyDialog: boolean;
  showDisclaimerDialog: boolean;
  onDismissPrivacy: () => void;
  onDismissDisclaimer: () => void;
  onNavigateToLegal?: () => void;
}

export default function LegalDialogs({
  showPrivacyDialog,
  showDisclaimerDialog,
  onDismissPrivacy,
  onDismissDisclaimer,
}: LegalDialogsProps) {

  const handlePrivacyFullDocument = () => {
    Linking.openURL(`${APP_CONFIG.WEBSITE_URL}/privacy.html`);
  };

  const handleTermsFullDocument = () => {
    Linking.openURL(`${APP_CONFIG.WEBSITE_URL}/terms.html`);
  };

  return (
    <Portal>
      <Dialog visible={showPrivacyDialog} onDismiss={onDismissPrivacy}>
        <Dialog.Title>{i18n.t('settings.privacyPolicy')}</Dialog.Title>
        <Dialog.Content>
          <Text style={{ lineHeight: 22 }}>{i18n.t('settings.privacyContent')}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={handlePrivacyFullDocument}>
            {i18n.t('settings.readFullDocument')}
          </Button>
          <Button onPress={onDismissPrivacy}>OK</Button>
        </Dialog.Actions>
      </Dialog>

      <Dialog visible={showDisclaimerDialog} onDismiss={onDismissDisclaimer}>
        <Dialog.Title>{i18n.t('settings.disclaimer')}</Dialog.Title>
        <Dialog.Content>
          <Text style={{ lineHeight: 22 }}>{i18n.t('settings.disclaimerContent')}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={handleTermsFullDocument}>
            {i18n.t('settings.readFullDocument')}
          </Button>
          <Button onPress={onDismissDisclaimer}>OK</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
