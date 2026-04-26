import { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import i18n from '../../utils/i18n';

export type ReviewReportReason = 'inappropriate' | 'spam' | 'false_info';

type Reason = {
  id: ReviewReportReason;
  labelKey: string;
};

const REASONS: Reason[] = [
  { id: 'inappropriate', labelKey: 'restaurants.detail.reportInappropriate' },
  { id: 'spam', labelKey: 'restaurants.detail.reportSpam' },
  { id: 'false_info', labelKey: 'restaurants.detail.reportFalse' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: ReviewReportReason) => Promise<void>;
};

export default function ReportReviewModal({ visible, onClose, onSubmit }: Props) {
  const [selected, setSelected] = useState<ReviewReportReason | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelected(null);
      setIsSubmitting(false);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!selected || isSubmitting) return;
    setIsSubmitting(true);
    await onSubmit(selected);
    setIsSubmitting(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.content} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.title}>{i18n.t('restaurants.detail.reportTitle')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8} activeOpacity={0.6}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <View style={styles.infoBanner}>
              <MaterialCommunityIcons name="information-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.infoBannerText}>
                {i18n.t('restaurants.detail.reportInfoBanner')}
              </Text>
            </View>

            <Text style={styles.prompt}>{i18n.t('restaurants.detail.reportPrompt')}</Text>

            <View style={styles.reasonList}>
              {REASONS.map(reason => {
                const isActive = selected === reason.id;
                return (
                  <TouchableOpacity
                    key={reason.id}
                    style={[styles.reasonChip, isActive && styles.reasonChipActive]}
                    onPress={() => setSelected(reason.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.radio, isActive && styles.radioActive]}>
                      {isActive && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.reasonText, isActive && styles.reasonTextActive]}>
                      {i18n.t(reason.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton} activeOpacity={0.7} disabled={isSubmitting}>
              <Text style={styles.cancelText}>{i18n.t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.submitButton, (!selected || isSubmitting) && styles.submitButtonDisabled]}
              activeOpacity={0.7}
              disabled={!selected || isSubmitting}
            >
              <Text style={styles.submitText}>
                {isSubmitting ? i18n.t('restaurants.report.submitting') : i18n.t('restaurants.detail.reportSubmit')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  content: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 480,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  prompt: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  reasonList: {
    gap: 8,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  reasonChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: theme.colors.onPrimary,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.onPrimary,
  },
  reasonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  reasonTextActive: {
    color: theme.colors.onPrimary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.onPrimary,
  },
});
