import { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Text,
  List,
  RadioButton,
  Button,
  Divider,
  Portal,
  Dialog,
} from 'react-native-paper';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { storage } from '../utils/storage';
import { AppLanguage } from '../types';
import i18n, { setAppLanguage } from '../utils/i18n';

export default function SettingsScreen() {
  const router = useRouter();
  const [appLang, setAppLang] = useState<AppLanguage>('it');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [, forceUpdate] = useState({});

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    const settings = await storage.getSettings();
    setAppLang(settings.appLanguage);
  };

  const handleAppLanguageChange = async (lang: string) => {
    const language = lang as AppLanguage;
    setAppLang(language);
    await storage.setAppLanguage(language);
    setAppLanguage(language);
    // Force re-render to update all translations
    forceUpdate({});
  };

  const handleClearData = async () => {
    await storage.clearAll();
    setShowClearDialog(false);
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: i18n.t('settings.title'),
        }}
      />

      <List.Section>
        <List.Subheader>{i18n.t('settings.appLanguage')}</List.Subheader>

        <RadioButton.Group
          onValueChange={handleAppLanguageChange}
          value={appLang}
        >
          <List.Item
            title="Italiano"
            left={() => <Text style={styles.flag}>🇮🇹</Text>}
            right={() => <RadioButton value="it" />}
            onPress={() => handleAppLanguageChange('it')}
          />
          <Divider />
          <List.Item
            title="English"
            left={() => <Text style={styles.flag}>🇬🇧</Text>}
            right={() => <RadioButton value="en" />}
            onPress={() => handleAppLanguageChange('en')}
          />
        </RadioButton.Group>
      </List.Section>

      <Divider style={styles.sectionDivider} />

      <View style={styles.dangerSection}>
        <Button
          mode="outlined"
          textColor="#D32F2F"
          style={styles.clearButton}
          onPress={() => setShowClearDialog(true)}
        >
          {i18n.t('settings.clearData')}
        </Button>
      </View>

      <Portal>
        <Dialog
          visible={showClearDialog}
          onDismiss={() => setShowClearDialog(false)}
        >
          <Dialog.Title>{i18n.t('settings.clearData')}</Dialog.Title>
          <Dialog.Content>
            <Text>{i18n.t('settings.clearDataConfirm')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowClearDialog(false)}>
              {i18n.t('settings.cancel')}
            </Button>
            <Button textColor="#D32F2F" onPress={handleClearData}>
              {i18n.t('settings.confirm')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flag: {
    fontSize: 24,
    marginLeft: 16,
    alignSelf: 'center',
  },
  sectionDivider: {
    marginVertical: 16,
  },
  dangerSection: {
    padding: 16,
  },
  clearButton: {
    borderColor: '#D32F2F',
  },
});
