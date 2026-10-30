import AsyncStorage from '@react-native-async-storage/async-storage';

import { addTranslations, getLang, type Lang } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

/**
 * Recipes in French and Arabic, the same as on firdam.com: English stays the
 * master; French / Arabic recipe names, descriptions and food names are added
 * to the app's dictionary, so recipe cards, plans, shopping and the pantry show
 * them. Remembered on the phone and refreshed in the background.
 */
const CACHE = (lang: Lang) => `firdam.recipe-i18n.${lang}.v2`;
const PAGE = 1000;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Recipes also write foods as "Brown Lentils": every word capitalised. */
const title = (s: string) => s.split(' ').map(cap).join(' ');
let refreshed: Lang | null = null;

async function allPages<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

type RecipeRow = { name: string | null; short_description: string | null; recipe: { name: string; short_description: string | null } | null };

async function fetchMap(lang: Lang): Promise<Record<string, string>> {
  const [recipes, foods] = await Promise.all([
    allPages<RecipeRow>((from, to) =>
      supabase
        .from('recipe_translations')
        .select('name, short_description, recipe:recipes(name, short_description)')
        .eq('lang', lang)
        .order('recipe_id')
        .range(from, to) as unknown as PromiseLike<{ data: RecipeRow[] | null; error: unknown }>
    ),
    allPages<{ name_en: string; name: string }>((from, to) =>
      supabase.from('food_translations').select('name_en, name').eq('lang', lang).order('name_en').range(from, to) as unknown as PromiseLike<{
        data: { name_en: string; name: string }[] | null;
        error: unknown;
      }>
    ),
  ]);
  const map: Record<string, string> = {};
  for (const f of foods) {
    map[f.name_en] = f.name;
    map[cap(f.name_en)] = cap(f.name);
    if (!(title(f.name_en) in map)) map[title(f.name_en)] = cap(f.name);
  }
  for (const r of recipes) {
    if (!r.recipe) continue;
    if (r.name) map[r.recipe.name] = r.name;
    if (r.short_description && r.recipe.short_description) map[r.recipe.short_description] = r.short_description;
  }
  return map;
}

/** At startup: the remembered translations, right away. */
export async function loadCachedRecipeTranslations(): Promise<void> {
  const lang = getLang();
  if (lang === 'en') return;
  const raw = await AsyncStorage.getItem(CACHE(lang)).catch(() => null);
  if (raw) addTranslations(lang, JSON.parse(raw) as Record<string, string>);
}

/** Once signed in: fresh translations from the database (new recipes, corrections). */
export async function refreshRecipeTranslations(): Promise<void> {
  const lang = getLang();
  if (lang === 'en' || refreshed === lang) return;
  refreshed = lang;
  try {
    const map = await fetchMap(lang);
    addTranslations(lang, map);
    await AsyncStorage.setItem(CACHE(lang), JSON.stringify(map)).catch(() => {});
  } catch {
    refreshed = null; // try again next time
  }
}

/** One recipe's steps in the app's language, mapped onto its English steps. */
export async function addRecipeSteps(recipeId: string, englishSteps: string[]): Promise<void> {
  const lang = getLang();
  if (lang === 'en' || !englishSteps.length) return;
  const { data } = await supabase.from('recipe_translations').select('steps').eq('recipe_id', recipeId).eq('lang', lang).maybeSingle();
  const steps = (data as { steps: string[] | null } | null)?.steps ?? [];
  const map: Record<string, string> = {};
  englishSteps.forEach((en, i) => steps[i] && (map[en] = steps[i]));
  addTranslations(lang, map);
}
