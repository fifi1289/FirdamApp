import { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/components/firdam-alert';
import { Chip } from '@/components/kitchen-ui';
import { PlacesMap, type MapPin } from '@/components/places-map';
import { HomeButton } from '@/components/screen';
import { Button, Card, T } from '@/components/ui';
import { callFunction } from '@/lib/functions';
import { getLang, locale, tr } from '@/lib/i18n';
import { placeFromDevice } from '@/lib/location';
import { timesFor, usePrayerSettings } from '@/lib/prayer';
import { supabase } from '@/lib/supabase';
import {
  CATEGORIES,
  MAP_FILTERS,
  PICNIC_KINDS,
  buildCamping,
  buildHome,
  buildOuting,
  buildTrip,
  buildVisit,
  categoryNote,
  comingWeekend,
  directionsLink,
  halalLabel,
  inSeason,
  kindLabel,
  loadNearby,
  loadRecipeIdeas,
  loadWeather,
  money,
  say,
  seasonOf,
  skyLabel,
  whoFromFamily,
  type Base,
  type Budget,
  type Category,
  type DayPrayers,
  type Nearby,
  type Program,
  type RecipeIdea,
  type RecipeNeed,
  type Spot,
  type Style,
  type Txt,
  type VisitTime,
  type Who,
} from '@/shared/weekend-core';
import { CAMPS, CITIES, cityNear, kmBetween } from '@/shared/weekend-library';
import { colors } from '@/theme';

let CUR: string | null = null;
const t = (x: Txt) => say(x, tr, (n) => money(n, CUR, locale()));
const CAR_KEY = 'firdam.weekend.car';
const ICON: Record<Category, string> = { home: '🏠', visit: '🤝', out: '📍', picnic: '🧺', travel: '🚆', camping: '⛺' };
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

function Choices<K extends string>({ value, options, onChange }: { value: K; options: { key: K; label: string }[]; onChange: (k: K) => void }) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => <Chip key={o.key} label={o.label} selected={value === o.key} onPress={() => onChange(o.key)} />)}
    </View>
  );
}
const Label = ({ children }: { children: string }) => <T weight="bold" size={14}>{children}</T>;

/** Weekend program: choose what to do, and get a day with every prayer on time — the same as on firdam.com. */
export default function Weekend() {
  const { settings, update } = usePrayerSettings();
  const place = settings?.place ?? null;
  const home = place ? { lat: place.latitude, lng: place.longitude } : null;
  const [category, setCategory] = useState<Category | null>(null);
  const [who, setWho] = useState<Who>('single');
  const [kids, setKids] = useState<number[]>([]);
  const [kidsText, setKidsText] = useState('');
  const [car, setCar] = useState(false);
  const [style, setStyle] = useState<Style>('simple');
  const [budget, setBudget] = useState<Budget>('low');
  const [day, setDay] = useState<'sat' | 'sun' | 'both'>('sat');
  const [when, setWhen] = useState<VisitTime>('afternoon');
  const [away, setAway] = useState('30');
  const [dest, setDest] = useState('');
  const [camp, setCamp] = useState('');
  const [near, setNear] = useState<Nearby | null>(null);
  const [filter, setFilter] = useState(MAP_FILTERS[0].id);
  const [picked, setPicked] = useState<Spot | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [program, setProgram] = useState<Program | null>(null);
  const [ideas, setIdeas] = useState<Partial<Record<RecipeNeed, RecipeIdea[]>>>({});
  const [done, setDone] = useState<Set<number>>(new Set());

  const weekend = useMemo(() => comingWeekend(), []);
  const dates = day === 'both' ? [weekend.sat, weekend.sun] : [day === 'sun' ? weekend.sun : weekend.sat];
  const season = home ? seasonOf(dates[0], home.lat) : null;
  const lang = getLang() as Base['lang'];

  useEffect(() => {
    AsyncStorage.getItem(CAR_KEY).then((v) => setCar(v === 'yes')).catch(() => {});
    supabase.from('family_members').select('birth_date, relationship').then(({ data }) => {
      const guess = whoFromFamily(data ?? []);
      setWho(guess.who);
      setKids(guess.kids);
      setKidsText(guess.kids.join(', '));
    });
  }, []);
  const saveCar = (v: boolean) => { setCar(v); AsyncStorage.setItem(CAR_KEY, v ? 'yes' : 'no').catch(() => {}); };

  useEffect(() => {
    if (!home || (category !== 'out' && category !== 'picnic' && category !== 'camping')) return;
    callFunction('weekend-places', undefined, { lat: home.lat, lng: home.lng }).catch(() => null);
    loadNearby(supabase, home).then(setNear).catch(() => setNear({ places: [], food: [], mosques: [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, home?.lat, home?.lng]);

  const shown = useMemo(() => {
    if (!near || !home || !season) return [] as Spot[];
    const kinds = category === 'picnic' ? PICNIC_KINDS : MAP_FILTERS.find((f) => f.id === filter)?.kinds ?? [];
    return near.places.filter((p) => kinds.includes(p.kind) && inSeason(p.kind, season)).sort((a, b) => kmBetween(home, a) - kmBetween(home, b)).slice(0, 60);
  }, [near, home, season, category, filter]);
  const destinations = useMemo(() => {
    if (!home) return [];
    const mine = cityNear(home);
    return CITIES.filter((c) => c.id !== mine?.id && kmBetween(home, c) > 30).sort((a, b) => kmBetween(home, a) - kmBetween(home, b));
  }, [home]);
  const camps = useMemo(() => (home ? CAMPS.filter((c) => kmBetween(home, c) < 200) : []), [home]);

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

  const make = async (spot?: Spot) => {
    if (!home || !category || !settings) return showAlert(tr('Choose where you live first.'));
    const city = category === 'travel' ? CITIES.find((c) => c.id === dest) : null;
    if (category === 'travel' && !city) return showAlert(tr('Choose a city'));
    setBusy(true);
    try {
      const at = city ? { lat: city.lat, lng: city.lng } : home;
      const multi = category === 'travel' || category === 'camping';
      const ds = multi && day === 'both' ? [weekend.sat, weekend.sun] : dates.slice(0, 1);
      const prayers: DayPrayers[] = ds.map((d) => {
        const x = timesFor(settings, { ...place!, latitude: at.lat, longitude: at.lng }, new Date(`${d}T12:00:00`)).times;
        return { fajr: hhmm(x.fajr), dhuhr: hhmm(x.dhuhr), asr: hhmm(x.asr), maghrib: hhmm(x.maghrib), isha: hhmm(x.isha) };
      });
      const [weather, nearby] = await Promise.all([loadWeather(at, ds), near && !city ? Promise.resolve(near) : loadNearby(supabase, at)]);
      const base: Base = { who, kids: who === 'family' ? kids : [], style, budget, car, home, dates: ds, prayers, weather, lang };
      const campPick = CAMPS.find((c) => c.id === camp);
      const p =
        category === 'home' ? buildHome(base)
        : category === 'visit' ? buildVisit(base, when, +away)
        : category === 'travel' ? buildTrip(base, city!, nearby)
        : category === 'camping' ? (campPick ? buildCamping(base, campPick, nearby) : null)
        : spot ? buildOuting(base, spot, nearby, category === 'picnic') : null;
      if (!p) return showAlert(tr('Pick a place first'));
      p.days.forEach((d, i) => { d.weather = weather[i] ?? null; });
      setProgram(p);
      setDone(new Set());
      const needs = Array.from(new Set(p.days.flatMap((d) => d.lines.map((l) => l.recipes)).filter((x): x is RecipeNeed => !!x)));
      const loaded = await Promise.all(needs.map(async (n) => [n, await loadRecipeIdeas(supabase, n, 4)] as const));
      setIdeas(Object.fromEntries(loaded));
      supabase.from('weekend_plans').insert({ options: { category, who, style, budget, car }, plan: p }).then(() => undefined);
    } catch {
      showAlert(tr('Could not make a program. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const addToCalendar = async (p: Program) => {
    const rows = p.days.map((d) => ({
      title: t(p.title),
      kind: 'other',
      starts_on: d.date,
      start_time: d.lines.find((l) => !l.prayer)?.time ?? null,
      location: d.lines.find((l) => l.place && !l.prayer)?.place?.name ?? null,
      notes: [...d.lines.map((l) => `${l.time ?? ''} ${t(l.title)}${l.place ? ` — ${l.place.name}` : ''}`), '', tr('Before you go:'), ...p.prepare.map((x) => `• ${t(x)}`)].join('\n'),
      reminders: ['1d'],
    }));
    const { error } = await supabase.from('family_events').insert(rows);
    if (error) return showAlert(tr('Could not add to your calendar'), error.message);
    showAlert(tr('Added to your family calendar, with a reminder the day before'));
  };

  // ── The program ─────────────────────────────────────────────────
  if (program) {
    const cur = program.currency;
    CUR = cur;
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable accessibilityRole="button" onPress={() => { setProgram(null); setPicked(null); }}>
            <T weight="bold" color={colors.walnut}>{tr('‹ Back')}</T>
          </Pressable>
          <T weight="extrabold" size={26} accessibilityRole="header">{t(program.title)}</T>
          <Button label={tr('Add to calendar')} variant="secondary" onPress={() => addToCalendar(program)} />
          {program.warnings.length > 0 && (
            <Card style={{ gap: 6, backgroundColor: '#FFF4DE' }}>
              {program.warnings.map((w, i) => <T key={i} size={14} color="#7A4B00">⚠ {t(w)}</T>)}
            </Card>
          )}
          {program.days.map((d, di) => (
            <Card key={d.date} style={{ gap: 12 }}>
              <T weight="bold" size={13} color={colors.walnut}>
                {new Date(`${d.date}T12:00:00`).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })}
                {program.ramadan && di === 0 ? ` · ${tr('Ramadan')}` : ''}
              </T>
              {d.weather ? <T size={13} color={colors.muted}>{tr('{0}, {1}–{2}°C, {3}% chance of rain', [tr(skyLabel(d.weather.code)), d.weather.min, d.weather.max, d.weather.rain])}</T> : null}
              {d.lines.map((l, i) => (
                <View key={i} style={[styles.step, l.prayer ? styles.prayer : null]}>
                  <T weight="bold" size={15} color={l.prayer ? colors.walnut : colors.espresso}>{l.time ? `${l.time}  ` : ''}{t(l.title)}</T>
                  {l.notes.map((n, j) => <T key={j} size={13.5} color={colors.muted}>{t(n)}</T>)}
                  {l.place ? <PlaceBox place={l.place} car={car} /> : null}
                  {l.recipes && (ideas[l.recipes]?.length ?? 0) > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 4 }}>
                      {ideas[l.recipes]!.map((r) => (
                        <Pressable key={r.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })} style={styles.recipe}>
                          <Image source={{ uri: r.image }} style={styles.recipeImg} />
                          <T size={12} weight="semibold" numberOfLines={2} style={{ padding: 6 }}>{tr(r.name)}</T>
                        </Pressable>
                      ))}
                    </ScrollView>
                  ) : null}
                </View>
              ))}
            </Card>
          ))}
          <Card style={{ gap: 10 }}>
            <T weight="bold" size={17}>{tr('Budget')}</T>
            {program.costs.length === 0 ? <T size={14} color={colors.muted}>{tr('Nothing to pay today.')}</T> : null}
            {program.costs.map((c, i) => (
              <View key={i} style={{ gap: 2 }}>
                <View style={styles.costRow}>
                  <T size={14} style={{ flex: 1 }}>{t(c.label)}</T>
                  <T size={14} weight={c.amount == null ? 'regular' : 'bold'} color={c.amount == null ? colors.muted : colors.espresso}>
                    {c.amount == null ? tr('Check the price') : c.amount === 0 ? tr('Free') : money(c.amount, cur, locale())}
                  </T>
                </View>
                {c.detail ? <T size={12} color={colors.muted}>{t(c.detail)}</T> : null}
              </View>
            ))}
            {program.costs.length > 0 ? (
              <View style={[styles.costRow, { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8 }]}>
                <T weight="bold" style={{ flex: 1 }}>{program.partial ? tr('At least') : tr('Total')}</T>
                <T weight="bold">{money(program.total, cur, locale())}</T>
              </View>
            ) : null}
          </Card>
          <Card style={{ gap: 10 }}>
            <T weight="bold" size={17}>{tr('Before you go')}</T>
            {program.prepare.map((x, i) => (
              <Pressable key={i} accessibilityRole="checkbox" accessibilityState={{ checked: done.has(i) }} style={styles.check}
                onPress={() => setDone((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })}>
                <View style={[styles.box, done.has(i) && styles.boxOn]}>{done.has(i) ? <T size={12} color={colors.linen}>✓</T> : null}</View>
                <T size={14} style={{ flex: 1, textDecorationLine: done.has(i) ? 'line-through' : 'none' }} color={done.has(i) ? colors.muted : colors.espresso}>{t(x)}</T>
              </Pressable>
            ))}
          </Card>
          {program.tips.length > 0 && (
            <Card style={{ gap: 6 }}>
              <T weight="bold" size={17}>{tr('Good to know')}</T>
              {program.tips.map((x, i) => <T key={i} size={14} color={colors.muted}>{t(x)}</T>)}
            </Card>
          )}
          {program.sources.length > 0 && (
            <View style={{ gap: 4 }}>
              <T size={12} weight="bold" color={colors.muted}>{tr('Where the prices come from')}</T>
              {program.sources.map((s) => (
                <Pressable key={s.url} accessibilityRole="link" onPress={() => Linking.openURL(s.url)}>
                  <T size={12} color={colors.muted}>{tr(s.name)} · {tr('checked {0}', [new Date(`${s.checked}T12:00:00`).toLocaleDateString(locale())])}</T>
                </Pressable>
              ))}
              <T size={12} color={colors.muted}>{tr('Prices can change: check them before you go.')}</T>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Choosing ────────────────────────────────────────────────────
  const note = category && home ? categoryNote(category, dates[0], home.lat, null) : null;
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={{ alignSelf: 'flex-start' }}><HomeButton /></View>
        <T weight="extrabold" size={30} style={{ letterSpacing: -0.6 }} accessibilityRole="header">{tr('Weekend program')}</T>
        <T color={colors.muted}>{tr('What would you like to do this weekend? Every program keeps all the prayers on time.')}</T>
        <Card style={{ gap: 10 }}>
          <Label>{tr('Where do you live?')}</Label>
          <T size={14} color={colors.muted}>{place?.label ?? tr('Not set yet')}</T>
          <Button label={place ? tr('Use my location') : tr('Set my location')} variant="secondary" onPress={locate} busy={locating} />
        </Card>
        {CATEGORIES.map((c) => {
          const why = home ? categoryNote(c.id, dates[0], home.lat, null) : null;
          return (
            <Pressable key={c.id} accessibilityRole="button" accessibilityState={{ selected: category === c.id }} onPress={() => { setCategory(c.id); setPicked(null); }}
              style={[styles.cat, category === c.id && styles.catOn]}>
              <T size={26}>{ICON[c.id]}</T>
              <View style={{ flex: 1, gap: 2 }}>
                <T weight="bold" size={16}>{tr(c.label)}</T>
                <T size={13} color={colors.muted}>{tr(c.hint)}</T>
                {why ? <T size={12} color="#9A5B00">{t(why)}</T> : null}
              </View>
            </Pressable>
          );
        })}

        {category ? (
          <Card style={{ gap: 12 }}>
            {note ? <T size={13} color="#9A5B00">⚠ {t(note)}</T> : null}
            <Label>{tr('Who is going?')}</Label>
            <Choices<Who> value={who} onChange={setWho} options={[{ key: 'single', label: tr('Just me') }, { key: 'couple', label: tr('A couple') }, { key: 'family', label: tr('Family with kids') }]} />
            {who === 'family' ? (
              <TextInput value={kidsText} placeholder={tr('Children’s ages, e.g. 4, 9')} placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation" style={styles.input}
                onChangeText={(v) => { setKidsText(v); setKids(v.split(/[,\s]+/).map(Number).filter((n) => Number.isFinite(n) && n >= 0 && n < 18)); }} />
            ) : null}
            <Label>{category === 'travel' || category === 'camping' ? tr('How long?') : tr('Which day?')}</Label>
            <Choices value={day} onChange={setDay} options={
              category === 'travel' || category === 'camping'
                ? [{ key: 'sat', label: tr('One day') }, { key: 'both', label: tr('Two days (one night)') }]
                : [{ key: 'sat', label: tr('Saturday') }, { key: 'sun', label: tr('Sunday') }]
            } />
            {category !== 'home' ? (
              <>
                <Label>{tr('How will you get around?')}</Label>
                <Choices value={car ? 'car' : 'bus'} onChange={(v) => saveCar(v === 'car')} options={[{ key: 'bus', label: tr('Bus, train or walking') }, { key: 'car', label: tr('Car') }]} />
              </>
            ) : null}
            {category !== 'home' && category !== 'visit' ? (
              <>
                <Label>{tr('What kind of day?')}</Label>
                <Choices<Style> value={style} onChange={setStyle} options={[{ key: 'simple', label: tr('Simple') }, { key: 'fancy', label: tr('Special') }]} />
                <Label>{tr('Budget')}</Label>
                <Choices<Budget> value={budget} onChange={setBudget} options={[{ key: 'low', label: tr('Low budget') }, { key: 'normal', label: tr('Normal') }]} />
              </>
            ) : null}
            {category === 'visit' ? (
              <>
                <Label>{tr('When is the visit?')}</Label>
                <Choices<VisitTime> value={when} onChange={setWhen} options={[{ key: 'lunch', label: tr('Lunch') }, { key: 'afternoon', label: tr('Afternoon') }, { key: 'evening', label: tr('Evening') }]} />
                <Label>{tr('How far do they live?')}</Label>
                <Choices value={away} onChange={setAway} options={[{ key: '15', label: tr('{0} min', [15]) }, { key: '30', label: tr('{0} min', [30]) }, { key: '60', label: tr('{0} min', [60]) }, { key: '120', label: tr('2 hours') }]} />
              </>
            ) : null}
            {category === 'travel' ? (
              <>
                <Label>{tr('Where to?')}</Label>
                <View style={styles.wrap}>
                  {destinations.map((c) => <Chip key={c.id} label={`${c.name[lang]} · ${tr('{0} km', [Math.round(kmBetween(home!, c))])}`} selected={dest === c.id} onPress={() => setDest(c.id)} />)}
                </View>
              </>
            ) : null}
            {category === 'camping' ? (
              <>
                <Label>{tr('Which campground?')}</Label>
                {camps.length ? (
                  <View style={styles.wrap}>{camps.map((c) => <Chip key={c.id} label={c.name[lang]} selected={camp === c.id} onPress={() => setCamp(c.id)} />)}</View>
                ) : (
                  <T size={14} color={colors.muted}>{tr('We have not checked campgrounds near you yet. We are adding cities one by one.')}</T>
                )}
              </>
            ) : null}

            {category === 'out' || category === 'picnic' ? (
              <>
                <Label>{category === 'picnic' ? tr('Pick a park') : tr('Pick a place')}</Label>
                {category === 'out' ? (
                  <View style={styles.wrap}>{MAP_FILTERS.map((f) => <Chip key={f.id} label={tr(f.label)} selected={filter === f.id} onPress={() => setFilter(f.id)} />)}</View>
                ) : null}
                {home ? (
                  <PlacesMap
                    center={{ latitude: home.lat, longitude: home.lng }}
                    radiusKm={25}
                    action={tr('Choose')}
                    pins={shown.map((s): MapPin => ({ key: s.key, name: s.name, latitude: s.lat, longitude: s.lng, color: s.indoor ? '#C49A6C' : '#5E8B6F', subtitle: `${tr(kindLabel(s.kind))} · ${tr('{0} km', [kmBetween(home, s).toFixed(1)])}` }))}
                    onSelect={(k) => setPicked(shown.find((s) => s.key === k) ?? null)}
                  />
                ) : null}
                {!near ? <T size={13} color={colors.muted}>{tr('Loading places…')}</T> : shown.length === 0 ? <T size={13} color={colors.muted}>{tr('We are still gathering places near you. Try again in a few minutes.')}</T> : null}
                {shown.slice(0, 20).map((s) => (
                  <Pressable key={s.key} accessibilityRole="button" onPress={() => setPicked(s)} style={[styles.item, picked?.key === s.key && styles.itemOn]}>
                    <T weight="semibold" size={14} style={{ flex: 1 }}>{s.name}</T>
                    <T size={12} color={colors.muted}>{tr('{0} km', [kmBetween(home!, s).toFixed(1)])}</T>
                  </Pressable>
                ))}
                <Button label={busy ? tr('Making your program…') : picked ? tr('Plan our day at {0}', [picked.name]) : tr('Pick a place first')} onPress={() => picked && make(picked)} busy={busy} disabled={!picked} />
              </>
            ) : (
              <Button label={busy ? tr('Making your program…') : tr('Make our program')} onPress={() => make()} busy={busy}
                disabled={!home || (category === 'travel' && !dest) || (category === 'camping' && !camp)} />
            )}
            <T size={12} color={colors.muted}>{tr('Prayer times come from your prayer settings. Prices are only shown when we have checked them.')}</T>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function PlaceBox({ place, car }: { place: Spot; car: boolean }) {
  const halal = halalLabel(place.halal);
  return (
    <View style={styles.place}>
      <T weight="bold" size={14}>{place.name}</T>
      <T size={12} color={colors.muted}>{tr(kindLabel(place.kind))}{halal ? ` · ${tr(halal)}` : ''}</T>
      {place.address ? <T size={12} color={colors.muted}>{place.address}</T> : null}
      <View style={[styles.wrap, { gap: 16 }]}>
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(directionsLink(place, car))}>
          <T size={13} weight="bold" color={colors.walnut}>{tr('Directions')}</T>
        </Pressable>
        {place.website ? (
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(place.website!)}>
            <T size={13} weight="bold" color={colors.walnut}>{tr('Website')}</T>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 14 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  catOn: { borderColor: colors.walnut, backgroundColor: colors.tint },
  step: { gap: 4, borderStartWidth: 2, borderStartColor: colors.tint, paddingStart: 12 },
  prayer: { borderStartColor: colors.walnut },
  place: { gap: 3, marginTop: 4, padding: 12, borderRadius: 14, backgroundColor: colors.tint },
  recipe: { width: 130, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  recipeImg: { width: 130, height: 80 },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { backgroundColor: colors.walnut, borderColor: colors.walnut },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.espresso, backgroundColor: colors.card },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  itemOn: { backgroundColor: colors.tint },
});
