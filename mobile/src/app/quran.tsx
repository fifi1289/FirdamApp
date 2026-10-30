import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip, Segmented } from '@/components/kitchen-ui';
import { HomeButton } from '@/components/screen';
import { Button, Card, T } from '@/components/ui';
import {
  deleteSession,
  getFavourites,
  getGoal,
  getShowTransliteration,
  loadSessions,
  logReading,
  setFavourites,
  setGoal as storeGoal,
  setShowTransliteration,
  type ReadingSession,
} from '@/lib/quran';
import { DUAS, DUA_CATEGORIES, duaOfTheDay, filterDuas, type Dua, type DuaCategory } from '@/shared/duas';
import { GOAL_OPTIONS, loggedMessage, matchSurah, parsePages, readingStats } from '@/shared/quran-core';
import { QURAN_PAGES, SURAHS } from '@/shared/surahs';
import { colors, fonts } from '@/theme';
import { locale, tr, duaSource, isRTL } from '@/lib/i18n';

type Tab = 'duas' | 'reading';

/** Quran & Duas: everyday duas and a gentle Quran reading tracker, the same as on firdam.com. */
export default function Quran() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'reading' ? 'reading' : 'duas');
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={{ alignSelf: 'flex-start' }}>
          <HomeButton />
        </View>
        <T weight="extrabold" size={30} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
          {tr('Quran & Duas')}
        </T>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { key: 'duas', label: 'Daily duas' },
            { key: 'reading', label: 'Quran reading' },
          ]}
        />
        {tab === 'duas' ? <Duas /> : <Reading />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Duas ----------

function Duas() {
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [translit, setTranslit] = useState(true);
  const [category, setCategory] = useState<DuaCategory | 'all' | 'favourites'>('all');
  const [query, setQuery] = useState('');
  useEffect(() => {
    getFavourites().then((ids) => setFavs(new Set(ids)));
    getShowTransliteration().then(setTranslit);
  }, []);

  const toggleFav = (id: string) =>
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setFavourites(Array.from(next));
      return next;
    });
  const today = useMemo(() => duaOfTheDay(), []);
  const visible = useMemo(() => filterDuas(DUAS, category, query, favs), [category, query, favs]);

  return (
    <>
      <View style={{ gap: 6 }}>
        <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4 }}>
          {tr('DUA OF THE DAY')}
        </T>
        <DuaCard dua={today} translit={translit} favourite={favs.has(today.id)} onFavourite={() => toggleFav(today.id)} featured />
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={tr('Search duas: travel, sleep, rain…')}
        placeholderTextColor={colors.muted}
        style={styles.input}
        accessibilityLabel={tr('Search duas')}
        autoCorrect={false}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label={tr('All')} selected={category === 'all'} onPress={() => setCategory('all')} />
        <Chip label={tr('Favourites{0}', [favs.size ? ` (${favs.size})` : ''])} selected={category === 'favourites'} onPress={() => setCategory('favourites')} />
        {DUA_CATEGORIES.map((c) => (
          <Chip key={c} label={tr(c)} selected={category === c} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: translit }}
        onPress={() => {
          setTranslit(!translit);
          setShowTransliteration(!translit);
        }}
        style={styles.toggle}
      >
        <View style={[styles.switch, translit && styles.switchOn]}>
          <View style={[styles.knob, translit && styles.knobOn]} />
        </View>
        <T size={14} weight="semibold">
          {tr('Show transliteration')}
        </T>
      </Pressable>

      {visible.length === 0 ? (
        <T size={14} color={colors.muted}>
          {category === 'favourites' ? tr('Tap the heart on a dua to keep it here.') : tr('No dua matches that search.')}
        </T>
      ) : (
        visible.map((d) => <DuaCard key={d.id} dua={d} translit={translit} favourite={favs.has(d.id)} onFavourite={() => toggleFav(d.id)} />)
      )}
    </>
  );
}

function DuaCard({ dua, translit, favourite, onFavourite, featured }: { dua: Dua; translit: boolean; favourite: boolean; onFavourite: () => void; featured?: boolean }) {
  const share = () =>
    Share.share({ message: isRTL() ? `${tr(dua.title)}\n\n${dua.arabic}\n— ${duaSource(dua.source)}` : `${tr(dua.title)}\n\n${dua.arabic}\n\n${dua.transliteration}\n\n${dua.translation}\n— ${duaSource(dua.source)}` }).catch(() => {});
  return (
    <Card style={[{ gap: 10 }, featured && { borderColor: colors.gold }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <T weight="bold" size={15.5}>
            {tr(dua.title)}
          </T>
          <T size={12.5} color={colors.muted}>
            {dua.category}
            {dua.repeat ? ` · ${tr(dua.repeat)}` : ''}
          </T>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('Share this dua')} onPress={share} hitSlop={8} style={styles.iconBtn}>
          <T size={13} weight="bold" color={colors.walnut}>
            {tr('Share')}
          </T>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={favourite ? tr('Remove from favourites') : tr('Add to favourites')}
          onPress={onFavourite}
          hitSlop={8}
          style={styles.iconBtn}
        >
          <T size={18} color={favourite ? colors.brickText : colors.muted}>
            {favourite ? '♥' : '♡'}
          </T>
        </Pressable>
      </View>
      <T style={{ fontFamily: fonts.arabic, textAlign: 'right', writingDirection: 'rtl', lineHeight: featured ? 50 : 42 }} size={featured ? 26 : 22}>
        {dua.arabic}
      </T>
      {/* Arabic readers read the dua itself; the Latin spelling and English meaning are for everyone else. */}
      {translit && !isRTL() ? (
        <T size={14} color={colors.walnut} style={{ fontStyle: 'italic', lineHeight: 20 }}>
          {dua.transliteration}
        </T>
      ) : null}
      {!isRTL() ? (
        <T size={14.5} style={{ lineHeight: 21 }}>
          {dua.translation}
        </T>
      ) : null}
      <T size={12} color={colors.muted}>
        {duaSource(dua.source)}
      </T>
    </Card>
  );
}

// ---------- Quran reading ----------

function Reading() {
  const [sessions, setSessions] = useState<ReadingSession[] | null>(null);
  const [goal, setGoal] = useState(4);
  const [pages, setPages] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [surahQuery, setSurahQuery] = useState('');

  useEffect(() => {
    getGoal().then(setGoal);
    loadSessions()
      .then(setSessions)
      .catch((e) => {
        setSessions([]);
        setMessage({ text: e instanceof Error ? e.message : tr('Could not load your reading.'), ok: false });
      });
  }, []);

  const stats = useMemo(() => readingStats(sessions ?? []), [sessions]);
  const todayPct = Math.min(100, Math.round((stats.todayPages / goal) * 100));

  const log = async () => {
    const n = parsePages(pages);
    if (n == null) return setMessage({ text: tr('Enter how many pages you read (1–{0}).', [QURAN_PAGES]), ok: false });
    setBusy(true);
    try {
      const row = await logReading(n, note.trim() || null);
      setMessage({ text: loggedMessage(stats, n, goal), ok: true });
      setSessions((prev) => [row, ...(prev ?? [])]);
      setPages('');
      setNote('');
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : tr('Could not save.'), ok: false });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s: ReadingSession) => {
    if (confirm !== s.id) return setConfirm(s.id);
    setConfirm(null);
    setSessions((prev) => prev?.filter((x) => x.id !== s.id) ?? null);
    await deleteSession(s.id).catch(() => {
      setMessage({ text: tr('Could not delete that entry.'), ok: false });
      loadSessions().then(setSessions).catch(() => {});
    });
  };

  const surahs = SURAHS.filter((s) => matchSurah(s, surahQuery));

  return (
    <>
      <View style={styles.stats}>
        <Stat label={tr('Today')} value={`${stats.todayPages}/${goal}`} sub={tr('pages')} />
        <Stat label={tr('Streak')} value={String(stats.streak)} sub={stats.streak === 1 ? tr('day') : tr('days')} />
        <Stat label={tr('This month')} value={String(stats.monthPages)} sub={tr('pages')} />
        <Stat
          label={tr('Khatm')}
          value={`${Math.round((stats.intoKhatm / QURAN_PAGES) * 100)}%`}
          sub={stats.khatms > 0 ? tr('{0} completed', [stats.khatms]) : tr('{0} of {1} pages', [stats.intoKhatm, QURAN_PAGES])}
        />
      </View>

      <Card style={{ gap: 12 }}>
        <T weight="bold" size={16}>
          {tr('Log today’s reading')}
        </T>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${todayPct}%` }]} />
        </View>
        <T size={12.5} color={colors.muted}>
          {todayPct >= 100
            ? tr('Daily goal complete, alhamdulillah.')
            : tr('{0} page{1} to reach today’s goal. {2}', [goal - stats.todayPages, goal - stats.todayPages === 1 ? '' : 's', GOAL_OPTIONS.find((g) => g.pages === goal)?.hint ?? ''])}
        </T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={pages}
            onChangeText={(v) => {
              setPages(v);
              setMessage(null);
            }}
            placeholder={tr('Pages')}
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            style={[styles.input, { width: 90 }]}
            accessibilityLabel={tr('Pages read')}
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={tr('Where you stopped, e.g. Al-Kahf 45')}
            placeholderTextColor={colors.muted}
            maxLength={200}
            style={[styles.input, { flex: 1 }]}
            accessibilityLabel={tr('Where you stopped (optional)')}
          />
        </View>
        {message ? (
          <T size={13.5} color={message.ok ? colors.sageDark : colors.brickText}>
            {tr(message.text)}
          </T>
        ) : null}
        <Button label={tr('Log reading')} onPress={log} busy={busy} />
        <View style={{ gap: 6 }}>
          <T size={13} weight="semibold" color={colors.muted}>
            {tr('Daily goal')}
          </T>
          <View style={styles.wrap}>
            {GOAL_OPTIONS.map((g) => (
              <Chip
                key={g.pages}
                label={tr(g.label)}
                selected={goal === g.pages}
                onPress={() => {
                  setGoal(g.pages);
                  storeGoal(g.pages);
                }}
              />
            ))}
          </View>
        </View>
      </Card>

      <Card style={{ gap: 4 }}>
        <T size={12.5} weight="bold" color={colors.walnut} style={{ letterSpacing: 0.4, marginBottom: 4 }}>
          {tr('RECENT READING')}
        </T>
        {!sessions ? (
          <ActivityIndicator color={colors.walnut} />
        ) : sessions.length === 0 ? (
          <T size={14} color={colors.muted}>
            {tr('Nothing logged yet. Even one page a day adds up, start today.')}
          </T>
        ) : (
          sessions.slice(0, 8).map((s, i) => (
            <View key={s.id} style={[styles.row, i < Math.min(sessions.length, 8) - 1 && styles.rowLine]}>
              <T size={12.5} color={colors.muted} style={{ width: 56 }}>
                {new Date(`${s.read_on}T12:00:00`).toLocaleDateString(locale(), { month: 'short', day: 'numeric' })}
              </T>
              <T size={14.5} weight="semibold">{tr('{0} page{1}', [s.pages, s.pages === 1 ? '' : 's'])}</T>
              <T size={12.5} color={colors.muted} style={{ flex: 1 }} numberOfLines={1}>
                {s.note ?? ''}
              </T>
              <Pressable accessibilityRole="button" accessibilityLabel={tr('Delete entry')} onPress={() => remove(s)} hitSlop={8}>
                <T size={12.5} weight="bold" color={confirm === s.id ? colors.brickText : colors.muted}>
                  {confirm === s.id ? tr('Delete?') : '✕'}
                </T>
              </Pressable>
            </View>
          ))
        )}
      </Card>

      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T weight="bold" size={16}>
            {tr('Open a surah')}
          </T>
          <T size={12.5} color={colors.muted}>
            {tr('Opens on Quran.com')}
          </T>
        </View>
        <TextInput
          value={surahQuery}
          onChangeText={setSurahQuery}
          placeholder={tr('Search by name or number')}
          placeholderTextColor={colors.muted}
          style={styles.input}
          accessibilityLabel={tr('Search surahs')}
          autoCorrect={false}
        />
        {surahs.map((s, i) => (
          <Pressable
            key={s.number}
            accessibilityRole="link"
            onPress={() => Linking.openURL(`https://quran.com/${s.number}`)}
            style={[styles.row, i < surahs.length - 1 && styles.rowLine]}
          >
            <View style={styles.num}>
              <T size={12} weight="bold" color={colors.walnut}>
                {s.number}
              </T>
            </View>
            <T size={14.5} weight="semibold" style={{ flex: 1 }}>
              {s.name}
            </T>
            <T size={12} color={colors.muted}>{tr('{0} ayahs', [s.ayahs])}</T>
          </Pressable>
        ))}
      </Card>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.stat}>
      <T size={12} weight="bold" color={colors.muted} style={{ letterSpacing: 0.3 }}>
        {label.toUpperCase()}
      </T>
      <T size={20} weight="extrabold" numberOfLines={1}>
        {value}
      </T>
      {sub ? (
        <T size={11.5} color={colors.muted} numberOfLines={1}>
          {sub}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 14 },
  input: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 14, fontSize: 15, color: colors.espresso },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  switch: { width: 46, height: 28, borderRadius: 14, backgroundColor: colors.sand, padding: 3 },
  switchOn: { backgroundColor: colors.sage },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white },
  knobOn: { transform: [{ translateX: 18 }] },
  iconBtn: { minWidth: 36, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.tint, paddingHorizontal: 8 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 14, gap: 2 },
  bar: { height: 10, borderRadius: 5, backgroundColor: colors.tint, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5, backgroundColor: colors.sage },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
  num: { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
});
