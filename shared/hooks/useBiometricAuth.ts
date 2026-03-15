import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useState } from 'react';

export type AuthState = 'checking' | 'authenticated' | 'failed' | 'unavailable';

export function useBiometricAuth(): { authState: AuthState; retry: () => void } {
  const [authState, setAuthState] = useState<AuthState>('checking');

  const authenticate = useCallback(async () => {
    setAuthState('checking');

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      setAuthState('unavailable');
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access your financial data',
      fallbackLabel: 'Use passcode',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    setAuthState(result.success ? 'authenticated' : 'failed');
  }, []);

  useEffect(() => {
    authenticate();
  }, [authenticate]);

  return { authState, retry: authenticate };
}
