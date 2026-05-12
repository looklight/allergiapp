// Mappa id alimento → componente SVG. Per aggiungere una nuova icona:
//   1. droppa il file .svg in questa cartella (es. `turmeric.svg`)
//   2. aggiungi import + entry in FOOD_SVG_ICONS qui sotto
// FoodIcon.tsx legge solo da qui — gli id assenti fallback automatico su emoji.
// Il tipo del map è stretto a OtherFoodId | AllergenId: TS errora se scrivi un
// id che non esiste (es. typo "figs" invece di "fig").
import type React from 'react';
import type { SvgProps } from 'react-native-svg';
import type { OtherFoodId } from '../../../constants/otherFoods';
import type { AllergenId } from '../../../types';

import Fig from './fig.svg';

export type FoodIconId = OtherFoodId | AllergenId;

export const FOOD_SVG_ICONS: Partial<Record<FoodIconId, React.FC<SvgProps>>> = {
  fig: Fig,
};
