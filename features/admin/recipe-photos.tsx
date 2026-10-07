'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Pause, Play, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { callEdgeFunction, EdgeFunctionError } from '@/lib/supabase/functions';

interface Status {
  total: number;
  withPhoto: number;
  remaining: number;
  model: string;
  quality: string;
  costPerImage: number | null;
  configured: boolean;
}

interface RoundResult {
  done: { id: string; name: string; url: string }[];
  failed: { id: string; name: string; error: string }[];
  remaining: number;
}

const money = (n: number) => (n < 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(2)}`);

/**
 * Generates a photo for every library recipe without one, a few at a time,
 * using the `recipe-images` edge function. Safe to pause and resume.
 */
export function RecipePhotos() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [recent, setRecent] = useState<RoundResult['done']>([]);
  const [failed, setFailed] = useState<RoundResult['failed']>([]);
  const stopRef = useRef(false);
  const skipRef = useRef<string[]>([]);

  const load = useCallback(async () => {
    try {
      setStatus(await callEdgeFunction<Status>('recipe-images'));
      setError(null);
    } catch (err) {
      setError(
        err instanceof EdgeFunctionError && err.status === 404
          ? 'Deploy the recipe-images function first: supabase functions deploy recipe-images'
          : err instanceof Error
            ? err.message
            : 'Could not load photo status.'
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async () => {
    stopRef.current = false;
    setRunning(true);
    let made = 0;
    try {
      while (!stopRef.current) {
        let res: RoundResult;
        try {
          res = await callEdgeFunction<RoundResult>('recipe-images', undefined, {
            body: { limit: 2, skip: skipRef.current },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Something went wrong.';
          toast.error(msg);
          break;
        }
        made += res.done.length;
        setRecent((cur) => [...res.done, ...cur].slice(0, 12));
        if (res.failed.length) {
          skipRef.current = [...skipRef.current, ...res.failed.map((f) => f.id)];
          setFailed((cur) => [...cur, ...res.failed]);
          const accountProblem = res.failed.find((f) => /credit|rate limit/i.test(f.error));
          if (accountProblem) {
            if (/credit/i.test(accountProblem.error)) {
              toast.error(accountProblem.error);
              break;
            }
            // Rate limited: unskip and wait before the next round.
            skipRef.current = skipRef.current.filter((id) => id !== accountProblem.id);
            setFailed((cur) => cur.filter((f) => f.id !== accountProblem.id));
            await new Promise((r) => setTimeout(r, 30_000));
          }
        }
        setStatus((s) => (s ? { ...s, remaining: res.remaining, withPhoto: s.total - res.remaining } : s));
        if (res.remaining === 0 || (res.done.length === 0 && res.failed.length === 0)) break;
      }
    } finally {
      setRunning(false);
      if (made) toast.success(`Created ${made} photo${made === 1 ? '' : 's'}`);
      load();
    }
  };

  const pct = status && status.total ? Math.round((status.withPhoto / status.total) * 100) : 0;
  const estimate = status?.costPerImage != null ? status.costPerImage * status.remaining : null;

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Camera className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="font-display text-lg font-semibold text-foreground">Recipe photos</p>
            <p className="text-sm text-muted-foreground">
              Creates a photo of each library recipe that doesn’t have one yet, in one warm, consistent style. Photos are
              saved to your Supabase storage, so this only costs once.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={load} aria-label="Refresh" disabled={running}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {error ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : !status ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking…
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground">
                  {status.withPhoto} of {status.total} recipes have a photo
                </span>
                <span className="text-muted-foreground">{pct}%</span>
              </div>
              <Progress value={pct} />
              <p className="text-xs text-muted-foreground">
                Model {status.model} ({status.quality} quality)
                {status.costPerImage != null && <> · about {money(status.costPerImage)} per photo</>}
                {estimate != null && status.remaining > 0 && (
                  <> · about {money(estimate)} for the {status.remaining} remaining</>
                )}
              </p>
            </div>

            {!status.configured ? (
              <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                Add <code>OPENAI_API_KEY</code> to your Supabase function secrets to create photos.
              </p>
            ) : status.remaining === 0 ? (
              <p className="text-sm text-brand-sage">Every recipe has a photo.</p>
            ) : running ? (
              <Button variant="outline" onClick={() => (stopRef.current = true)}>
                <Pause className="mr-2 h-4 w-4" /> Pause after this round
              </Button>
            ) : (
              <Button onClick={run}>
                <Play className="mr-2 h-4 w-4" /> Generate {status.remaining} photo{status.remaining === 1 ? '' : 's'}
              </Button>
            )}
            {running && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Working — about 15–30 seconds per photo. Keep this page
                open; you can pause and continue later.
              </p>
            )}
          </>
        )}

        {recent.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {recent.map((r) => (
              <figure key={r.id} className="overflow-hidden rounded-xl border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.url} alt={r.name} className="aspect-[3/2] w-full object-cover" />
                <figcaption className="truncate px-2 py-1.5 text-xs text-foreground">{r.name}</figcaption>
              </figure>
            ))}
          </div>
        )}
        {failed.length > 0 && (
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Skipped ({failed.length})</p>
            <ul className="mt-1 list-disc pl-5">
              {failed.slice(0, 8).map((f) => (
                <li key={f.id}>
                  {f.name} — {f.error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
