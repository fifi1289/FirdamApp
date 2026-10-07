'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Archive,
  BookOpen,
  CalendarClock,
  Check,
  Droplets,
  Flame,
  Footprints,
  Loader2,
  Moon,
  Pill,
  Plus,
  Salad,
  Sparkles,
  Stethoscope,
  Sun,
  Syringe,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UpgradeDialog, UsageNote } from '@/components/plan/upgrade-prompt';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { usePlan } from '@/lib/plan/plan';
import { cn } from '@/lib/utils';
import type { FamilyMember, Habit, HealthRecord, HealthRecordKind } from '@/types/database';

const HABIT_ICONS: Record<string, LucideIcon> = {
  water: Droplets,
  walk: Footprints,
  sleep: Moon,
  fast: Sun,
  adhkar: Sparkles,
  food: Salad,
  read: BookOpen,
  exercise: Activity,
  sparkles: Sparkles,
};

const SUGGESTIONS: { name: string; icon: string; kind: Habit['kind']; days?: number[] }[] = [
  { name: 'Drink 8 glasses of water', icon: 'water', kind: 'health' },
  { name: 'Walk for 30 minutes', icon: 'walk', kind: 'health' },
  { name: 'Sleep before 11 pm', icon: 'sleep', kind: 'health' },
  { name: 'Sunnah fast (Monday & Thursday)', icon: 'fast', kind: 'sunnah', days: [1, 4] },
  { name: 'Morning & evening adhkar', icon: 'adhkar', kind: 'faith' },
  { name: 'Eat 5 portions of fruit & veg', icon: 'food', kind: 'health' },
  { name: 'Read 10 pages', icon: 'read', kind: 'other' },
  { name: 'Exercise or stretch', icon: 'exercise', kind: 'health' },
];

const RECORD_KINDS: Record<HealthRecordKind, { label: string; icon: LucideIcon }> = {
  appointment: { label: 'Appointment', icon: Stethoscope },
  vaccination: { label: 'Vaccination', icon: Syringe },
  allergy: { label: 'Allergy', icon: AlertTriangle },
  medication: { label: 'Medication', icon: Pill },
  condition: { label: 'Condition', icon: Activity },
  measurement: { label: 'Measurement', icon: Activity },
  note: { label: 'Note', icon: BookOpen },
};

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function lastDays(n: number): Date[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (n - 1 - i));
    return d;
  });
}

/** Consecutive scheduled days completed, ending today (or yesterday if today isn't done yet). */
export function habitStreak(days: number[], logged: Set<string>): number {
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  let streak = 0;
  let first = true;
  for (let i = 0; i < 400; i++) {
    const scheduled = days.includes(cursor.getDay());
    if (scheduled) {
      if (logged.has(iso(cursor))) streak++;
      else if (!first) break;
      first = false;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function Habits() {
  const supabase = createSupabaseBrowserClient();
  const { atLimit, limit } = usePlan();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [custom, setCustom] = useState('');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const week = useMemo(() => lastDays(7), []);

  const load = useCallback(async () => {
    const since = new Date();
    since.setDate(since.getDate() - 120);
    const [{ data: h }, { data: l }] = await Promise.all([
      supabase.from('habits').select('*').eq('archived', false).order('created_at'),
      supabase.from('habit_logs').select('habit_id,log_date').gte('log_date', iso(since)),
    ]);
    setHabits(h ?? []);
    const map = new Map<string, Set<string>>();
    for (const row of l ?? []) {
      const set = map.get(row.habit_id) ?? new Set<string>();
      set.add(row.log_date);
      map.set(row.habit_id, set);
    }
    setLogs(map);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (s: { name: string; icon: string; kind: Habit['kind']; days?: number[] }) => {
    if (atLimit('habits', habits.length)) {
      setUpgradeOpen(true);
      return;
    }
    const { data, error } = await supabase
      .from('habits')
      .insert({ name: s.name, icon: s.icon, kind: s.kind, days: s.days ?? [0, 1, 2, 3, 4, 5, 6] })
      .select()
      .single();
    if (error) return toast.error('Could not add habit');
    setHabits((prev) => [...prev, data]);
    setCustom('');
  };

  const toggle = async (habit: Habit, day: Date) => {
    const key = iso(day);
    const set = new Set(logs.get(habit.id) ?? []);
    const had = set.has(key);
    if (had) set.delete(key);
    else set.add(key);
    setLogs((prev) => new Map(prev).set(habit.id, set));
    const { error } = had
      ? await supabase.from('habit_logs').delete().eq('habit_id', habit.id).eq('log_date', key)
      : await supabase.from('habit_logs').insert({ habit_id: habit.id, log_date: key });
    if (error) {
      toast.error('Could not save');
      load();
    }
  };

  const archive = async (habit: Habit) => {
    setHabits((prev) => prev.filter((h) => h.id !== habit.id));
    await supabase.from('habits').update({ archived: true }).eq('id', habit.id);
  };

  const todayKey = iso(new Date());
  const todaysDue = habits.filter((h) => h.days.includes(new Date().getDay()));
  const todaysDone = todaysDue.filter((h) => logs.get(h.id)?.has(todayKey)).length;
  const existing = new Set(habits.map((h) => h.name));

  if (loading) {
    return (
      <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading habits…
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {habits.length > 0 && (
        <Card className="overflow-hidden">
          <CardContent className="bg-girih flex items-center gap-4 p-5">
            <div className="relative h-16 w-16">
              <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  className="stroke-brand-sage transition-all"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${todaysDue.length ? (todaysDone / todaysDue.length) * 97.4 : 0} 97.4`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-foreground">
                {todaysDone}/{todaysDue.length}
              </span>
            </div>
            <div>
              <p className="font-semibold text-foreground">Today</p>
              <p className="text-sm text-muted-foreground">
                {todaysDue.length === 0
                  ? 'No habits scheduled today.'
                  : todaysDone === todaysDue.length
                    ? 'All done — MashaAllah!'
                    : `${todaysDue.length - todaysDone} to go. Small steps, done consistently.`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {habits.length > 0 && (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">Habit</th>
                  {week.map((d) => (
                    <th key={iso(d)} className="w-11 px-1 py-3 text-center font-medium">
                      <span className="block">{d.toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
                      <span className="block text-[10px]">{d.getDate()}</span>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-medium">Streak</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {habits.map((h) => {
                  const Icon = HABIT_ICONS[h.icon] ?? Sparkles;
                  const set = logs.get(h.id) ?? new Set<string>();
                  const streak = habitStreak(h.days, set);
                  return (
                    <tr key={h.id} className="group border-b border-border/60 last:border-0">
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="font-medium text-foreground">{h.name}</span>
                          {h.kind === 'sunnah' && (
                            <Badge variant="outline" className="text-[10px]">
                              Sunnah
                            </Badge>
                          )}
                        </span>
                      </td>
                      {week.map((d) => {
                        const scheduled = h.days.includes(d.getDay());
                        const done = set.has(iso(d));
                        return (
                          <td key={iso(d)} className="px-1 py-2.5 text-center">
                            {scheduled ? (
                              <button
                                type="button"
                                onClick={() => toggle(h, d)}
                                aria-label={`${h.name} on ${d.toDateString()}`}
                                className={cn(
                                  'mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
                                  done
                                    ? 'border-brand-sage bg-brand-sage text-white'
                                    : 'border-border hover:border-primary'
                                )}
                              >
                                {done && <Check className="h-4 w-4" strokeWidth={3} />}
                              </button>
                            ) : (
                              <span className="text-muted-foreground/40">·</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn('inline-flex items-center gap-1 text-sm font-semibold', streak > 0 ? 'text-[#b4691f]' : 'text-muted-foreground')}>
                          <Flame className="h-4 w-4" /> {streak}
                        </span>
                      </td>
                      <td className="pr-3">
                        <button
                          type="button"
                          onClick={() => archive(h)}
                          aria-label={`Archive ${h.name}`}
                          className="rounded p-1 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-foreground">{habits.length ? 'Add a habit' : 'Start with a habit or two'}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.filter((s) => !existing.has(s.name)).map((s) => {
              const Icon = HABIT_ICONS[s.icon] ?? Sparkles;
              return (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => add(s)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40"
                >
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {s.name}
                </button>
              );
            })}
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (custom.trim()) add({ name: custom.trim(), icon: 'sparkles', kind: 'other' });
            }}
          >
            <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Your own habit" maxLength={80} />
            <Button type="submit" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </form>
          <div className="mt-3">
            <UsageNote used={habits.length} limit={limit('habits')} label="habits" onUpgrade={() => setUpgradeOpen(true)} />
          </div>
        </CardContent>
      </Card>
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} limitKey="habits" />
    </div>
  );
}

function Records() {
  const supabase = createSupabaseBrowserClient();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    member_id: 'none',
    kind: 'appointment' as HealthRecordKind,
    title: '',
    record_date: '',
    next_date: '',
    details: '',
  });

  const load = useCallback(async () => {
    const [{ data: r }, { data: m }] = await Promise.all([
      supabase.from('health_records').select('*').order('record_date', { ascending: false, nullsFirst: false }),
      supabase.from('family_members').select('*').order('created_at'),
    ]);
    setRecords(r ?? []);
    setMembers(m ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!form.title.trim()) return toast.error('Add a title.');
    const { error } = await supabase.from('health_records').insert({
      member_id: form.member_id === 'none' ? null : form.member_id,
      kind: form.kind,
      title: form.title.trim(),
      record_date: form.record_date || null,
      next_date: form.next_date || null,
      details: form.details.trim() || null,
    });
    if (error) return toast.error('Could not save record');
    setOpen(false);
    setForm({ member_id: 'none', kind: 'appointment', title: '', record_date: '', next_date: '', details: '' });
    load();
  };

  const remove = async (r: HealthRecord) => {
    setRecords((prev) => prev.filter((x) => x.id !== r.id));
    await supabase.from('health_records').delete().eq('id', r.id);
  };

  const nameOf = (id: string | null) => (id ? members.find((m) => m.id === id)?.first_name ?? 'Family member' : 'Household');
  const visible = records.filter((r) => member === 'all' || (member === 'none' ? !r.member_id : r.member_id === member));
  const today = iso(new Date());
  const upcoming = records
    .filter((r) => (r.next_date && r.next_date >= today) || (r.kind === 'appointment' && r.record_date && r.record_date >= today))
    .sort((a, b) => (a.next_date ?? a.record_date ?? '').localeCompare(b.next_date ?? b.record_date ?? ''));
  const allergies = records.filter((r) => r.kind === 'allergy');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={member} onValueChange={setMember}>
          <SelectTrigger className="h-9 w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone</SelectItem>
            <SelectItem value="none">Household</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.first_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add record
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <CalendarClock className="h-4 w-4 text-primary" /> Coming up
            </h3>
            {upcoming.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No upcoming appointments or doses.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {upcoming.slice(0, 6).map((r) => (
                  <li key={r.id} className="flex justify-between gap-3 text-sm">
                    <span className="text-foreground">
                      {r.title} <span className="text-muted-foreground">· {nameOf(r.member_id)}</span>
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {new Date(`${r.next_date ?? r.record_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Allergies
            </h3>
            {allergies.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No allergies recorded.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {allergies.map((a) => (
                  <Badge key={a.id} variant="outline" className="border-destructive/30 bg-destructive/5 text-destructive">
                    {a.title} · {nameOf(a.member_id)}
                  </Badge>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">Remember to add allergies to your meal preferences too.</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : visible.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">No records yet. Add appointments, vaccinations and allergies to keep the family’s health in one place.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((r) => {
            const Icon = RECORD_KINDS[r.kind].icon;
            return (
              <Card key={r.id} className="group">
                <CardContent className="flex items-start gap-3 p-4">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {RECORD_KINDS[r.kind].label} · {nameOf(r.member_id)}
                      {r.record_date && ` · ${new Date(`${r.record_date}T00:00:00`).toLocaleDateString()}`}
                      {r.next_date && ` · next ${new Date(`${r.next_date}T00:00:00`).toLocaleDateString()}`}
                    </p>
                    {r.details && <p className="mt-1 text-muted-foreground">{r.details}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(r)}
                    aria-label="Delete record"
                    className="rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a health record</DialogTitle>
            <DialogDescription>Private to your account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as HealthRecordKind })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(RECORD_KINDS) as HealthRecordKind[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {RECORD_KINDS[k].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>For</Label>
                <Select value={form.member_id} onValueChange={(v) => setForm({ ...form, member_id: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Household</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.first_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hr-title">Title</Label>
              <Input
                id="hr-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={form.kind === 'allergy' ? 'e.g. Peanuts' : form.kind === 'vaccination' ? 'e.g. MMR' : 'e.g. Dentist check-up'}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="hr-date">Date</Label>
                <Input id="hr-date" type="date" value={form.record_date} onChange={(e) => setForm({ ...form, record_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hr-next">Next due (optional)</Label>
                <Input id="hr-next" type="date" value={form.next_date} onChange={(e) => setForm({ ...form, next_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hr-details">Details</Label>
              <Textarea id="hr-details" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function HealthDashboard() {
  return (
    <AppShell>
      <PageHeader
        title="Health"
        description="Build healthy and sunnah habits, and keep the family’s appointments, vaccinations and allergies in one place."
      />
      <Tabs defaultValue="habits">
        <TabsList className="mb-5">
          <TabsTrigger value="habits">Habits</TabsTrigger>
          <TabsTrigger value="records">Family health</TabsTrigger>
        </TabsList>
        <TabsContent value="habits" className="mt-0">
          <Habits />
        </TabsContent>
        <TabsContent value="records" className="mt-0">
          <Records />
        </TabsContent>
      </Tabs>
      <p className="mt-8 text-xs text-muted-foreground">
        Firdam helps you keep track — it doesn’t give medical advice. Speak to your doctor about any health concerns.
      </p>
    </AppShell>
  );
}
