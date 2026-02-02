import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  requestTrackingPermissionsAsync,
  getTrackingPermissionsAsync,
  PermissionStatus,
} from 'expo-tracking-transparency';
import { TrackingConsent } from '../types';

export type TrackingStatus = 'not-determined' | 'authorized' | 'denied' | 'restricted';

function mapPermissionStatus(status: PermissionStatus): TrackingStatus {
  switch (status) {
    case PermissionStatus.GRANTED:
      return 'authorized';
    case PermissionStatus.DENIED:
      return 'denied';
    case PermissionStatus.UNDETERMINED:
      return 'not-determined';
    default:
      return 'restricted';
  }
}

export function useTrackingPermission() {
  const [status, setStatus] = useState<TrackingStatus>('not-determined');
  const [isLoading, setIsLoading] = useState(true);

  // Check current status on mount
  useEffect(() => {
    const checkStatus = async () => {
      // ATT is only for iOS 14.5+
      if (Platform.OS !== 'ios') {
        setStatus('authorized'); // No restriction on Android
        setIsLoading(false);
        return;
      }

      try {
        const { status: permStatus } = await getTrackingPermissionsAsync();
        setStatus(mapPermissionStatus(permStatus));
      } catch (error) {
        console.error('Error checking tracking permissions:', error);
        setStatus('not-determined');
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, []);

  const requestPermission = useCallback(async (): Promise<TrackingConsent> => {
    // ATT is only for iOS 14.5+
    if (Platform.OS !== 'ios') {
      const consent: TrackingConsent = {
        status: 'authorized',
        askedAt: new Date().toISOString(),
      };
      setStatus('authorized');
      return consent;
    }

    try {
      const { status: permStatus } = await requestTrackingPermissionsAsync();
      const newStatus = mapPermissionStatus(permStatus);
      setStatus(newStatus);

      return {
        status: newStatus,
        askedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error requesting tracking permissions:', error);
      return {
        status: 'denied',
        askedAt: new Date().toISOString(),
      };
    }
  }, []);

  return {
    status,
    isLoading,
    requestPermission,
    isAuthorized: status === 'authorized',
    canRequestPermission: status === 'not-determined',
  };
}
