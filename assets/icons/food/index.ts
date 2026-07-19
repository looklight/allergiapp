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
import Almonds from './almonds.svg';
import Walnuts from './walnuts.svg';
import Hazelnuts from './hazelnuts.svg';
import Pistachios from './pistachios.svg';
import Chickpeas from './chickpeas.svg';
import Cashews from './cashews.svg';
import PineNuts from './pine_nuts.svg';
import Lupin from './lupin.svg';
import Fennel from './fennel.svg';
import Cinnamon from './cinnamon.svg';
import PassionFruit from './passion_fruit.svg';
import PoppySeeds from './poppy_seeds.svg';
import FlaxSeeds from './flax_seeds.svg';
import Lentils from './lentils.svg';

export type FoodIconId = OtherFoodId | AllergenId;

export const FOOD_SVG_ICONS: Partial<Record<FoodIconId, React.FC<SvgProps>>> = {
  fig: Fig,
  almonds: Almonds,
  walnuts: Walnuts,
  hazelnuts: Hazelnuts,
  pistachios: Pistachios,
  chickpeas: Chickpeas,
  cashews: Cashews,
  pine_nuts: PineNuts,
  lupin: Lupin,
  fennel: Fennel,
  cinnamon: Cinnamon,
  passion_fruit: PassionFruit,
  poppy_seeds: PoppySeeds,
  flax_seeds: FlaxSeeds,
  lentils: Lentils,
};
