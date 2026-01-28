import { Portal, Dialog, Button, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import i18n from '../../utils/i18n';

interface LegalDialogsProps {
  showPrivacyDialog: boolean;
  showDisclaimerDialog: boolean;
  onDismissPrivacy: () => void;
  onDismissDisclaimer: () => void;
}

export default function LegalDialogs({
  showPrivacyDialog,
  showDisclaimerDialog,
  onDismissPrivacy,
  onDismissDisclaimer,
}: LegalDialogsProps) {
  const router = useRouter();

  const handlePrivacyFullDocument = () => {
    onDismissPrivacy();
    router.push('/legal');
  };

  const handleDisclaimerFullDocument = () => {
    onDismissDisclaimer();
    router.push('/legal');
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
          <Button onPress={handleDisclaimerFullDocument}>
            {i18n.t('settings.readFullDocument')}
          </Button>
          <Button onPress={onDismissDisclaimer}>OK</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
