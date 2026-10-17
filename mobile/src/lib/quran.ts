import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';
import { DEFAULT_GOAL, isoDate } from '@/shared/quran-core';

/** Same table as the website's Quran reading tracker. */
export interface ReadingSession {
  id: string;
  pages: number;
  note: string | null;
  read_on: string;
  created_at: string;
}

export async function loadSessions(): Promise<ReadingSession[]> {
  const { data, error } = await supabase
    .from('quran_reading_sessions')
    .select('*')
    .order('read_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data ?? []) as ReadingSession[];
}

export async function logReading(pages: number, note: string | null): Promise<ReadingSession> {
  const { data, error } = await supabase.from('quran_reading_sessions').insert({ pages, note, read_on: isoDate() }).select().single();
  if (error) throw error;
  return data as ReadingSession;
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from('quran_reading_sessions').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Kept on this phone ----------

const GOAL_KEY = 'firdam.quran.dailyGoal';
const FAVOURITES_KEY = 'firdam.duas.favourites';
const TRANSLIT_KEY = 'firdam.duas.transliteration';

export async function getGoal(): Promise<number> {
  const g = Number(await AsyncStorage.getItem(GOAL_KEY).catch(() => null));
  return g > 0 ? g : DEFAULT_GOAL;
}

export async function setGoal(pages: number): Promise<void> {
  await AsyncStorage.setItem(GOAL_KEY, String(pages)).catch(() => {});
}

export async function getFavourites(): Promise<string[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(FAVOURITES_KEY)) ?? '[]') as string[];
  } catch {
    return [];
  }
}

export async function setFavourites(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(FAVOURITES_KEY, JSON.stringify(ids)).catch(() => {});
}

export async function getShowTransliteration(): Promise<boolean> {
  return (await AsyncStorage.getItem(TRANSLIT_KEY).catch(() => null)) !== 'off';
}

export async function setShowTransliteration(on: boolean): Promise<void> {
  await AsyncStorage.setItem(TRANSLIT_KEY, on ? 'on' : 'off').catch(() => {});
}
