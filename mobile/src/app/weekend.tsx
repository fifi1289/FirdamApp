import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/components/firdam-alert';
import { Chip } from '@/components/kitchen-ui';
import { HomeButton } from '@/components/screen';
import { Button, Card, T } from '@/components/ui';
import { callFunction } from '@/lib/functions';
import { getLang, locale, tr } from '@/lib/i18n';
import { placeFromDevice } from '@/lib/location';
import { usePrayerSettings } from '@/lib/prayer';
import { supabase } from '@/lib/supabase';
import {
  directionsLink,
  feeLabel,
  halalLabel,
  kindLabel,
  skyLabel,
  whoFromFamily,
  type Budget,
  type Style,
  type WeekendDay,
  type WeekendDayKey,
  type WeekendPlan,
  type Who,
} from '@/shared/weekend-core';
import { colors } from '@/theme';

type When = 'sat' | 'sun' | 'both';

const dayName = (d: WeekendDay) =>
  new Date(`${d.date}T12:00:00`).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });

function Choices<K extends string>({ value, options, onChange }: { value: K; options: { key: K; label: string }[]; onChange: (k: K) => void }) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => (
        <Chip key={o.key} label={o.label} selected={value === o.key} onPress={() => onChange(o.key)} />
      ))}
    </View>
  );
}

/** Weekend: a program near home from real places, the same as on firdam.com. */
export default function Weekend() {
  const { settings, update } = usePrayerSettings();
  const place = settings?.place ?? null;
  const [who, setWho] = useState<Who>('single');
  const [kids, setKids] = useState<number[]>([]);
  const [style, setStyle] = useState<Style>('simple');
  const [budget, setBudget] = useState<Budget>('low');
  const [when, setWhen] = useState<When>('sat');
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [plan, setPlan] = useState<WeekendPlan | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [past, setPast] = useState<{ id: string; created_at: string; plan: WeekendPlan }[]>([]);

  useEffect(() => {
    supabase
      .from('family_members')
      .select('birth_date, relationship')
      .then(({ data }) => {
        const guess = whoFromFamily(data ?? []);
        setWho(guess.who);
        setKids(guess.kids);
      });
    supabase
      .from('weekend_plans')
      .select('id, created_at, plan')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setPast((data ?? []) as { id: string; created_at: string; plan: WeekendPlan }[]));
  }, []);

  const locate = async () => {
    setLocating(true);
    try {
      const p = await placeFromDevice();
      if (p === 'denied') showAlert(tr('Location is off'), tr('Allow location for Firdam in Settings, or set your city in Prayer settings.'));
      else await update({ place: p });
    } finally {
      setLocating(false);
    }
  };

  const make = async () => {
    if (!place) return showAlert(tr('Choose where you live first.'));
    setBusy(true);
    try {
      const res = await callFunction<{ id: string | null; plan: WeekendPlan }>('weekend-plan', undefined, {
        lat: place.latitude,
        lng: place.longitude,
        place: place.label,
        who,
        kids: who === 'family' ? kids : [],
        style,
        budget,
        days: (when === 'both' ? ['sat', 'sun'] : [when]) as WeekendDayKey[],
        lang: getLang(),
      });
      setPlan(res.plan);
      setDone(new Set());
      if (res.id) setPast((p) => [{ id: res.id!, created_at: new Date().toISOString(), plan: res.plan }, ...p].slice(0, 5));
    } catch (e) {
      showAlert(tr('Could not make a program'), e instanceof Error ? tr(e.message) : undefined);
    } finally {
      setBusy(false);
    }
  };

  const addToCalendar = async (p: WeekendPlan) => {
    const rows = p.days.map((d) => ({
      title: d.theme || p.title || tr('Weekend outing'),
      kind: 'other',
      starts_on: d.date,
      start_time: d.steps.find((s) => s.time)?.time ?? null,
      location: d.steps.find((s) => s.place)?.place?.name ?? null,
      notes: [
        ...d.steps.map((s) => `${s.time ? `${s.time} ` : ''}${s.title}${s.place ? ` — ${s.place.name}` : ''}`),
        '',
        tr('Before you go:'),
        ...p.prepare.map((x) => `• ${x}`),
      ].join('\n'),
      // A reminder the day before, to prepare.
      reminders: ['1d'],
    }));
    const { error } = await supabase.from('family_events').insert(rows);
    if (error) return showAlert(tr('Could not add to your calendar'), error.message);
    showAlert(tr('Added to your family calendar, with a reminder the day before'));
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ alignSelf: 'flex-start' }}>
          <HomeButton />
        </View>
        <T weight="extrabold" size={30} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
          {tr('Weekend')}
        </T>
        <T size={14.5} color={colors.muted} style={{ lineHeight: 21 }}>
          {tr('A weekend program near home, made from real places: what to do, where to eat halal, where to pray, and what to prepare.')}
        </T>

        <Card style={{ gap: 14 }}>
          <View style={{ gap: 6 }}>
            <T weight="semibold" size={14}>
              {tr('Where do you live?')}
            </T>
            <View style={styles.row}>
              <T size={14.5} style={{ flex: 1 }}>
                {place ? place.label : tr('Not set yet')}
              </T>
              <Button label={place ? tr('Use my location') : tr('Set my location')} variant="secondary" onPress={locate} busy={locating} />
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <T weight="semibold" size={14}>
              {tr('Who is going?')}
            </T>
            <Choices<Who>
              value={who}
              onChange={setWho}
              options={[
                { key: 'single', label: tr('Just me') },
                { key: 'couple', label: tr('A couple') },
                { key: 'family', label: tr('Family with kids') },
              ]}
            />
            {who === 'family' && kids.length ? (
              <T size={12.5} color={colors.muted}>
                {tr('Kids aged {0} (from your family)', [kids.join(tr(', '))])}
              </T>
            ) : null}
          </View>
          <View style={{ gap: 6 }}>
            <T weight="semibold" size={14}>
              {tr('What kind of day?')}
            </T>
            <Choices<Style>
              value={style}
              onChange={setStyle}
              options={[
                { key: 'simple', label: tr('Simple') },
                { key: 'fancy', label: tr('Special') },
              ]}
            />
          </View>
          <View style={{ gap: 6 }}>
            <T weight="semibold" size={14}>
              {tr('Budget')}
            </T>
            <Choices<Budget>
              value={budget}
              onChange={setBudget}
              options={[
                { key: 'low', label: tr('Low budget') },
                { key: 'normal', label: tr('Normal') },
              ]}
            />
          </View>
          <View style={{ gap: 6 }}>
            <T weight="semibold" size={14}>
              {tr('When?')}
            </T>
            <Choices<When>
              value={when}
              onChange={setWhen}
              options={[
                { key: 'sat', label: tr('Saturday') },
                { key: 'sun', label: tr('Sunday') },
                { key: 'both', label: tr('Both days') },
              ]}
            />
          </View>
          <Button label={busy ? tr('Making your program…') : tr('Make our weekend program')} onPress={make} busy={busy} disabled={!place} />
          <T size={12} color={colors.muted}>
            {tr('Every place comes from the map near you. Check opening hours and prices before you go.')}
          </T>
        </Card>

        {plan ? (
          <>
            <T weight="bold" size={20}>
              {plan.title}
            </T>
            <Button label={tr('Add to calendar')} variant="secondary" onPress={() => addToCalendar(plan)} />
            {plan.days.map((d) => (
              <Card key={d.day} style={{ gap: 12 }}>
                <View style={{ gap: 2 }}>
                  <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.3 }}>
                    {dayName(d).toUpperCase()}
                  </T>
                  <T weight="bold" size={17}>
                    {d.theme}
                  </T>
                  {d.weather ? (
                    <T size={13} color={colors.muted}>
                      {tr('{0}, {1}–{2}°C, {3}% chance of rain', [tr(skyLabel(d.weather.code)), d.weather.min, d.weather.max, d.weather.rain])}
                    </T>
                  ) : null}
                </View>
                {d.steps.map((s, i) => (
                  <View key={i} style={styles.step}>
                    <T size={14.5} weight="semibold">
                      {s.time ? (
                        <T size={14.5} weight="bold" color={colors.walnut}>
                          {`${s.time}  `}
                        </T>
                      ) : null}
                      {s.title}
                    </T>
                    {s.note ? (
                      <T size={13.5} color={colors.muted} style={{ lineHeight: 19 }}>
                        {s.note}
                      </T>
                    ) : null}
                    {s.place ? (
                      <View style={styles.place}>
                        <T size={14} weight="semibold">
                          {s.place.name}
                        </T>
                        <T size={12.5} color={colors.muted}>
                          {[
                            tr(kindLabel(s.place.kind)),
                            tr('{0} km from home', [s.place.km]),
                            feeLabel(s.place.fee) ? tr(feeLabel(s.place.fee)!) : '',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </T>
                        {halalLabel(s.place.halal) ? (
                          <T size={12.5} weight="semibold" color={s.place.halal === 'likely' ? colors.amberText : colors.sageDark}>
                            {tr(halalLabel(s.place.halal)!)}
                          </T>
                        ) : null}
                        {s.place.hours ? (
                          <T size={12.5} color={colors.muted}>
                            {tr('Hours: {0}', [s.place.hours])}
                          </T>
                        ) : null}
                        {s.place.address ? (
                          <T size={12.5} color={colors.muted}>
                            {s.place.address}
                          </T>
                        ) : null}
                        <View style={[styles.row, { gap: 16 }]}>
                          <Pressable accessibilityRole="link" hitSlop={6} onPress={() => Linking.openURL(directionsLink(s.place!))}>
                            <T size={13.5} weight="bold" color={colors.walnut}>
                              {tr('Directions ›')}
                            </T>
                          </Pressable>
                          {s.place.website ? (
                            <Pressable accessibilityRole="link" hitSlop={6} onPress={() => Linking.openURL(s.place!.website!)}>
                              <T size={13.5} weight="bold" color={colors.walnut}>
                                {tr('Website ›')}
                              </T>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    ) : null}
                  </View>
                ))}
              </Card>
            ))}
            {plan.prepare.length ? (
              <Card style={{ gap: 10 }}>
                <T weight="bold" size={16}>
                  {tr('Before you go')}
                </T>
                {plan.prepare.map((x, i) => (
                  <Pressable
                    key={i}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: done.has(i) }}
                    onPress={() => setDone((s) => (s.has(i) ? new Set([...s].filter((n) => n !== i)) : new Set([...s, i])))}
                    style={styles.check}
                  >
                    <View style={[styles.box, done.has(i) && styles.boxOn]}>{done.has(i) ? <T size={12} color={colors.linen}>✓</T> : null}</View>
                    <T size={14} color={done.has(i) ? colors.muted : undefined} style={[{ flex: 1 }, done.has(i) && { textDecorationLine: 'line-through' }]}>
                      {x}
                    </T>
                  </Pressable>
                ))}
                {plan.money ? (
                  <T size={13} color={colors.muted} style={{ lineHeight: 18 }}>
                    {plan.money}
                  </T>
                ) : null}
              </Card>
            ) : null}
            <T size={11.5} color={colors.muted}>
              {plan.attribution}
            </T>
          </>
        ) : past.length ? (
          <View style={{ gap: 8 }}>
            <T weight="semibold" size={14}>
              {tr('Your recent programs')}
            </T>
            {past.map((p) => (
              <Pressable key={p.id} accessibilityRole="button" onPress={() => setPlan(p.plan)} style={styles.past}>
                <T size={14} weight="semibold" style={{ flex: 1 }}>
                  {p.plan.title || tr('Weekend outing')}
                </T>
                <T size={12} color={colors.muted}>
                  {new Date(p.created_at).toLocaleDateString(locale())}
                </T>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 14 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  step: { gap: 4, borderStartWidth: 2, borderStartColor: colors.tint, paddingStart: 12 },
  place: { gap: 3, marginTop: 4, padding: 12, borderRadius: 14, backgroundColor: colors.tint },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { backgroundColor: colors.walnut, borderColor: colors.walnut },
  past: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
});
