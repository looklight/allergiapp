export interface RatingState {
  averageRating: number;
  ratingCount: number;
}

/**
 * Ricalcola la media delle valutazioni dopo un aggiornamento.
 * Copre tutti i casi: aggiunta, sostituzione, rimozione rating.
 * Restituisce averageRating arrotondato a 1 decimale e il delta per ratingCount.
 */
export function recalculateRating(
  current: RatingState,
  oldRating: number,
  newRating: number,
): { averageRating: number; ratingCountDelta: number } {
  const { averageRating: avg, ratingCount: count } = current;

  if (oldRating === 0 && newRating > 0) {
    const newAvg = (avg * count + newRating) / (count + 1);
    return { averageRating: Math.round(newAvg * 10) / 10, ratingCountDelta: 1 };
  }

  if (oldRating > 0 && newRating > 0) {
    const totalSum = avg * count - oldRating + newRating;
    return { averageRating: Math.round((totalSum / count) * 10) / 10, ratingCountDelta: 0 };
  }

  if (oldRating > 0 && newRating === 0) {
    if (count > 1) {
      const newAvg = (avg * count - oldRating) / (count - 1);
      return { averageRating: Math.round(newAvg * 10) / 10, ratingCountDelta: -1 };
    }
    return { averageRating: 0, ratingCountDelta: -1 };
  }

  return { averageRating: avg, ratingCountDelta: 0 };
}
