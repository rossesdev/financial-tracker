import * as SecureStore from 'expo-secure-store';
import { nanoid } from 'nanoid/non-secure';

const DB_KEY_NAME = 'financial_tracker_db_key';

/**
 * Returns the database encryption key, generating one if it doesn't exist.
 * The key is stored in the device's secure hardware keystore via expo-secure-store.
 */
export async function getDatabaseEncryptionKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(DB_KEY_NAME);

  if (!key) {
    key = nanoid(32);
    await SecureStore.setItemAsync(DB_KEY_NAME, key, {
      requireAuthentication: false,
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  return key;
}
