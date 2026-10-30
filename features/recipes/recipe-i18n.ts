'use client';

import { useSyncExternalStore } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

import { fetchAllPages } from '@/features/meals/plan-core';
import { addTranslations, getLang, type Lang } from '@/lib/i18n';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/** The translation tables are newer than the generated database types. */
const db = () => createSupabaseBrowserClient() as unknown as SupabaseClient;

/**
 * Recipes in French and Arabic. English stays the master in the database; the
 * French / Arabic names, descriptions and food names are added to the page's
 * dictionary, so everything already going through tr()/trn() — recipe cards,
 * meal plans, shopping lists, the pantry — shows them. Remembered on this
 * browser, refreshed in the background on each visit.
 */
const CACHE = (lang: Lang) => `firdam.recipe-i18n.${lang}.v1`;
const listeners = new Set<() => void>();
let version = 0;
let started: Lang | null = null;

function bump() {
  version += 1;
  listeners.forEach((l) => l());
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Food names appear as "chicken" (shopping) and "Chicken" (recipes): both get the translation, in the same case. */
function applyFoods(rows: { name_en: string; name: string }[], into: Record<string, string>) {
  for (const r of rows) {
    into[r.name_en] = r.name;
    into[cap(r.name_en)] = cap(r.name);
  }
}

type RecipeRow = { name: string | null; short_description: string | null; recipe: { name: string; short_description: string | null } | null };

async function load(lang: Lang): Promise<Record<string, string>> {
  const supabase = db();
  const [recipes, foods] = await Promise.all([
    fetchAllPages<RecipeRow>((from, to) =>
      supabase
        .from('recipe_translations')
        .select('name, short_description, recipe:recipes(name, short_description)')
        .eq('lang', lang)
        .order('recipe_id')
        .range(from, to)
    ),
    fetchAllPages<{ name_en: string; name: string }>((from, to) =>
      supabase.from('food_translations').select('name_en, name').eq('lang', lang).order('name_en').range(from, to)
    ),
  ]);
  const map: Record<string, string> = {};
  applyFoods(foods, map);
  for (const r of recipes) {
    if (!r.recipe) continue;
    if (r.name) map[r.recipe.name] = r.name;
    if (r.short_description && r.recipe.short_description) map[r.recipe.short_description] = r.short_description;
  }
  return map;
}

/** Loads (once per visit) the recipe and food translations for the page's language. */
export function startRecipeTranslations() {
  const lang = getLang();
  if (lang === 'en' || started === lang) return;
  started = lang;
  let cached = false;
  try {
    const raw = localStorage.getItem(CACHE(lang));
    if (raw) {
      addTranslations(lang, JSON.parse(raw) as Record<string, string>);
      cached = true;
      bump();
    }
  } catch {
    /* private window or full storage: just load from the database */
  }
  load(lang)
    .then((map) => {
      addTranslations(lang, map);
      try {
        localStorage.setItem(CACHE(lang), JSON.stringify(map));
      } catch {
        /* too big for this browser's storage: fine, it loads each visit */
      }
      if (!cached) bump();
    })
    .catch(() => {
      /* translations are a bonus: the English recipe still shows */
    });
}

/** Changes when new translations arrive, so the page can redraw once. */
export function useRecipeTranslationsVersion(): number {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
    () => 0
  );
}

/** One recipe's steps, tips and storage notes in the page's language, mapped onto its English text. */
export async function addRecipeDetailTranslations(
  recipeId: string,
  english: { steps: string[]; tips: string[]; equipment: string[]; long?: string | null; storage?: string | null; reheating?: string | null }
) {
  const lang = getLang();
  if (lang === 'en') return;
  const supabase = db();
  const { data } = await supabase
    .from('recipe_translations')
    .select('long_description, steps, tips, equipment, storage_instructions, reheating_instructions')
    .eq('recipe_id', recipeId)
    .eq('lang', lang)
    .maybeSingle<{
      long_description: string | null;
      steps: string[] | null;
      tips: string[] | null;
      equipment: string[] | null;
      storage_instructions: string | null;
      reheating_instructions: string | null;
    }>();
  if (!data) return;
  const map: Record<string, string> = {};
  const pair = (en: string[], t: string[] | null) => en.forEach((e, i) => t?.[i] && (map[e] = t[i]));
  pair(english.steps, data.steps);
  pair(english.tips, data.tips);
  pair(english.equipment, data.equipment);
  if (english.long && data.long_description) map[english.long] = data.long_description;
  if (english.storage && data.storage_instructions) map[english.storage] = data.storage_instructions;
  if (english.reheating && data.reheating_instructions) map[english.reheating] = data.reheating_instructions;
  addTranslations(lang, map);
}
