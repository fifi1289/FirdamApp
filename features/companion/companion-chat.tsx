'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, CheckCircle2, ChefHat, Crown, Loader2, RotateCcw, Sparkles } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { UpgradeDialog } from '@/components/plan/upgrade-prompt';
import { useAuth } from '@/components/auth/auth-provider';
import { callEdgeFunction, EdgeFunctionError } from '@/lib/supabase/functions';
import { readSavedLocation } from '@/lib/geo/location';
import { fetchPrayerDay, format12h, PRAYER_ORDER, usePrayerSettings } from '@/lib/prayer/prayer';
import { firstNameFor } from '@/lib/auth/display-name';
import { FAIR_USE, usePlan } from '@/lib/plan/plan';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  actions?: { type: string; summary: string }[];
}

const STORAGE_KEY = 'firdam.companion.history';

const SUGGESTIONS = [
  'What does our family have on this week?',
  'Suggest a quick halal dinner using what’s in my pantry',
  'Add dates, milk and lamb mince to my shopping list',
  'Remind me to call the masjid about Jumu’ah on Friday at 10:00',
  'How are we doing on our budget this month?',
  'Help me plan a simple Eid lunch for 8 people',
];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Minimal formatting: paragraphs, bullet lines and **bold**. */
function Formatted({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        const isList = lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l));
        const fmt = (s: string) =>
          s.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith('**') && part.endsWith('**') ? <strong key={j}>{part.slice(2, -2)}</strong> : part
          );
        if (isList) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{fmt(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ''))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line">
            {fmt(block)}
          </p>
        );
      })}
    </div>
  );
}

export function CompanionChat() {
  const { user } = useAuth();
  const { settings, ready } = usePrayerSettings();
  const { isPaid, loading: planLoading } = usePlan();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [prayerTimes, setPrayerTimes] = useState<Record<string, string> | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Chat history stays on this device, per account.
  const storageKey = user ? `${STORAGE_KEY}.${user.id}` : null;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      setMessages(raw ? (JSON.parse(raw) as Message[]) : []);
    } catch {
      setMessages([]);
    }
    setLoadedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (storageKey && loadedKey === storageKey) {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(messages.slice(-40)));
      } catch {
        // ignore
      }
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, storageKey, loadedKey]);

  useEffect(() => {
    const loc = readSavedLocation();
    if (!loc || !ready) return;
    fetchPrayerDay(loc.latitude, loc.longitude, settings)
      .then((d) => {
        const t: Record<string, string> = {};
        for (const p of PRAYER_ORDER) t[p.label] = format12h(d.timings[p.key]);
        setPrayerTimes(t);
      })
      .catch(() => undefined);
  }, [settings, ready]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    const next: Message[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setSending(true);
    setError(null);
    try {
      const res = await callEdgeFunction<{ reply: string; actions: { type: string; summary: string }[] }>(
        'companion',
        undefined,
        {
          body: {
            messages: next.map(({ role, content: c }) => ({ role, content: c })),
            today: todayISO(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            prayerTimes,
            location: readSavedLocation()?.label,
          },
        }
      );
      setMessages((m) => [...m, { role: 'assistant', content: res.reply, actions: res.actions }]);
    } catch (err) {
      if (err instanceof EdgeFunctionError && err.status === 402) {
        setUpgradeOpen(true);
        setError(err.message);
      } else if (err instanceof EdgeFunctionError && err.status === 501) {
        setError('The Companion isn’t switched on yet. The Firdam team is finishing setup.');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  const name = user ? firstNameFor(user) : '';

  if (!planLoading && !isPaid) return <CompanionLocked />;

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-dark to-brand-gold text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-xl font-semibold text-foreground">Family Companion</h1>
              <p className="text-xs text-muted-foreground">Knows your family’s plans — and can add tasks, events and shopping for you.</p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setMessages([])}>
              <RotateCcw className="mr-2 h-4 w-4" /> New chat
            </Button>
          )}
        </div>

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CardContent className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {messages.length === 0 ? (
              <div className="bg-girih flex h-full flex-col items-center justify-center rounded-2xl px-4 py-10 text-center">
                <p className="font-arabic text-xl text-primary" lang="ar" dir="rtl">
                  السَّلَامُ عَلَيْكُمْ
                </p>
                <p className="mt-2 font-display text-lg font-semibold text-foreground">
                  How can I help{name ? `, ${name}` : ''}?
                </p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Ask about your week, plan meals, add to your shopping list, track spending, or ask a general
                  question about Islamic practice.
                </p>
                <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-xl border border-border bg-card px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:border-primary/40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                      m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    )}
                  >
                    {m.role === 'assistant' ? <Formatted text={m.content} /> : <p className="whitespace-pre-line">{m.content}</p>}
                    {m.actions && m.actions.length > 0 && (
                      <ul className="mt-3 space-y-1 border-t border-border/60 pt-2">
                        {m.actions.map((a, j) => (
                          <li key={j} className="flex items-start gap-1.5 text-xs text-brand-sage">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {a.summary}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
                </div>
              </div>
            )}
            {error && <p className="text-center text-sm text-destructive">{error}</p>}
            <div ref={bottomRef} />
          </CardContent>

          <form
            className="flex items-end gap-2 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask your Companion…"
              rows={1}
              className="max-h-40 min-h-[44px] resize-none"
              aria-label="Message"
            />
            <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={sending || !input.trim()} aria-label="Send">
              <ArrowUp className="h-5 w-5" />
            </Button>
          </form>
        </Card>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          The Companion can make mistakes. For religious rulings, ask a qualified scholar.{' '}
          Up to {FAIR_USE.companionMessagesPerDay} messages a day.
        </p>
      </div>
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} title="The Companion is part of Premium" />
    </AppShell>
  );
}

const LOCKED_EXAMPLES = [
  'What does our family have on this week?',
  'Plan a simple Eid lunch for 8 people',
  'Add dates, milk and lamb mince to my shopping list',
  'How are we doing on our budget this month?',
];

/** Shown to Free users: what the Companion does, plus the free alternative. */
function CompanionLocked() {
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-5 py-4">
        <Card className="overflow-hidden">
          <div className="bg-girih bg-gradient-to-br from-brand-espresso via-brand-dark to-brand-mid px-6 py-8 text-brand-linen">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gold text-brand-espresso">
              <Sparkles className="h-5 w-5" />
            </span>
            <h1 className="mt-4 font-display text-2xl font-semibold">Your Family Companion</h1>
            <p className="mt-1 max-w-md text-sm text-brand-linen/80">
              An AI assistant that knows your family’s week, meals, pantry and budget — and can add tasks, events and
              shopping for you. Included with Premium and Family+.
            </p>
          </div>
          <CardContent className="space-y-5 p-6">
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {LOCKED_EXAMPLES.map((e) => (
                <li key={e} className="rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
                  “{e}”
                </li>
              ))}
            </ul>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/dashboard/upgrade">
                <Crown className="mr-2 h-4 w-4" /> Start 14-day free trial
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Link
          href="/dashboard/recipes?tab=cook"
          className="flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 transition-colors hover:border-primary/40"
        >
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ChefHat className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-foreground">Free: What can I cook?</p>
            <p className="text-sm text-muted-foreground">
              Type what you have — chicken, tomato, eggs, potato — and get halal recipes you can make now.
            </p>
          </div>
        </Link>
      </div>
    </AppShell>
  );
}
