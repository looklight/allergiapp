// Platform-specific entry point.
// Metro risolve automaticamente:
//   - RestaurantMap.native.tsx per iOS/Android
//   - RestaurantMap.web.tsx per web
// Questo file serve come fallback per TypeScript.
export { default } from './RestaurantMap.native';
