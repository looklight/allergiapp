import { Alert } from 'react-native';
import i18n from './i18n';

/**
 * Soft-nudge quando si pubblica una recensione senza testo né foto: ribadisce
 * che una descrizione aiuta di più la community, ma NON blocca la pubblicazione
 * (il commento resta facoltativo, l'unico obbligo è la stella).
 *
 * Se c'è già del contenuto (testo o foto) risolve subito `true` senza popup —
 * chi ha aggiunto foto ha già dato valore, non va infastidito.
 *
 * @returns `true` se si può procedere alla pubblicazione, `false` se l'utente
 *          torna a scrivere.
 */
export function confirmReviewWithoutText(
  hasComment: boolean,
  hasPhotos: boolean,
): Promise<boolean> {
  if (hasComment || hasPhotos) return Promise.resolve(true);

  return new Promise((resolve) => {
    Alert.alert(
      i18n.t('restaurants.review.emptyNudgeTitle'),
      i18n.t('restaurants.review.emptyNudgeMsg'),
      [
        { text: i18n.t('restaurants.review.emptyNudgeWrite'), style: 'cancel', onPress: () => resolve(false) },
        { text: i18n.t('restaurants.review.emptyNudgePublish'), onPress: () => resolve(true) },
      ],
      { cancelable: false },
    );
  });
}
