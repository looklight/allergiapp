import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  name: "AllergiApp",
  slug: "allergiapp",
  version: "1.0.1",
  orientation: "default",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: false,
  scheme: "allergiapp",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#FFFFFF",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.allergiapp",
    buildNumber: "4",
    googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ?? "./GoogleService-Info.plist",
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
    versionCode: 4,
    permissions: [
      "com.google.android.gms.permission.AD_ID",
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
    ],
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON_ANDROID ?? "./google-services.json",
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID ?? "",
      },
    },
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro",
  },
  plugins: [
    "expo-router",
    "@react-native-firebase/app",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "AllergiApp usa la posizione per mostrarti i ristoranti vicini a te.",
      },
    ],
    [
      "expo-tracking-transparency",
      {
        userTrackingPermission:
          "AllergiApp uses this permission to collect anonymous analytics data (such as which allergens are searched most frequently and which languages are most commonly translated) to improve app features and user experience. This data is not linked to your personal identity.",
      },
    ],
    "./plugins/withModularHeaders",
  ],
  updates: {
    url: "https://u.expo.dev/6b6299aa-f37d-4e8d-9c33-c438a02060f8",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  extra: {
    router: {},
    googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY ?? "",
    eas: {
      projectId: "6b6299aa-f37d-4e8d-9c33-c438a02060f8",
    },
  },
  owner: "looklight",
});
