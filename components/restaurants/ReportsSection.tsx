import { View, StyleSheet } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { REPORT_REASON_MAP } from '../../constants/reportReasons';
import type { Report } from '../../services/restaurant.types';
import i18n from '../../utils/i18n';

type Props = {
  reports: Report[];
};

export default function ReportsSection({ reports }: Props) {
  if (reports.length === 0) return null;

  return (
    <>
      <View style={styles.separator} />
      <View style={styles.section}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="flag-outline" size={18} color={theme.colors.amberDark} />
          <Text style={styles.sectionTitle}>Segnalazioni ({reports.length})</Text>
        </View>
        {reports.map((report, idx) => {
          const reasonInfo = REPORT_REASON_MAP[report.reason as keyof typeof REPORT_REASON_MAP] ?? REPORT_REASON_MAP.other;
          return (
            <View key={report.id}>
              {idx > 0 && <Divider style={styles.divider} />}
              <View style={styles.reportRow}>
                <View style={styles.reportTop}>
                  <View style={styles.avatar}>
                    <MaterialCommunityIcons name="account-outline" size={16} color={theme.colors.textSecondary} />
                  </View>
                  <View style={styles.meta}>
                    <Text style={styles.author}>Utente</Text>
                    <Text style={styles.date}>
                      {new Date(report.created_at).toLocaleDateString(i18n.locale, {
                        month: 'short', year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.reasonBadge}>
                    <Text style={styles.reasonBadgeText}>{reasonInfo.icon} {reasonInfo.label}</Text>
                  </View>
                </View>
                <Text style={styles.details}>{report.details}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  separator: {
    height: 8,
    backgroundColor: theme.colors.background,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.colors.surface,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  divider: {
    marginVertical: 14,
  },
  reportRow: { gap: 6 },
  reportTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: theme.colors.background,
    justifyContent: 'center', alignItems: 'center',
  },
  meta: { flex: 1 },
  author: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  date: { fontSize: 12, color: theme.colors.textSecondary },
  details: { fontSize: 14, color: theme.colors.textPrimary, lineHeight: 20 },
  reasonBadge: {
    backgroundColor: theme.colors.amberLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reasonBadgeText: { fontSize: 11, fontWeight: '500', color: theme.colors.amberText },
});
