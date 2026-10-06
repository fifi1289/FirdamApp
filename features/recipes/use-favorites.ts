'use client';

import { useCallback, useEffect, useState } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function useRecipeFavorites() {
  const supabase = createSupabaseBrowserClient();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase
      .from('recipe_favorites')
      .select('recipe_key')
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load favourites:', error.message);
          return;
        }
        setFavorites(new Set((data ?? []).map((r) => r.recipe_key)));
      });
  }, [supabase]);

  const toggle = useCallback(
    async (key: string) => {
      const has = favorites.has(key);
      setFavorites((prev) => {
        const next = new Set(prev);
        if (has) next.delete(key);
        else next.add(key);
        return next;
      });
      const { error } = has
        ? await supabase.from('recipe_favorites').delete().eq('recipe_key', key)
        : await supabase.from('recipe_favorites').insert({ recipe_key: key });
      if (error) {
        setFavorites((prev) => {
          const next = new Set(prev);
          if (has) next.add(key);
          else next.delete(key);
          return next;
        });
        throw error;
      }
      return !has;
    },
    [favorites, supabase]
  );

  return { favorites, toggle };
}
