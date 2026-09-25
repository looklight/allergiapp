import { View, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import i18n, { getAppLanguage } from '../../utils/i18n';
import { shouldOfferTranslation, translateReview } from '../../services/reviewTranslationService';
import type { ReviewReply } from '../../services/restaurant.types';

/**
 * La risposta del ristoratore sotto una recensione (design 16/09, mig 733).
 *
 * Rientrata sotto la recensione: logo del locale come avatar (senza logo,
 * icona generica di ristorante — niente iniziali), nome del RISTORANTE
 * com'è nell'app, «Risposta del ristorante» e la data. Non porta a nessun profilo e non dice
 * «modificata». «Traduci» si comporta come per le recensioni, sulla lingua
 * salvata dal portale. Non si segnala (scelta dell'utente, 25/09).
 *
 * `compact`: nelle liste del profilo, due righe e basta (niente traduzione:
 * la card intera apre il ristorante, dove c'è tutto).
 */
interface Props {
  reply: ReviewReply;
  /** Il nome del ristorante com'è nell'app (25/09): quello in cima alla
   *  scheda, non il nome del locale nel portale, che può essere diverso. */
  restaurantName: string;
  compact?: boolean;
}

const AVATAR = 24;

export default function ReviewReplyBlock({ reply, restaurantName, compact }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [logoFailed, setLogoFailed] = useState(false);

  const [translation, setTranslation] = useState<{ target: string; text: string } | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateFailed, setTranslateFailed] = useState(false);

  const readerLang = getAppLanguage();
  const canTranslate = !compact && shouldOfferTranslation(reply.language);
  const isShowingTranslation = showTranslation && translation?.target === readerLang;
  const displayedText = isShowingTranslation && translation ? translation.text : reply.body;

  const handleTranslatePress = async () => {
    if (isShowingTranslation) {
      setShowTranslation(false);
      return;
    }
    if (translation?.target === readerLang) {
      setShowTranslation(true);
      return;
    }
    setIsTranslating(true);
    setTranslateFailed(false);
    try {
      const translated = await translateReview(reply.body, reply.language);
      setTranslation({ target: readerLang, text: translated });
      setShowTranslation(true);
    } catch {
      setTranslateFailed(true);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.header}>
        {reply.venue_logo_url && !logoFailed ? (
          <Image
            source={{ uri: reply.venue_logo_url }}
            style={styles.logo}
            onError={() => setLogoFailed(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[styles.logo, styles.logoFallback]}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={13} color={theme.colors.textSecondary} />
          </View>
        )}
        <View style={styles.meta}>
          <Text style={styles.venueName} numberOfLines={1}>{restaurantName}</Text>
          {/* La data come quella delle recensioni (mese e anno): dice se la
              risposta è di adesso o di quando la recensione era fresca */}
          <Text style={styles.caption}>
            {i18n.t('restaurants.reviews.reply.label')} · {new Date(reply.created_at).toLocaleDateString(i18n.locale, {
              month: 'short', year: 'numeric',
            })}
          </Text>
        </View>
      </View>

      <Text style={styles.body} numberOfLines={compact ? 2 : undefined}>{displayedText}</Text>

      {canTranslate && (
        <View style={styles.translateRow}>
          {isTranslating ? (
            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
          ) : isShowingTranslation ? (
            <>
              <Text style={styles.translateCaption}>{i18n.t('restaurants.reviews.card.translatedAuto')}</Text>
              <TouchableOpacity onPress={handleTranslatePress} activeOpacity={0.6} hitSlop={8}>
                <Text style={styles.translateLink}>{i18n.t('restaurants.reviews.card.showOriginal')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={handleTranslatePress} activeOpacity={0.6} hitSlop={8}>
                <Text style={styles.translateLink}>{i18n.t('restaurants.reviews.card.translate')}</Text>
              </TouchableOpacity>
              {translateFailed && (
                <Text style={styles.translateCaption}>{i18n.t('restaurants.reviews.card.translateError')}</Text>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    marginTop: 6,
    marginLeft: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.divider,
    gap: 6,
  },
  containerCompact: {
    marginLeft: 0,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.divider,
    // Il logo arriva già su fondo bianco dal portale: così non cambia in dark mode
    backgroundColor: '#FFFFFF',
  },
  logoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
  },
  meta: {
    flex: 1,
  },
  venueName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  caption: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textPrimary,
  },
  translateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  translateLink: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  translateCaption: {
    fontSize: 12,
    color: theme.colors.textDisabled,
  },
});
