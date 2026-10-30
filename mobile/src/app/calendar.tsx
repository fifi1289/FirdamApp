import { useFocusEffect } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Chip } from '@/components/kitchen-ui';
import { HomeButton } from '@/components/screen';
import { Button, Card, Field, T } from '@/components/ui';
import {
  deleteEvent,
  loadEvents,
  loadHijriMonth,
  loadMembers,
  saveEvent,
  type FamilyEvent,
} from '@/lib/calendar';
import { scheduleEventAlerts } from '@/lib/event-alerts';
import {
  EDITABLE_KINDS,
  EVENT_KIND_LABELS,
  YEARLY_KINDS,
  buildCalendarItems,
  formatTime,
  isISODate,
  isTime,
  iso,
  parseISODate,
  type CalendarEventKind,
  type CalendarItem,
  type CalendarMemberRow,
  type HijriLabel,
} from '@/shared/calendar-core';
import { colors } from '@/theme';
import { locale, tr } from '@/lib/i18n';

const KIND_COLOR: Record<CalendarEventKind, string> = {
  eid: colors.gold,
  aqiqah: colors.sage,
  nikah: colors.brickText,
  walima: '#B5675A',
  birthday: colors.walnut,
  anniversary: '#A9806B',
  school: '#3E6A8A',
  appointment: colors.muted,
  gathering: colors.sageDark,
  islamic: colors.espresso,
  other: colors.sand,
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Family calendar: Eid, Aqiqah, Nikah, school and appointments, with Hijri dates. */
export default function Calendar() {
  const today = iso(new Date());
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const [selected, setSelected] = useState(today);
  const [events, setEvents] = useState<FamilyEvent[] | null>(null);
  const [members, setMembers] = useState<CalendarMemberRow[]>([]);
  const [hijri, setHijri] = useState<Map<string, HijriLabel>>(new Map());
  const [problem, setProblem] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ event: FamilyEvent | null; date: string } | null>(null);

  const load = useCallback(() => {
    Promise.all([loadEvents(), loadMembers()])
      .then(([e, m]) => {
        setEvents(e);
        setMembers(m);
        setProblem(null);
      })
      .catch((e) => {
        setEvents([]);
        setProblem(e instanceof Error ? e.message : tr('Could not load the calendar.'));
      });
  }, []);
  // Reload when coming back (family members may have changed).
  useFocusEffect(load);

  useEffect(() => {
    let cancelled = false;
    loadHijriMonth(month.year, month.month)
      .then((m) => !cancelled && setHijri(m))
      .catch(() => !cancelled && setHijri(new Map()));
    return () => {
      cancelled = true;
    };
  }, [month]);

  const first = new Date(month.year, month.month - 1, 1);
  const last = new Date(month.year, month.month, 0);
  const items = useMemo(() => buildCalendarItems(events ?? [], members, hijri, first, last), [events, members, hijri, month]); // eslint-disable-line react-hooks/exhaustive-deps
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarItem<FamilyEvent>[]>();
    for (const it of items) map.set(it.date, [...(map.get(it.date) ?? []), it]);
    return map;
  }, [items]);

  const shift = (d: number) => {
    const x = new Date(month.year, month.month - 1 + d, 1);
    setMonth({ year: x.getFullYear(), month: x.getMonth() + 1 });
    const inMonth = iso(x).slice(0, 7) === today.slice(0, 7);
    setSelected(inMonth ? today : iso(x));
  };

  const monthLabel = first.toLocaleDateString(locale(), { month: 'long', year: 'numeric' });
  const hFirst = hijri.get(iso(first));
  const hLast = hijri.get(iso(last));
  const hijriLabel =
    hFirst && hLast ? (hFirst.month === hLast.month ? `${hFirst.month} ${hFirst.year}` : `${hFirst.month} – ${hLast.month} ${hLast.year}`) : '';

  const selectedItems = byDate.get(selected) ?? [];
  const hSel = hijri.get(selected);
  const upcoming = items.filter((i) => i.date > selected && i.date >= today).slice(0, 6);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ alignSelf: 'flex-start' }}>
          <HomeButton />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <T weight="extrabold" size={30} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
            {tr('Calendar')}
          </T>
          <Pressable accessibilityRole="button" onPress={() => setEditing({ event: null, date: selected })} style={styles.add}>
            <T weight="bold" size={14} color={colors.white}>
              {tr('+ Add event')}
            </T>
          </Pressable>
        </View>

        <Card style={{ gap: 10, paddingHorizontal: 10 }}>
          <View style={styles.monthRow}>
            <Pressable accessibilityRole="button" accessibilityLabel={tr('Previous month')} onPress={() => shift(-1)} hitSlop={10} style={styles.monthBtn}>
              <T size={20} color={colors.walnut}>
                ‹
              </T>
            </Pressable>
            <View style={{ alignItems: 'center' }}>
              <T weight="bold" size={16}>
                {monthLabel}
              </T>
              {hijriLabel ? (
                <T size={12.5} color={colors.muted}>
                  {hijriLabel}
                </T>
              ) : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={tr('Next month')} onPress={() => shift(1)} hitSlop={10} style={styles.monthBtn}>
              <T size={20} color={colors.walnut}>
                ›
              </T>
            </Pressable>
          </View>
          <MonthGrid first={first} last={last} today={today} selected={selected} onSelect={setSelected} byDate={byDate} hijri={hijri} />
        </Card>

        {problem ? (
          <T size={13.5} color={colors.brickText}>
            {problem}
          </T>
        ) : null}

        <Card style={{ gap: 6 }}>
          <T weight="bold" size={16}>
            {parseISODate(selected).toLocaleDateString(locale(), { weekday: 'long', month: 'long', day: 'numeric' })}
          </T>
          {hSel ? (
            <T size={13} color={colors.muted}>{tr('{0} {1} {2} AH', [hSel.day, hSel.month, hSel.year])}</T>
          ) : null}
          {!events ? (
            <ActivityIndicator color={colors.walnut} style={{ marginVertical: 12 }} />
          ) : selectedItems.length === 0 ? (
            <T size={14} color={colors.muted} style={{ paddingVertical: 6 }}>
              {tr('Nothing planned.')}
            </T>
          ) : (
            selectedItems.map((it, i) => <ItemRow key={it.id} item={it} last={i === selectedItems.length - 1} onEdit={(e) => setEditing({ event: e, date: e.starts_on })} />)
          )}
          <Button label={tr('+ Add an event on this day')} variant="secondary" onPress={() => setEditing({ event: null, date: selected })} />
        </Card>

        {upcoming.length ? (
          <Card style={{ gap: 2 }}>
            <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4, marginBottom: 4 }}>
              {tr('COMING UP THIS MONTH')}
            </T>
            {upcoming.map((it, i) => (
              <ItemRow key={it.id} item={it} showDate last={i === upcoming.length - 1} onEdit={(e) => setEditing({ event: e, date: e.starts_on })} />
            ))}
          </Card>
        ) : null}

        <T size={12.5} color={colors.muted} style={{ textAlign: 'center', lineHeight: 18 }}>
          {tr('Islamic dates may differ by a day from your local moon sighting.')}
        </T>
      </ScrollView>

      {editing ? (
        <EventSheet
          event={editing.event}
          date={editing.date}
          members={members}
          onClose={() => setEditing(null)}
          onSaved={(date) => {
            setEditing(null);
            if (date) {
              setSelected(date);
              const d = parseISODate(date);
              setMonth({ year: d.getFullYear(), month: d.getMonth() + 1 });
            }
            load();
            scheduleEventAlerts().catch(() => {});
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function MonthGrid({
  first,
  last,
  today,
  selected,
  onSelect,
  byDate,
  hijri,
}: {
  first: Date;
  last: Date;
  today: string;
  selected: string;
  onSelect: (d: string) => void;
  byDate: Map<string, CalendarItem<FamilyEvent>[]>;
  hijri: Map<string, HijriLabel>;
}) {
  const { width } = useWindowDimensions();
  const cell = Math.floor((Math.min(width, 520) - 40 - 20) / 7);
  const cells: (Date | null)[] = [...Array(first.getDay()).fill(null)];
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(first.getFullYear(), first.getMonth(), d));
  while (cells.length % 7) cells.push(null);

  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((w, i) => (
          <T key={i} size={12} weight="bold" color={colors.muted} style={{ width: cell, textAlign: 'center' }}>
            {w}
          </T>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={{ width: cell, height: cell + 8 }} />;
          const key = iso(d);
          const dots = byDate.get(key) ?? [];
          const isSel = key === selected;
          const isToday = key === today;
          const h = hijri.get(key);
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`${d.toLocaleDateString(locale(), { weekday: 'long', month: 'long', day: 'numeric' })}${dots.length ? `, ${dots.length} event${dots.length === 1 ? '' : 's'}` : ''}`}
              accessibilityState={{ selected: isSel }}
              onPress={() => onSelect(key)}
              style={{ width: cell, height: cell + 8, alignItems: 'center', paddingTop: 2 }}
            >
              <View style={[styles.day, { width: cell - 6, height: cell - 6 }, isSel && styles.daySel, !isSel && isToday && styles.dayToday]}>
                <T size={15} weight={isSel || isToday ? 'bold' : 'semibold'} color={isSel ? colors.white : colors.espresso}>
                  {d.getDate()}
                </T>
                {h ? (
                  <T size={9.5} color={isSel ? colors.goldText : colors.muted}>
                    {h.day}
                  </T>
                ) : null}
              </View>
              <View style={styles.dots}>
                {dots.slice(0, 3).map((it) => (
                  <View key={it.id} style={[styles.dot, { backgroundColor: it.source === 'fasting' ? colors.sage : KIND_COLOR[it.kind] }]} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ItemRow({ item, showDate, last, onEdit }: { item: CalendarItem<FamilyEvent>; showDate?: boolean; last: boolean; onEdit: (e: FamilyEvent) => void }) {
  const time = item.startTime ? [formatTime(item.startTime), formatTime(item.endTime)].filter(Boolean).join(' – ') : null;
  const sub = [
    showDate ? parseISODate(item.date).toLocaleDateString(locale(), { weekday: 'short', month: 'short', day: 'numeric' }) : null,
    time,
    item.location,
    item.memberNames?.length ? item.memberNames.join(', ') : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const content = (
    <View style={[styles.item, !last && styles.itemLine]}>
      <View style={[styles.kindBar, { backgroundColor: item.source === 'fasting' ? colors.sage : KIND_COLOR[item.kind] }]} />
      <View style={{ flex: 1, gap: 2 }}>
        <T weight="semibold" size={15} numberOfLines={2}>
          {tr(item.title)}
        </T>
        {sub ? (
          <T size={12.5} color={colors.muted} numberOfLines={2}>
            {sub}
          </T>
        ) : null}
      </View>
      <Badge label={EVENT_KIND_LABELS[item.kind]} tone={item.kind === 'islamic' || item.kind === 'eid' ? 'amber' : item.kind === 'birthday' ? 'walnut' : 'sage'} />
    </View>
  );
  return item.event ? (
    <Pressable accessibilityRole="button" accessibilityHint={tr('Edit this event')} onPress={() => onEdit(item.event!)}>
      {content}
    </Pressable>
  ) : (
    content
  );
}

function Sheet({ onClose, title, children }: { onClose: () => void; title: string; children: ReactNode }) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={tr('Close')}>
          <Pressable style={styles.sheetWrap} onPress={() => {}}>
            <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled" bounces={false}>
              <T weight="extrabold" size={20}>
                {title}
              </T>
              {children}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function EventSheet({
  event,
  date,
  members,
  onClose,
  onSaved,
}: {
  event: FamilyEvent | null;
  date: string;
  members: CalendarMemberRow[];
  onClose: () => void;
  onSaved: (date?: string) => void;
}) {
  const [title, setTitle] = useState(event?.title ?? '');
  const [kind, setKind] = useState<CalendarEventKind>(event?.kind ?? 'gathering');
  const [day, setDay] = useState(event?.starts_on ?? date);
  const [allDay, setAllDay] = useState(!event?.start_time);
  const [start, setStart] = useState(event?.start_time?.slice(0, 5) ?? '');
  const [end, setEnd] = useState(event?.end_time?.slice(0, 5) ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [notes, setNotes] = useState(event?.notes ?? '');
  const [who, setWho] = useState<string[]>(event?.member_ids ?? []);
  const [repeat, setRepeat] = useState<'once' | 'weekly' | 'yearly'>(event?.repeats_weekly ? 'weekly' : event?.repeats_yearly ? 'yearly' : 'once');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const pickKind = (k: CalendarEventKind) => {
    setKind(k);
    if (!event && YEARLY_KINDS.includes(k)) setRepeat('yearly');
  };

  const save = async () => {
    if (!title.trim()) return setProblem(tr('Give the event a title.'));
    if (!isISODate(day)) return setProblem(tr('Use the date format YYYY-MM-DD, for example 2026-12-20.'));
    if (!allDay) {
      if (!isTime(start)) return setProblem(tr('Enter the start time as HH:MM, for example 18:30.'));
      if (end && !isTime(end)) return setProblem(tr('Enter the end time as HH:MM, or leave it empty.'));
      if (end && end <= start) return setProblem(tr('The end time must be after the start time.'));
    }
    setBusy(true);
    try {
      await saveEvent(
        {
          title: title.trim(),
          kind,
          starts_on: day,
          start_time: allDay ? null : start,
          end_time: allDay || !end ? null : end,
          location: location.trim() || null,
          notes: notes.trim() || null,
          member_ids: who,
          repeats_yearly: repeat === 'yearly',
          repeats_weekly: repeat === 'weekly',
        },
        event?.id,
      );
      onSaved(day);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : tr('Could not save the event.'));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!event) return;
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy(true);
    try {
      await deleteEvent(event.id);
      onSaved();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : tr('Could not delete the event.'));
      setBusy(false);
    }
  };

  return (
    <Sheet onClose={onClose} title={event ? tr('Edit event') : tr('New family event')}>
      <Field label={tr('Title')} value={title} onChangeText={(v) => { setTitle(v); setProblem(null); }} placeholder={tr('Eid lunch at grandma\'s')} />
      <View style={styles.wrap}>
        {EDITABLE_KINDS.map((k) => (
          <Chip key={k} label={EVENT_KIND_LABELS[k]} selected={kind === k} onPress={() => pickKind(k)} />
        ))}
      </View>
      <Field label={tr('Date (YYYY-MM-DD)')} value={day} onChangeText={(v) => { setDay(v); setProblem(null); }} keyboardType="numbers-and-punctuation" placeholder="2026-12-20" />
      <View style={styles.wrap}>
        <Chip label={tr('All day')} selected={allDay} onPress={() => setAllDay(true)} />
        <Chip label={tr('At a time')} selected={!allDay} onPress={() => setAllDay(false)} />
      </View>
      <View style={styles.wrap}>
        <Chip label={tr('Once')} selected={repeat === 'once'} onPress={() => setRepeat('once')} tone="sage" />
        <Chip label={tr('Every week')} selected={repeat === 'weekly'} onPress={() => setRepeat('weekly')} tone="sage" />
        <Chip label={tr('Every year')} selected={repeat === 'yearly'} onPress={() => setRepeat('yearly')} tone="sage" />
      </View>
      {!allDay ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label={tr('Starts (HH:MM)')} value={start} onChangeText={(v) => { setStart(v); setProblem(null); }} keyboardType="numbers-and-punctuation" placeholder="18:30" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label={tr('Ends (optional)')} value={end} onChangeText={(v) => { setEnd(v); setProblem(null); }} keyboardType="numbers-and-punctuation" placeholder="21:00" />
          </View>
        </View>
      ) : null}
      <Field label={tr('Place (optional)')} value={location} onChangeText={setLocation} placeholder={tr('Ottawa Main Mosque')} />
      {members.length ? (
        <View style={{ gap: 6 }}>
          <T size={13.5} weight="semibold" color={colors.muted}>
            {tr('Who is it for?')}
          </T>
          <View style={styles.wrap}>
            {members.map((m) => (
              <Chip
                key={m.id}
                label={m.first_name}
                selected={who.includes(m.id)}
                onPress={() => setWho((w) => (w.includes(m.id) ? w.filter((x) => x !== m.id) : [...w, m.id]))}
              />
            ))}
          </View>
        </View>
      ) : null}
      <Field label={tr('Notes (optional)')} value={notes} onChangeText={setNotes} placeholder={tr('Bring dessert')} multiline style={{ minHeight: 72, textAlignVertical: 'top', paddingTop: 12 }} />
      {problem ? (
        <T size={13.5} color={colors.brickText}>
          {problem}
        </T>
      ) : null}
      <Button label={event ? tr('Save changes') : tr('Add to the calendar')} onPress={save} busy={busy} />
      {event ? (
        <Button label={confirmDelete ? tr('Tap again to delete') : tr('Delete event')} variant="text" onPress={remove} />
      ) : (
        <Button label={tr('Cancel')} variant="text" onPress={onClose} />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 14 },
  add: { backgroundColor: colors.walnut, borderRadius: 14, paddingHorizontal: 14, height: 38, justifyContent: 'center' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  monthBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.linen, borderWidth: 1, borderColor: colors.line },
  day: { borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  daySel: { backgroundColor: colors.espresso },
  dayToday: { borderWidth: 1.5, borderColor: colors.gold },
  dots: { flexDirection: 'row', gap: 3, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  itemLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
  kindBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(59,42,36,0.35)', justifyContent: 'flex-end' },
  sheetWrap: { backgroundColor: colors.linen, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  sheet: { padding: 20, gap: 12, paddingBottom: 34 },
});
