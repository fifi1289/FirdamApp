import AsyncStorage from '@react-native-async-storage/async-storage';

const DONE_KEY = 'firdam.setup.done';

/** True once the family has been through the first-time setup (or skipped it). */
export async function setupDone(): Promise<boolean> {
  return (await AsyncStorage.getItem(DONE_KEY).catch(() => null)) === '1';
}

export async function markSetupDone(): Promise<void> {
  await AsyncStorage.setItem(DONE_KEY, '1').catch(() => {});
}
