'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Loader2, Pause, Play, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { callEdgeFunction, EdgeFunctionError } from '@/lib/supabase/functions';

interface RoundResult {
  done: { id: string; name: string; ingredients: number; steps: number }[];
  failed: { id: string; name: string; reason: string }[];
  remaining: number;
}

/**
 * Writes ingredients and a method for library recipes that only have a name
 * and details, using the admin-only `recipe-complete` edge function.
 * "Try 5" first so the results can be checked, then fill the rest.
 */
export function RecipeFill() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [recent, setRecent] = useState<RoundResult['done']>([]);
  const [failed, setFailed] = useState<RoundResult['failed']>([]);
  const stopRef = useRef(false);
  const skipRef = useRef<string[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await callEdgeFunction<{ remaining: number }>('recipe-complete');
      setRemaining(res.remaining);
      setError(null);
    } catch (err) {
      setError(
        err instanceof EdgeFunctionError && err.status === 404
          ? 'Deploy the recipe-complete function first (Supabase → Edge Functions).'
          : err instanceof Error
            ? err.message
            : 'Could not check the recipes.'
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (max?: number) => {
    stopRef.current = false;
    setRunning(true);
    let made = 0;
    try {
      while (!stopRef.current) {
        const limit = max ? Math.min(6, max - made) : 6;
        if (limit <= 0) break;
        let res: RoundResult;
        try {
          res = await callEdgeFunction<RoundResult>('recipe-complete', undefined, {
            body: { limit, skip: skipRef.current },
          });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Something went wrong.');
          break;
        }
        made += res.done.length;
        setRecent((cur) => [...res.done, ...cur].slice(0, 30));
        if (res.failed.length) {
          skipRef.current = [...skipRef.current, ...res.failed.map((f) => f.id)];
          setFailed((cur) => [...cur, ...res.failed]);
        }
        setRemaining(res.remaining);
        if (res.remaining === 0 || (res.done.length === 0 && res.failed.length === 0)) break;
        if (max && made + res.failed.length >= max) break;
      }
    } finally {
      setRunning(false);
      if (made) toast.success(`Completed ${made} recipe${made === 1 ? '' : 's'}`);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="font-display text-lg font-semibold text-foreground">Complete recipes</p>
            <p className="text-sm text-muted-foreground">
              Some library recipes have a name, description and times but no ingredients or method, so the app hides them.
              This writes both with your OpenAI key, checks every result is halal, and adds the recipe back to the library.
              About $1–3 for all of them, once.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={load} aria-label="Refresh" disabled={running}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {error ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : remaining === null ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking…
          </p>
        ) : remaining === 0 ? (
          <p className="text-sm text-brand-sage">Every recipe has ingredients and a method.</p>
        ) : (
          <>
            <p className="text-sm text-foreground">
              <strong>{remaining}</strong> recipe{remaining === 1 ? '' : 's'} still need ingredients.
            </p>
            {running ? (
              <div className="space-y-2">
                <Button variant="outline" onClick={() => (stopRef.current = true)}>
                  <Pause className="mr-2 h-4 w-4" /> Pause after this round
                </Button>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Working — about 20 seconds per round of 6. Keep this page
                  open; you can pause and continue later.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant={recent.length ? 'outline' : 'default'} onClick={() => run(5)}>
                  <Play className="mr-2 h-4 w-4" /> Try 5 first
                </Button>
                <Button variant={recent.length ? 'default' : 'outline'} onClick={() => run()}>
                  Fill all {remaining}
                </Button>
              </div>
            )}
          </>
        )}

        {recent.length > 0 && (
          <div className="text-sm">
            <p className="font-medium text-foreground">Just completed — open a few to check them</p>
            <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <Link href={`/dashboard/recipes/c-${r.id}`} target="_blank" className="truncate text-foreground hover:text-primary">
                    {r.name}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {r.ingredients} ingredients · {r.steps} steps
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {failed.length > 0 && (
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Skipped ({failed.length}) — they stay hidden, try again later</p>
            <ul className="mt-1 list-disc pl-5">
              {failed.slice(0, 8).map((f) => (
                <li key={f.id}>
                  {f.name} — {f.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
