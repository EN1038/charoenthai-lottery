import { Platform, PermissionsAndroid } from 'react-native';
import {
  getMessaging,
  getToken,
  requestPermission,
  onMessage,
  onTokenRefresh as onTokenRefreshModular,
  setBackgroundMessageHandler,
  AuthorizationStatus,
  type RemoteMessage,
} from '@react-native-firebase/messaging';

export type FcmTokenResult = {
  token: string | null;
  authorized: boolean;
  error?: string;
};

function messaging() {
  return getMessaging();
}

/**
 * Request notification permission (Android 13+ / iOS).
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    if (typeof Platform.Version === 'number' && Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        return false;
      }
    }
    return true;
  }

  const authStatus = await requestPermission(messaging());
  return (
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL
  );
}

/**
 * Get current FCM device token. Returns null if permission denied / unavailable.
 */
export async function getFcmToken(): Promise<string | null> {
  try {
    const token = await getToken(messaging());
    return token || null;
  } catch (error: any) {
    console.warn('[FCM] getToken failed:', error?.message || error);
    return null;
  }
}

/**
 * Init FCM: ask permission + fetch token.
 * Call once on app launch.
 */
export async function initFcm(): Promise<FcmTokenResult> {
  try {
    const authorized = await requestNotificationPermission();
    if (!authorized) {
      return { token: null, authorized: false, error: 'permission_denied' };
    }

    const token = await getFcmToken();
    if (token) {
      console.log('[FCM] token:', token);
    } else {
      console.warn('[FCM] no token');
    }

    return { token, authorized: true };
  } catch (error: any) {
    console.warn('[FCM] init failed:', error?.message || error);
    return {
      token: null,
      authorized: false,
      error: error?.message || 'init_failed',
    };
  }
}

/**
 * Subscribe to foreground messages. Returns unsubscribe fn.
 */
export function onForegroundMessage(handler: (message: RemoteMessage) => void) {
  return onMessage(messaging(), async remoteMessage => {
    handler(remoteMessage);
  });
}

/**
 * Token refresh listener. Returns unsubscribe fn.
 */
export function onTokenRefresh(handler: (token: string) => void) {
  return onTokenRefreshModular(messaging(), token => {
    console.log('[FCM] token refreshed:', token);
    handler(token);
  });
}

/**
 * Must be registered in index.js (outside React tree) for background/quit state.
 */
export function registerBackgroundHandler() {
  try {
    setBackgroundMessageHandler(messaging(), async remoteMessage => {
      console.log('[FCM] background message:', remoteMessage?.messageId);
    });
  } catch (error: any) {
    console.warn('[FCM] registerBackgroundHandler failed:', error?.message || error);
  }
}
