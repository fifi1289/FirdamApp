'use client';

import { useMemo, useState } from 'react';
import { ImageIcon, Loader2, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { callEdgeFunction, EdgeFunctionError } from '@/lib/supabase/functions';

interface RecipeHit {
  id: string;
  name: string;
  image_path: string | null;
}

interface RegenResult {
  done: { id: string; name: string; url: string }[];
  failed: { id: string; name: string; error: string }[];
  remaining: number;
}

/**
 * Regenerates the AI photo for one recipe that already has a photo
 * (for example when the photo shows the wrong dish). Calls the
 * `recipe-images` edge function with redo, which runs with the
 * service role, so it works even though the manual upload path is
 * currently blocked by a storage RLS issue.
 */
export function RecipePhotoRegenerate() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<RecipeHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const search = async () => {
    const q = query.trim();
    if (q.length < 2) {
      toast.error('Type at least 2 characters to search.');
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, name, image_path')
        .eq('is_active', true)
        .ilike('name', `%${q}%`)
        .order('name')
        .limit(8);
      if (error) throw error;
      setHits(data ?? []);
      if (!data?.length) toast.info('No recipes matched that search.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const regenerate = async (hit: RecipeHit) => {
    setBusyId(hit.id);
    try {
      const res = await callEdgeFunction<RegenResult>('recipe-images', undefined, {
        body: { recipeId: hit.id, redo: true },
      });
      const done = res.done[0];
      if (done?.url) {
        setHits((cur) => (cur ?? []).map((h) => (h.id === hit.id ? { ...h, image_path: done.url } : h)));
        toast.success(`New photo created for ${done.name}.`);
      } else {
        const f = res.failed[0];
        toast.error(f ? `${f.name}: ${f.error}` : 'The generator returned nothing.');
      }
    } catch (e) {
      toast.error(
        e instanceof EdgeFunctionError || e instanceof Error ? e.message : 'Regeneration failed.'
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <RefreshCw className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold text-foreground">Regenerate one photo</p>
            <p className="text-sm text-muted-foreground">
              If a recipe&apos;s photo shows the wrong dish, search for it below and make a fresh one with
              AI. Costs a few cents per photo.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') search();
            }}
            placeholder="Search recipes, e.g. marengo"
            aria-label="Search recipes"
          />
          <Button onClick={search} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Search</span>
          </Button>
        </div>

        {hits && hits.length > 0 && (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {hits.map((h) => (
              <li key={h.id} className="flex items-center gap-3 p-3">
                {h.image_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={h.image_path} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <ImageIcon className="h-5 w-5" />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{h.name}</span>
                <Button size="sm" variant="outline" onClick={() => regenerate(h)} disabled={busyId !== null}>
                  {busyId === h.id ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  )}
                  {busyId === h.id ? 'Making…' : 'Regenerate'}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {hits && hits.length === 0 && <p className="text-sm text-muted-foreground">No recipes matched.</p>}
      </CardContent>
    </Card>
  );
}
