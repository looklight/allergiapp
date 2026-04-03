// Platform-specific entry point.
// Metro resolves automatically:
//   - RestaurantMap.native.tsx for iOS/Android
//   - RestaurantMap.web.tsx for web
// This file is the TypeScript fallback.
export { default } from './RestaurantMap.native';
export type { RestaurantMapProps } from './mapConstants';
