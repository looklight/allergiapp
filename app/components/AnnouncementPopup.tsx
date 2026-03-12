import { useState, useEffect } from 'react';
import { View, Modal, StyleSheet, Image, Linking, Dimensions, Pressable } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { theme } from '../../constants/theme';
import { RemoteConfig, PopupConfig } from '../../services/remoteConfig';
import { storage } from '../../utils/storage';
import { Analytics } from '../../services/analytics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AnnouncementPopup() {
  const [popup, setPopup] = useState<PopupConfig | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Delay check to ensure Remote Config has fetched after app init
    const timer = setTimeout(checkPopup, 1500);
    return () => clearTimeout(timer);
  }, []);

  const checkPopup = async () => {
    const config = RemoteConfig.getPopup();
    if (!config) return;

    const dismissed = await storage.getDismissedPopups();
    if (dismissed.includes(config.id)) return;

    setPopup(config);
    setVisible(true);
    Analytics.logBannerViewed(config.id, 'info', config.title);
  };

  const handleDismiss = async () => {
    if (!popup) return;
    await storage.dismissPopup(popup.id);
    setVisible(false);
  };

  const handleButton = async () => {
    if (!popup) return;
    Analytics.logBannerClicked(popup.id, 'info', popup.title, popup.buttonUrl);
    if (popup.buttonUrl) {
      try {
        await Linking.openURL(popup.buttonUrl);
      } catch {
        // Invalid URL, ignore
      }
    }
    await storage.dismissPopup(popup.id);
    setVisible(false);
  };

  if (!popup) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <Pressable style={styles.overlay} onPress={handleDismiss}>
        <Pressable style={styles.container} onPress={() => {}}>
          {/* Accent bar */}
          <View style={styles.accentBar} />

          <View style={styles.content}>
            {/* Image */}
            {popup.imageUrl && (
              <Image
                source={{ uri: popup.imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
            )}

            {/* Title */}
            <Text style={styles.title}>{popup.title}</Text>

            {/* Message */}
            <Text style={styles.message}>{popup.message}</Text>

            {/* Buttons */}
            <View style={styles.buttons}>
              {popup.buttonText && (
                <Button
                  mode="contained"
                  onPress={handleButton}
                  style={styles.primaryButton}
                  labelStyle={styles.primaryButtonLabel}
                >
                  {popup.buttonText}
                </Button>
              )}
              <Button
                mode={popup.buttonText ? 'text' : 'contained'}
                onPress={handleDismiss}
                style={popup.buttonText ? styles.dismissButton : styles.primaryButton}
                labelStyle={popup.buttonText ? styles.dismissButtonLabel : styles.primaryButtonLabel}
              >
                {popup.dismissText}
              </Button>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 380,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  accentBar: {
    height: 4,
    backgroundColor: theme.colors.primary,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttons: {
    width: '100%',
    gap: 8,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 2,
  },
  primaryButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  dismissButton: {
    borderRadius: 12,
  },
  dismissButtonLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});
