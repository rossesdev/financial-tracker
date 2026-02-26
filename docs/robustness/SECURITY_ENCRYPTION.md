# Security & Data Encryption

---

## Current State (Critical Issues)

### AsyncStorage is Plaintext

All financial data is stored **unencrypted** on the device at:
- **iOS**: `Library/Application Support/{bundle-id}/RCTAsyncLocalStorage_V1/`
- **Android**: `databases/RKStorage`

On a rooted Android device or a jailbroken iOS device, any app with filesystem access can read this data. This includes account balances, full transaction history, and entity names.

The `// TODO: Add security measures` comment in `app/(tabs)/movement.tsx` acknowledges this issue without addressing it.

### No Authentication Gate

Anyone who picks up an unlocked phone has immediate full access to all financial data. There is no PIN, password, or biometric lock.

### `as any` Type Casts

`app/(tabs)/transaction.tsx` casts the `entity` field from `number` to `any` to satisfy the `IMovement.entity: string` type. This is a type safety hole that can allow malformed data to be written to storage.

---

## Phase 1: Immediate Mitigation (No Storage Engine Change)

Replace AsyncStorage with **`react-native-encrypted-storage`** as a drop-in replacement.

Under the hood it uses:
- **iOS**: Keychain Services (hardware-backed on devices with Secure Enclave)
- **Android**: EncryptedSharedPreferences (AES-256 via Android Keystore)

```bash
npm install react-native-encrypted-storage
```

```ts
// storage/encryptedStorage.ts
import EncryptedStorage from 'react-native-encrypted-storage';

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await EncryptedStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    await EncryptedStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    await EncryptedStorage.removeItem(key);
  },
};
```

Then update `storage/storage.ts` to use `secureStorage` instead of `AsyncStorage`. No other files change.

**Limitation**: `react-native-encrypted-storage` has a per-item size limit tied to Android's EncryptedSharedPreferences. For large datasets (thousands of movements), the JSON serialization may exceed this limit. This is the main reason to prefer the SQLite + SQLCipher approach for the long term.

---

## Phase 2: Long-Term (After SQLite Migration)

### SQLite + SQLCipher (AES-256 Database Encryption)

After migrating to `expo-sqlite`, enable database-level encryption via SQLCipher.

**Option A**: `@journeyapps/sqlcipher-react-native`
- Direct SQLCipher integration
- Requires Expo bare workflow (not Expo Go)
- Full AES-256-CBC encryption for the entire SQLite database file

**Option B**: expo-sqlite with encryption extension (check expo-sqlite v14+ for built-in SQLCipher support)

**Key management**:
```ts
// storage/keyManager.ts
import * as SecureStore from 'expo-secure-store';
import { nanoid } from 'nanoid/non-secure';

const DB_KEY_NAME = 'financial_tracker_db_key';

/**
 * Returns the database encryption key, generating one if it doesn't exist.
 * The key is stored in the device's secure hardware keystore.
 */
export async function getDatabaseEncryptionKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(DB_KEY_NAME);

  if (!key) {
    // Generate a strong 32-byte key on first launch
    key = nanoid(32);
    await SecureStore.setItemAsync(DB_KEY_NAME, key, {
      requireAuthentication: false, // set to true if biometrics are enabled
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  return key;
}
```

Usage when opening the database:
```ts
// storage/database.ts
import * as SQLite from 'expo-sqlite';
import { getDatabaseEncryptionKey } from './keyManager';

export async function openEncryptedDatabase(): Promise<SQLite.SQLiteDatabase> {
  const key = await getDatabaseEncryptionKey();
  const db = await SQLite.openDatabaseAsync('financial_tracker.db');
  // With SQLCipher:
  await db.execAsync(`PRAGMA key = '${key}';`);
  return db;
}
```

---

## Biometric Authentication Gate

Add a biometric lock that the user must pass before the app loads any financial data.

```bash
npx expo install expo-local-authentication
```

```ts
// shared/hooks/useBiometricAuth.ts
import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useState } from 'react';

type AuthState = 'checking' | 'authenticated' | 'failed' | 'unavailable';

export function useBiometricAuth(): { authState: AuthState; retry: () => void } {
  const [authState, setAuthState] = useState<AuthState>('checking');

  const authenticate = async () => {
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
  };

  useEffect(() => {
    authenticate();
  }, []);

  return { authState, retry: authenticate };
}
```

Integration in `app/_layout.tsx`:
```tsx
export default function RootLayout() {
  const { authState, retry } = useBiometricAuth();

  if (authState === 'checking') return <LoadingScreen />;
  if (authState === 'failed') return <AuthFailedScreen onRetry={retry} />;
  if (authState === 'unavailable') {
    // Device has no biometrics — allow access but prompt to set up a PIN in settings
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      {/* rest of providers */}
    </ThemeProvider>
  );
}
```

---

## Input Validation & Sanitization

All user inputs must be validated before they reach the store or storage layer.

### Amount Validation
```ts
// Always parse amounts through the validated parseAmount function
// Never store the raw formatted string input directly

const rawInput = '1.500.000'; // from Input component
const amount = parseAmount(rawInput, 'es-CO'); // → 1500000 as integer
// If parseAmount throws, show validation error — never write malformed data to storage
```

### Description Sanitization
```ts
// In movement validator:
description: z.string()
  .min(1, 'Description is required')
  .max(200, 'Description is too long')
  .trim()
  .transform((val) => val.replace(/[<>]/g, '')), // basic XSS prevention for any future display
```

### Remove All `as any` Casts
Every `as any` cast in the codebase is a type safety hole. The specific cast in `transaction.tsx`:
```ts
// WRONG (current):
addMovement(movementOut as any);

// CORRECT:
const movementOut: Omit<IMovement, 'id' | 'createdAt' | 'updatedAt'> = {
  description,
  amount: parseAmount(amountTransaction, 'es-CO'), // integer, not formatted string
  typeOfMovement: '2',
  category: '8',
  date: new Date().toISOString(),
  entity: String(selectedEntities.from), // explicit conversion
};
addMovement(movementOut);
```

---

## Logging & Privacy

- **Never log financial amounts** to console, Sentry, or any logging service.
- Log movement IDs, operation names, and error codes — never the actual values.
- In Sentry configuration, add a `beforeSend` hook that scrubs any fields matching financial data patterns:

```ts
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  beforeSend(event) {
    // Remove any extra data that might contain financial values
    if (event.extra) {
      delete event.extra.amount;
      delete event.extra.balance;
      delete event.extra.movements;
    }
    return event;
  },
});
```

---

## Security Checklist

- [ ] Replace `AsyncStorage` with `react-native-encrypted-storage` (Phase 1)
- [ ] Fix all `as any` casts in `app/(tabs)/transaction.tsx`
- [ ] Implement `useBiometricAuth` hook and integrate in `app/_layout.tsx`
- [ ] Add zod validation to all forms (no raw data written to storage)
- [ ] Add `parseAmount` / `formatAmount` utilities (no formatted strings in storage)
- [ ] Migrate to `expo-sqlite` + SQLCipher (Phase 2)
- [ ] Implement `getDatabaseEncryptionKey` with `expo-secure-store`
- [ ] Add Sentry `beforeSend` scrubber for financial data fields
- [ ] Add privacy policy to the app (required for app store submission — discloses local data storage)
