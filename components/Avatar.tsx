import React, { useMemo } from 'react';
import {
  View,
  Image,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import type { AppTheme } from '../constants/theme';
import { getAvatarById } from '../constants/avatars';
import i18n from '../utils/i18n';

const INCOGNITO_AVATAR = require('../assets/avatars/plate_incognito.png');

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<AvatarSize, number> = {
  xs: 32,
  sm: 40,
  md: 60,
  lg: 100,
};

export interface AvatarProps {
  /** ID dell'avatar selezionato dall'utente (es. "plate_main_logo"). */
  avatarId?: string | null;
  /** Se true, mostra l'icona incognito a prescindere da avatarId. */
  isAnonymous?: boolean;
  /** Se true (account cancellato / orfano), mostra l'icona generica di sistema. */
  isInactive?: boolean;
  /** Iniziale del nickname per il fallback colorato quando non c'è un'immagine. */
  initial?: string;
  /** Preset (xs/sm/md/lg) o numero di pixel. Default: md (60px). */
  size?: AvatarSize | number;
  /** Background del fallback con iniziale. Default: theme.colors.primaryLight. */
  backgroundColor?: string;
  /** Style aggiuntivo applicato al wrapper. */
  style?: StyleProp<ViewStyle>;
}

/**
 * Render unificato per gli avatar utente.
 *
 * Priorità:
 *   1. isInactive → icona generica (account cancellato)
 *   2. isAnonymous → icona incognito
 *   3. avatarId con source disponibile → immagine bundlata
 *   4. initial → cerchio colorato con la prima lettera
 *   5. fallback → icona account-circle-outline
 *
 * TODO: quando sarà pronto un asset dedicato (es. plate_echo.png), sostituire
 * il fallback isInactive con l'Image bundlata, come per anonymous.
 */
export default function Avatar({
  avatarId,
  isAnonymous,
  isInactive,
  initial,
  size = 'md',
  backgroundColor,
  style,
}: AvatarProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const sizePx = typeof size === 'number' ? size : SIZE_MAP[size];
  const dimension = { width: sizePx, height: sizePx };

  if (isInactive) {
    return (
      <MaterialCommunityIcons
        name="account-off-outline"
        size={sizePx}
        color={theme.colors.textDisabled}
        style={style as any}
        accessibilityLabel={i18n.t('common.userInactive')}
      />
    );
  }

  if (isAnonymous) {
    return (
      <Image
        source={INCOGNITO_AVATAR}
        style={[dimension, styles.image, style as StyleProp<ImageStyle>]}
        resizeMode="contain"
        accessibilityLabel={i18n.t('leaderboard.anonymous')}
      />
    );
  }

  const avatar = avatarId ? getAvatarById(avatarId) : undefined;
  if (avatar?.source) {
    return (
      <Image
        source={avatar.source}
        style={[dimension, styles.image, style as StyleProp<ImageStyle>]}
        resizeMode="contain"
        accessibilityLabel={avatar.name}
      />
    );
  }

  if (initial) {
    const textColor = backgroundColor ? theme.colors.onPrimary : theme.colors.primary;
    return (
      <View
        style={[
          dimension,
          styles.fallback,
          {
            borderRadius: sizePx / 2,
            backgroundColor: backgroundColor ?? theme.colors.primaryLight,
          },
          style,
        ]}
      >
        <Text style={{ fontSize: Math.round(sizePx * 0.4), fontWeight: 'bold', color: textColor }}>
          {initial.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }

  return (
    <MaterialCommunityIcons
      name="account-circle-outline"
      size={sizePx}
      color={theme.colors.primary}
      style={style as any}
    />
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  image: {
    resizeMode: 'contain',
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
