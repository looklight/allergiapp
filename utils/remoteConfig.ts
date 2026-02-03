import { BannerItem } from '../app/components/BannerCarousel';

// Firebase Remote Config - Modular API
let remoteConfig: any = null;
let isRemoteConfigAvailable = false;

// Default values for Remote Config
const DEFAULT_CONFIG = {
  // Banner configuration - empty by default (no ads at launch)
  banner_enabled: false,
  banner_id: '',
  banner_icon: '🎁',
  banner_image_url: '', // URL for custom image/logo
  banner_title: '',
  banner_subtitle: '',
  banner_url: '',
  banner_button_text: '',
  // Layout and styling
  banner_layout: 'default', // 'default' = icon + text, 'full_image' = image fills entire banner
  banner_background_color: '', // e.g., "#FF6B6B" - empty uses default
  banner_text_color: '',       // e.g., "#FFFFFF" - empty uses default
};

try {
  const remoteConfigModule = require('@react-native-firebase/remote-config');
  remoteConfig = remoteConfigModule.default();
  isRemoteConfigAvailable = true;
  console.log('[RemoteConfig] Firebase Remote Config disponibile');
} catch (error) {
  console.log('[RemoteConfig] Firebase Remote Config non disponibile (probabilmente Expo Go)');
  isRemoteConfigAvailable = false;
}

/**
 * Initialize Remote Config with default values and fetch settings
 */
async function initialize(): Promise<void> {
  if (!isRemoteConfigAvailable || !remoteConfig) {
    console.log('[RemoteConfig] Skipping initialization - not available');
    return;
  }

  try {
    // Set default values
    await remoteConfig.setDefaults(DEFAULT_CONFIG);

    // Set minimum fetch interval (0 in dev, 12 hours in production)
    await remoteConfig.setConfigSettings({
      minimumFetchIntervalMillis: __DEV__ ? 0 : 43200000, // 12 hours in production
    });

    // Fetch and activate
    await remoteConfig.fetchAndActivate();
    console.log('[RemoteConfig] Configuration fetched and activated');
  } catch (error) {
    console.warn('[RemoteConfig] Error initializing:', error);
  }
}

/**
 * Get a string value from Remote Config
 */
function getString(key: string): string {
  if (!isRemoteConfigAvailable || !remoteConfig) {
    return (DEFAULT_CONFIG as any)[key] || '';
  }
  try {
    return remoteConfig.getValue(key).asString();
  } catch (error) {
    console.warn(`[RemoteConfig] Error getting string ${key}:`, error);
    return (DEFAULT_CONFIG as any)[key] || '';
  }
}

/**
 * Get a boolean value from Remote Config
 */
function getBoolean(key: string): boolean {
  if (!isRemoteConfigAvailable || !remoteConfig) {
    return (DEFAULT_CONFIG as any)[key] || false;
  }
  try {
    return remoteConfig.getValue(key).asBoolean();
  } catch (error) {
    console.warn(`[RemoteConfig] Error getting boolean ${key}:`, error);
    return (DEFAULT_CONFIG as any)[key] || false;
  }
}

/**
 * Get the promotional banner configuration from Remote Config
 * Returns null if banner is disabled or not configured
 */
function getPromoBanner(): BannerItem | null {
  const enabled = getBoolean('banner_enabled');

  if (!enabled) {
    return null;
  }

  const id = getString('banner_id');
  const title = getString('banner_title');

  // Must have at least an ID and title to show
  if (!id || !title) {
    return null;
  }

  return {
    id: id,
    type: 'ad',
    icon: getString('banner_icon') || '🎁',
    adImage: getString('banner_image_url') || undefined,
    title: title,
    subtitle: getString('banner_subtitle'),
    adUrl: getString('banner_url'),
    adButtonText: getString('banner_button_text'),
    // Layout and styling
    layout: (getString('banner_layout') || 'default') as 'default' | 'full_image',
    backgroundColor: getString('banner_background_color') || undefined,
    textColor: getString('banner_text_color') || undefined,
    // Promo banners display for 4 seconds (vs 3s for info banners)
    displayDuration: 4000,
  };
}

/**
 * Force refresh configuration from server
 */
async function refresh(): Promise<void> {
  if (!isRemoteConfigAvailable || !remoteConfig) {
    return;
  }

  try {
    await remoteConfig.fetch(0); // Force fetch
    await remoteConfig.activate();
    console.log('[RemoteConfig] Configuration refreshed');
  } catch (error) {
    console.warn('[RemoteConfig] Error refreshing:', error);
  }
}

export const RemoteConfig = {
  initialize,
  getString,
  getBoolean,
  getPromoBanner,
  refresh,
  isAvailable: () => isRemoteConfigAvailable,
};
