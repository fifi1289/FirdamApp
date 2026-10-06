'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Heart, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  DUAS,
  DUA_CATEGORIES,
  duaOfTheDay,
  type Dua,
  type DuaCategory,
} from '@/features/quran/duas';

const FAVOURITES_KEY = 'firdam.duas.favourites';

function useFavourites() {
  const [favs, setFavs] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FAVOURITES_KEY);
      if (raw) setFavs(new Set(JSON.parse(raw) as string[]));
    } catch {
      // ignore
    }
  }, []);
  const toggle = (id: string) =>
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(FAVOURITES_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  return { favs, toggle };
}

export function DuaCard({
  dua,
  showTransliteration,
  favourite,
  onToggleFavourite,
  featured,
}: {
  dua: Dua;
  showTransliteration: boolean;
  favourite?: boolean;
  onToggleFavourite?: () => void;
  featured?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${dua.title}\n\n${dua.arabic}\n\n${dua.transliteration}\n\n${dua.translation}\n— ${dua.source}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <Card className={cn('overflow-hidden', featured && 'border-primary/30')}>
      <CardContent className={cn('p-5', featured && 'bg-girih')}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">{dua.title}</p>
            <p className="text-xs text-muted-foreground">
              {dua.category}
              {dua.repeat ? ` · ${dua.repeat}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={copy}
              aria-label="Copy dua"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {copied ? <Check className="h-4 w-4 text-brand-sage" /> : <Copy className="h-4 w-4" />}
            </button>
            {onToggleFavourite && (
              <button
                type="button"
                onClick={onToggleFavourite}
                aria-label={favourite ? 'Remove from favourites' : 'Add to favourites'}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Heart className={cn('h-4 w-4', favourite && 'fill-destructive text-destructive')} />
              </button>
            )}
          </div>
        </div>
        <p
          lang="ar"
          dir="rtl"
          className={cn(
            'mt-4 font-arabic leading-[2.1] text-foreground',
            featured ? 'text-2xl md:text-3xl' : 'text-xl'
          )}
        >
          {dua.arabic}
        </p>
        {showTransliteration && (
          <p className="mt-3 text-sm italic text-primary">{dua.transliteration}</p>
        )}
        <p className="mt-2 text-sm leading-relaxed text-foreground/85">{dua.translation}</p>
        <p className="mt-3 text-xs text-muted-foreground">{dua.source}</p>
      </CardContent>
    </Card>
  );
}

export function DuasView() {
  const [category, setCategory] = useState<DuaCategory | 'all' | 'favourites'>('all');
  const [query, setQuery] = useState('');
  const [showTranslit, setShowTranslit] = useState(true);
  const { favs, toggle } = useFavourites();
  const today = useMemo(() => duaOfTheDay(), []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DUAS.filter((d) => {
      if (category === 'favourites' && !favs.has(d.id)) return false;
      if (category !== 'all' && category !== 'favourites' && d.category !== category) return false;
      if (q && !`${d.title} ${d.translation} ${d.transliteration}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [category, query, favs]);

  const chips: { value: typeof category; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'favourites', label: `Favourites${favs.size ? ` (${favs.size})` : ''}` },
    ...DUA_CATEGORIES.map((c) => ({ value: c, label: c })),
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Dua of the day
        </p>
        <DuaCard
          dua={today}
          showTransliteration={showTranslit}
          favourite={favs.has(today.id)}
          onToggleFavourite={() => toggle(today.id)}
          featured
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search duas (e.g. travel, parents, sleep)"
            className="pl-9"
            aria-label="Search duas"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="translit" checked={showTranslit} onCheckedChange={setShowTranslit} />
          <Label htmlFor="translit" className="text-sm text-muted-foreground">
            Show transliteration
          </Label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCategory(c.value)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
              category === c.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {category === 'favourites'
            ? 'Tap the heart on any dua to keep it here.'
            : 'No duas match your search.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visible.map((d) => (
            <DuaCard
              key={d.id}
              dua={d}
              showTransliteration={showTranslit}
              favourite={favs.has(d.id)}
              onToggleFavourite={() => toggle(d.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
