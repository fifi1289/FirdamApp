'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ExternalLink,
  Flame,
  Loader2,
  Plus,
  Search,
  Target,
  Trash2,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { QuranReadingSession } from '@/types/database';
import { QURAN_PAGES, SURAHS } from '@/features/quran/surahs';

const GOAL_KEY = 'firdam.quran.dailyGoal';

const GOAL_OPTIONS = [
  { pages: 1, label: '1 page a day', hint: 'Khatm in about 20 months' },
  { pages: 2, label: '2 pages a day', hint: 'Khatm in about 10 months' },
  { pages: 4, label: '4 pages a day', hint: 'Khatm in about 5 months' },
  { pages: 10, label: 'Half a juz a day', hint: 'Khatm in 2 months' },
  { pages: 20, label: 'One juz a day', hint: 'Khatm in a month' },
];

export function isoDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function readingStreak(sessions: { read_on: string }[]): number {
  const days = new Set(sessions.map((s) => s.read_on));
  const cursor = new Date();
  if (!days.has(isoDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(isoDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Icon className="h-4 w-4 text-primary" />
          {label}
        </div>
        <p className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function QuranReading() {
  const supabase = createSupabaseBrowserClient();
  const [sessions, setSessions] = useState<QuranReadingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [goal, setGoal] = useState(4);
  const [surahQuery, setSurahQuery] = useState('');

  useEffect(() => {
    try {
      const g = Number(window.localStorage.getItem(GOAL_KEY));
      if (g > 0) setGoal(g);
    } catch {
      // ignore
    }
  }, []);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('quran_reading_sessions')
      .select('*')
      .order('read_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) console.error('Failed to load reading log:', error.message);
    setSessions(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const today = isoDate();
    const monthPrefix = today.slice(0, 7);
    let total = 0;
    let todayPages = 0;
    let monthPages = 0;
    for (const s of sessions) {
      total += s.pages;
      if (s.read_on === today) todayPages += s.pages;
      if (s.read_on.startsWith(monthPrefix)) monthPages += s.pages;
    }
    const khatms = Math.floor(total / QURAN_PAGES);
    const intoKhatm = total % QURAN_PAGES;
    return {
      total,
      todayPages,
      monthPages,
      khatms,
      intoKhatm,
      streak: readingStreak(sessions),
    };
  }, [sessions]);

  const logReading = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Math.round(Number(pages));
    if (!Number.isFinite(n) || n < 1 || n > QURAN_PAGES) {
      toast.error('Enter how many pages you read (1–604).');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from('quran_reading_sessions')
      .insert({ pages: n, note: note.trim() || null, read_on: isoDate() })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast.error('Could not save', { description: error.message });
      return;
    }
    const before = stats.intoKhatm;
    setSessions((prev) => [data, ...prev]);
    setPages('');
    setNote('');
    if (before + n >= QURAN_PAGES) {
      toast.success('MashaAllah — you completed a khatm of the Quran!');
    } else if (stats.todayPages < goal && stats.todayPages + n >= goal) {
      toast.success("Today's goal reached. May Allah reward you.");
    } else {
      toast.success('Reading logged');
    }
  };

  const remove = async (s: QuranReadingSession) => {
    setSessions((prev) => prev.filter((x) => x.id !== s.id));
    const { error } = await supabase.from('quran_reading_sessions').delete().eq('id', s.id);
    if (error) {
      toast.error('Could not delete');
      load();
    }
  };

  const changeGoal = (v: string) => {
    const n = Number(v);
    setGoal(n);
    try {
      window.localStorage.setItem(GOAL_KEY, String(n));
    } catch {
      // ignore
    }
  };

  const todayPct = Math.min(100, Math.round((stats.todayPages / goal) * 100));
  const surahs = SURAHS.filter((s) => {
    const q = surahQuery.trim().toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || String(s.number) === q;
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Target} label="Today" value={`${stats.todayPages}/${goal}`} sub="pages" />
        <Stat
          icon={Flame}
          label="Streak"
          value={`${stats.streak}`}
          sub={stats.streak === 1 ? 'day' : 'days'}
        />
        <Stat icon={BookOpen} label="This month" value={`${stats.monthPages}`} sub="pages" />
        <Stat
          icon={Trophy}
          label="Khatm"
          value={`${Math.round((stats.intoKhatm / QURAN_PAGES) * 100)}%`}
          sub={stats.khatms > 0 ? `${stats.khatms} completed` : `${stats.intoKhatm} of ${QURAN_PAGES} pages`}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">Log today&apos;s reading</h3>
              <Select value={String(goal)} onValueChange={changeGoal}>
                <SelectTrigger className="h-8 w-[170px] text-xs" aria-label="Daily goal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_OPTIONS.map((g) => (
                    <SelectItem key={g.pages} value={String(g.pages)}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Progress value={todayPct} className="h-2.5" />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {todayPct >= 100
                  ? 'Daily goal complete — alhamdulillah.'
                  : `${goal - stats.todayPages} page${goal - stats.todayPages === 1 ? '' : 's'} to reach today's goal. ${
                      GOAL_OPTIONS.find((g) => g.pages === goal)?.hint ?? ''
                    }`}
              </p>
            </div>
            <form onSubmit={logReading} className="flex flex-col gap-2 sm:flex-row">
              <Input
                inputMode="numeric"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                placeholder="Pages"
                className="sm:w-24"
                aria-label="Pages read"
              />
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Where you stopped (optional), e.g. Al-Kahf 45"
                maxLength={200}
              />
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span className="ml-2">Log</span>
              </Button>
            </form>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Recent reading
              </p>
              {loading ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </p>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing logged yet. Even one page a day adds up — start today.
                </p>
              ) : (
                <ul className="divide-y divide-border/70">
                  {sessions.slice(0, 8).map((s) => (
                    <li key={s.id} className="group flex items-center gap-3 py-2 text-sm">
                      <span className="w-20 shrink-0 text-xs text-muted-foreground">
                        {new Date(`${s.read_on}T00:00:00`).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="font-medium tabular-nums text-foreground">
                        {s.pages} page{s.pages === 1 ? '' : 's'}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{s.note}</span>
                      <button
                        type="button"
                        onClick={() => remove(s)}
                        aria-label="Delete entry"
                        className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">Open a surah</h3>
              <a
                href="https://quran.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Quran.com <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={surahQuery}
                onChange={(e) => setSurahQuery(e.target.value)}
                placeholder="Search by name or number"
                className="pl-9"
                aria-label="Search surahs"
              />
            </div>
            <ul className="mt-3 grid max-h-[360px] grid-cols-1 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">
              {surahs.map((s) => (
                <li key={s.number}>
                  <a
                    href={`https://quran.com/${s.number}`}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors hover:bg-muted'
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-[11px] font-semibold tabular-nums text-primary">
                      {s.number}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-foreground">{s.name}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{s.ayahs} ayahs</span>
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
