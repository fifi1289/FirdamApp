'use client';

import { useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AFFILIATE_NOTE, DEPARTMENT_PICKS, amazonSearchUrl, parseBudget } from '@/features/groceries/shop-links';

/** A shopping department (Household, Clothing…): search Amazon.ca within a budget, or tap a quick pick. */
export function ShopDepartment({ id, label, note }: { id: string; label: string; note: string }) {
  const [query, setQuery] = useState('');
  const [max, setMax] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const picks = DEPARTMENT_PICKS[id] ?? [];

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return setProblem('Type what you’re looking for.');
    if (max.trim() && parseBudget(max) == null) return setProblem('Enter your budget as a number, for example 40.');
    window.open(amazonSearchUrl(query, parseBudget(max)), '_blank', 'noopener');
  };

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{label}</h2>
          <p className="text-sm text-muted-foreground">{note}. Opens on Amazon.ca.</p>
        </div>

        <form onSubmit={search} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_150px_auto]">
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setProblem(null);
            }}
            placeholder="What are you looking for?"
            aria-label={`Search ${label}`}
          />
          <Input
            value={max}
            onChange={(e) => {
              setMax(e.target.value);
              setProblem(null);
            }}
            inputMode="decimal"
            placeholder="Max budget ($)"
            aria-label="Maximum budget in Canadian dollars (optional)"
          />
          <Button type="submit">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </form>
        {problem && <p className="text-sm text-destructive">{problem}</p>}

        {picks.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Popular</p>
            <div className="flex flex-wrap gap-2">
              {picks.map((p) => (
                <a
                  key={p.query}
                  href={amazonSearchUrl(p.query, parseBudget(max))}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted"
                >
                  {p.label}
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">{AFFILIATE_NOTE} Prices and availability are shown on Amazon.ca.</p>
      </CardContent>
    </Card>
  );
}
