import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { requestTrackingPermissionsAsync, getTrackingPermissionsAsync, PermissionStatus } from 'expo-tracking-transparency';
import { TrackingConsent } from '../types';

type TrackingStatus = TrackingConsent['status'];

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

  useEffect(() => {
    const checkStatus = async () => {
      if (Platform.OS !== 'ios') {
        // On Android, we don't need ATT - treat as authorized
        setStatus('authorized');
        setIsLoading(false);
        return;
      }

      try {
        const { status: permStatus } = await getTrackingPermissionsAsync();
        setStatus(mapPermissionStatus(permStatus));
      } catch (error) {
        console.warn('[TrackingPermission] Error checking status:', error);
        setStatus('not-determined');
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, []);

  const requestPermission = useCallback(async (): Promise<TrackingConsent> => {
    if (Platform.OS !== 'ios') {
      // On Android, we don't need ATT
      return {
        status: 'authorized',
        askedAt: new Date().toISOString(),
      };
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
      console.warn('[TrackingPermission] Error requesting permission:', error);
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
