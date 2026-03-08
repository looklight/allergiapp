import { ImageSourcePropType } from 'react-native';

export interface AvatarOption {
  id: string;
  source: ImageSourcePropType;
}

export const AVATARS: AvatarOption[] = [
  { id: 'chef', source: require('../assets/avatars/avatar_chef.png') },
  { id: 'pizza', source: require('../assets/avatars/avatar_pizza.png') },
  { id: 'broccoli', source: require('../assets/avatars/avatar_broccoli.png') },
  { id: 'apple', source: require('../assets/avatars/avatar_apple.png') },
  { id: 'fish', source: require('../assets/avatars/avatar_fish.png') },
  { id: 'cupcake', source: require('../assets/avatars/avatar_cupcake.png') },
  { id: 'carrot', source: require('../assets/avatars/avatar_carrot.png') },
  { id: 'avocado', source: require('../assets/avatars/avatar_avocado.png') },
  { id: 'strawberry', source: require('../assets/avatars/avatar_strawberry.png') },
  { id: 'egg', source: require('../assets/avatars/avatar_egg.png') },
];

export function getAvatarById(id: string): AvatarOption | undefined {
  return AVATARS.find((a) => a.id === id);
}
