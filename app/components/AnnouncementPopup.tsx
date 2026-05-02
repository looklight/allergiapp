import { useState, useEffect } from 'react';
import { View, Modal, StyleSheet, Image, Linking, Share, Dimensions, Pressable } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { theme } from '../../constants/theme';
import { fetchActiveAnnouncement, trackAnnouncementView, trackAnnouncementClick, resolveText, Announcement } from '../../services/announcements';
import { storage } from '../../utils/storage';
import { Analytics } from '../../services/analytics';
import { getAppLanguage } from '../../utils/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const POPUP_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 380);
const IMAGE_WIDTH = POPUP_WIDTH - 48; // content padding 24 su ogni lato
const MAX_IMAGE_HEIGHT = 220;

export default function AnnouncementPopup() {
  const [popup, setPopup] = useState<Announcement | null>(null);
  const [visible, setVisible] = useState(false);
  const [imageHeight, setImageHeight] = useState(160);

  useEffect(() => {
    const timer = setTimeout(checkPopup, 1500);
    return () => clearTimeout(timer);
  }, []);

  const checkPopup = async () => {
    const announcement = await fetchActiveAnnouncement();
    if (!announcement) return;

    const dismissed = await storage.getDismissedPopups();
    if (dismissed.includes(announcement.id)) return;

    setImageHeight(160);
    setPopup(announcement);
    setVisible(true);
    Analytics.logBannerViewed(announcement.id, 'info', resolveText(announcement.title, getAppLanguage()));
    trackAnnouncementView(announcement.id);
  };

  const handleDismiss = async () => {
    if (!popup) return;
    await storage.dismissPopup(popup.id);
    setVisible(false);
  };

  const handleButton = async () => {
    if (!popup) return;
    Analytics.logBannerClicked(popup.id, 'info', resolveText(popup.title, getAppLanguage()), popup.button_url ?? undefined);
    if (popup.button_action === 'share' || popup.button_action === 'url') {
      trackAnnouncementClick(popup.id);
    }

    if (popup.button_action === 'share') {
      try {
        const message = shareText ?? title;
        const url = popup.button_url ?? null;
        await Share.share(url ? { message: `${message}\n${url}` } : { message });
      } catch {}
    } else if (popup.button_action === 'url' && popup.button_url) {
      try {
        const url = popup.button_url.match(/^https?:\/\//)
          ? popup.button_url
          : `https://${popup.button_url}`;
        await Linking.openURL(url);
      } catch (e) {
        console.error('AnnouncementPopup: failed to open URL', e);
      }
    }

    await storage.dismissPopup(popup.id);
    setVisible(false);
  };

  if (!popup) return null;

  const lang = getAppLanguage();
  const title = resolveText(popup.title, lang);
  const body = resolveText(popup.body, lang);
  const buttonLabel = popup.button_label ? resolveText(popup.button_label, lang) : null;
  const shareText = popup.share_text ? resolveText(popup.share_text, lang) : null;

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
          <View style={styles.accentBar} />
          <Pressable style={styles.closeButton} onPress={handleDismiss} hitSlop={8}>
            <Text style={styles.closeIcon}>✕</Text>
          </Pressable>
          {popup.image_url && (
            <Image
              source={{ uri: popup.image_url }}
              style={[styles.image, { height: imageHeight }]}
              resizeMode="contain"
              onLoad={e => {
                const { width, height } = e.nativeEvent.source;
                if (width && height) {
                  setImageHeight(Math.min(POPUP_WIDTH * (height / width), MAX_IMAGE_HEIGHT));
                }
              }}
            />
          )}
          <View style={[styles.content, popup.image_url && styles.contentWithImage]}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{body}</Text>
            <View style={styles.buttons}>
              {buttonLabel && (
                <Button
                  mode="contained"
                  onPress={handleButton}
                  style={styles.primaryButton}
                  labelStyle={styles.primaryButtonLabel}
                >
                  {buttonLabel}
                </Button>
              )}
              <Button
                mode={buttonLabel ? 'text' : 'contained'}
                onPress={handleDismiss}
                style={buttonLabel ? styles.dismissButton : styles.primaryButton}
                labelStyle={buttonLabel ? styles.dismissButtonLabel : styles.primaryButtonLabel}
              >
                OK
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
  image: {
    width: '100%',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  contentWithImage: {
    paddingTop: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 14,
    zIndex: 1,
  },
  closeIcon: {
    fontSize: 22,
    color: theme.colors.textSecondary,
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
