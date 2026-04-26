import { ExpoConfig, ConfigContext } from "expo/config";

// Firebase plugins solo in build EAS (non servono in Expo Go — i servizi JS degradano a no-op)
const isEasBuild = !!process.env.EAS_BUILD;

export default ({ config }: ConfigContext): ExpoConfig => ({
  name: "AllergiApp",
  slug: "allergiapp",
  version: "1.1.0",
  orientation: "default",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  scheme: "allergiapp",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.allergiapp",
    buildNumber: "5",
    ...(isEasBuild && { googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ?? "./GoogleService-Info.plist" }),
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription:
        "AllergiApp usa la posizione per mostrarti i ristoranti vicini a te.",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#F7DCB3",
    },
    package: "com.allergiapp.mobile",
    edgeToEdgeEnabled: true,
    versionCode: 13,
    permissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "com.google.android.gms.permission.AD_ID",
    ],
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID ?? "",
      },
    },
    ...(isEasBuild && { googleServicesFile: process.env.GOOGLE_SERVICES_JSON_ANDROID ?? "./google-services.json" }),
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#F7DCB3",
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "AllergiApp usa la posizione per mostrarti i ristoranti vicini a te.",
      },
    ],
    // Firebase native plugins — solo in EAS build, in Expo Go i servizi JS fanno fallback a no-op
    ...(isEasBuild ? [
      "@react-native-firebase/app",
      "@react-native-firebase/crashlytics",
      "./plugins/withModularHeaders",
    ] as const : []),
    [
      "expo-tracking-transparency",
      {
        userTrackingPermission:
          "AllergiApp uses this permission to collect anonymous analytics data (such as which allergens are searched most frequently and which languages are most commonly translated) to improve app features and user experience. This data is not linked to your personal identity.",
      },
    ],
  ],
  updates: {
    url: "https://u.expo.dev/6b6299aa-f37d-4e8d-9c33-c438a02060f8",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  extra: {
    router: {},
    googlePlacesApiKeyIos: process.env.GOOGLE_PLACES_API_KEY_IOS ?? "",
    googlePlacesApiKeyAndroid: process.env.GOOGLE_PLACES_API_KEY_ANDROID ?? "",
    eas: {
      projectId: "6b6299aa-f37d-4e8d-9c33-c438a02060f8",
    },
  },
  owner: "looklight",
});
