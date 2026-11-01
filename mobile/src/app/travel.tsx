import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/components/firdam-alert';
import { Badge, Chip, Segmented } from '@/components/kitchen-ui';
import { PartnerCard, useVisiblePartners } from '@/components/partner-shops';
import { HomeButton } from '@/components/screen';
import { TripSheet } from '@/components/trip-sheet';
import { Button, Card, T } from '@/components/ui';
import type { Trip } from '@/lib/db-types';
import { locale, tr } from '@/lib/i18n';
import { useKitchen } from '@/lib/kitchen-store';
import { usePartnerShops } from '@/lib/partners';
import { usePrayerSettings } from '@/lib/prayer';
import { distanceKm, loadTrips, nearbyAgencies, type NearbyAgency } from '@/lib/travel';
import { servicePartners } from '@/shared/partners';
import { HAJJ_DAYS, TRAVEL_TIPS, TRIP_KIND_LABELS, UMRAH_STEPS, daysUntil } from '@/shared/travel-data';
import { colors } from '@/theme';

type Tab = 'trips' | 'agencies' | 'guide';

/** The Free plan includes one planned trip (the same as on firdam.com). */
const FREE_TRIPS = 1;

/** Travel: trips with packing lists, travel agencies, and the Umrah & Hajj guide, the same as on firdam.com. */
export default function Travel() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'agencies' || params.tab === 'guide' ? params.tab : 'trips');
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const { paid } = useKitchen();

  const load = useCallback(() => {
    loadTrips()
      .then((t) => {
        setTrips(t);
        setProblem(null);
      })
      .catch((e) => {
        setTrips([]);
        setProblem(e instanceof Error ? e.message : tr('Could not load trips'));
      });
  }, []);
  useFocusEffect(load);

  const plan = () => {
    if (!paid && (trips?.length ?? 0) >= FREE_TRIPS) {
      showAlert(tr('One trip on the Free plan'), tr('The Free plan includes {0} {1}. Delete a past trip to plan a new one.', [FREE_TRIPS, tr('planned trips')]));
      return;
    }
    setPlanning(true);
  };

  const upcoming = (trips ?? []).filter((t) => !t.end_date || (daysUntil(t.end_date) ?? 0) >= 0);
  const past = (trips ?? []).filter((t) => t.end_date && (daysUntil(t.end_date) ?? 0) < 0);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={{ alignSelf: 'flex-start' }}>
          <HomeButton />
        </View>
        <T weight="extrabold" size={30} style={{ letterSpacing: -0.6 }} accessibilityRole="header">
          {tr('Travel')}
        </T>
        <T size={14.5} color={colors.muted} style={{ lineHeight: 21 }}>
          {tr('Plan halal-friendly trips, prepare for Umrah and Hajj, and find trusted travel agencies.')}
        </T>
        <Segmented<Tab>
          options={[
            { key: 'trips', label: 'My trips' },
            { key: 'agencies', label: 'Agencies' },
            { key: 'guide', label: 'Umrah & Hajj' },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'trips' ? (
          trips === null ? (
            <ActivityIndicator color={colors.walnut} style={{ marginTop: 24 }} />
          ) : (
            <>
              {problem ? (
                <T size={13.5} color={colors.brickText}>
                  {problem}
                </T>
              ) : null}
              {trips.length === 0 ? (
                <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 28 }}>
                  <T size={34}>✈️</T>
                  <T weight="bold" size={18}>
                    {tr('Where to next?')}
                  </T>
                  <T size={13.5} color={colors.muted} style={{ textAlign: 'center', lineHeight: 19 }}>
                    {tr('Plan a holiday, a family visit or your Umrah. We’ll get prayer times, the Qibla, halal food and a packing list ready for your destination.')}
                  </T>
                </Card>
              ) : (
                upcoming.map((t) => <TripCard key={t.id} trip={t} />)
              )}
              <Button label={tr('Plan a trip')} onPress={plan} />
              {past.length ? (
                <>
                  <T size={13} weight="bold" color={colors.muted} style={{ marginTop: 6 }}>
                    {tr('Past trips')}
                  </T>
                  {past.map((t) => (
                    <TripCard key={t.id} trip={t} />
                  ))}
                </>
              ) : null}
            </>
          )
        ) : tab === 'agencies' ? (
          <Agencies />
        ) : (
          <Guide />
        )}
      </ScrollView>
      {planning ? (
        <TripSheet
          onClose={() => setPlanning(false)}
          onSaved={(id) => {
            setPlanning(false);
            load();
            router.push({ pathname: '/trip/[id]', params: { id } });
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const d = daysUntil(trip.start_date);
  const done = trip.checklist.filter((c) => c.done).length;
  const total = trip.checklist.length;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={trip.name} onPress={() => router.push({ pathname: '/trip/[id]', params: { id: trip.id } })}>
      {({ pressed }) => (
        <View style={[styles.trip, pressed && { opacity: 0.85 }]}>
          <View style={styles.tripTop}>
            <T size={11.5} weight="bold" color={colors.gold} style={{ letterSpacing: 0.8 }}>
              {tr(TRIP_KIND_LABELS[trip.kind]).toUpperCase()}
            </T>
            <T weight="extrabold" size={19} color={colors.white}>
              {tr(trip.name)}
            </T>
            <T size={13} color={colors.goldText}>
              📍 {tr(trip.destination_label)}
            </T>
          </View>
          <View style={{ padding: 14, gap: 8 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {trip.start_date ? (
                <T size={13} color={colors.muted}>
                  📅 {new Date(`${trip.start_date}T00:00:00`).toLocaleDateString(locale(), { month: 'short', day: 'numeric', year: 'numeric' })}
                </T>
              ) : null}
              <T size={13} color={colors.muted}>
                👥 {trip.travellers}
              </T>
            </View>
            {d !== null ? (
              <T weight="bold" size={14.5}>
                {d > 1 ? tr('{0} days to go', [d]) : d === 1 ? tr('Tomorrow!') : d === 0 ? tr('Today — safe travels!') : tr('Completed')}
              </T>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T size={12} color={colors.muted}>
                {tr('Packing')}
              </T>
              <T size={12} color={colors.muted}>
                {done}/{total}
              </T>
            </View>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${total ? Math.round((done / total) * 100) : 0}%` }]} />
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}

function Agencies() {
  const shops = useVisiblePartners(usePartnerShops());
  const listed = servicePartners(shops, 'travel');
  const { settings } = usePrayerSettings();
  const place = settings?.place ?? null;
  const [radius, setRadius] = useState(10);
  const [agencies, setAgencies] = useState<NearbyAgency[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!place) return;
    let alive = true;
    setAgencies(null);
    setProblem(null);
    nearbyAgencies(place.latitude, place.longitude, radius)
      .then((a) => {
        if (!alive) return;
        setAgencies(
          a
            .map((x) => ({ ...x, d: distanceKm(place, x) }))
            .sort((x, y) => Number(y.muslimFocused) - Number(x.muslimFocused) || x.d - y.d)
        );
      })
      .catch((e) => alive && setProblem(e instanceof Error ? e.message : tr('Could not load agencies')));
    return () => {
      alive = false;
    };
  }, [place?.latitude, place?.longitude, radius]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <T weight="bold" size={17}>
        {tr('Firdam-listed travel businesses')}
      </T>
      <T size={13.5} color={colors.muted} style={{ lineHeight: 19 }}>
        {tr('Hajj & Umrah operators, travel agencies and halal-friendly stays reviewed by the Firdam team.')}
      </T>
      {listed.length ? (
        listed.map((s) => <PartnerCard key={s.id} shop={s} />)
      ) : (
        <Card style={{ gap: 6 }}>
          <T size={13.5} color={colors.muted} style={{ lineHeight: 19 }}>
            {tr('We’re onboarding trusted Hajj & Umrah operators and travel agencies. Run one? List it for free.')}
          </T>
          <T size={13.5} weight="bold" color={colors.walnut} accessibilityRole="link" onPress={() => Linking.openURL('https://firdam.com/partners')}>
            {tr('Become a Firdam partner ↗')}
          </T>
        </Card>
      )}

      <T weight="bold" size={17} style={{ marginTop: 8 }}>
        {tr('Travel agencies near you')}
      </T>
      {!place ? (
        <Card style={{ gap: 8 }}>
          <T size={13.5} color={colors.muted}>
            {tr('Set your location to see travel agencies near you.')}
          </T>
          <Button label={tr('Set my location')} variant="secondary" onPress={() => router.push('/prayer-settings')} />
        </Card>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {[5, 10, 25].map((r) => (
              <Chip key={r} label={tr('Within {0} km', [r])} selected={radius === r} onPress={() => setRadius(r)} />
            ))}
          </View>
          {problem ? (
            <T size={13.5} color={colors.muted}>
              {tr('Travel agency data is temporarily unavailable (')}
              {problem})
            </T>
          ) : agencies === null ? (
            <ActivityIndicator color={colors.walnut} />
          ) : agencies.length === 0 ? (
            <T size={13.5} color={colors.muted}>
              {tr('No travel agencies found nearby. Try a wider radius.')}
            </T>
          ) : (
            agencies.map((a) => (
              <Card key={a.key} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <T weight="bold" size={15} style={{ flex: 1 }}>
                    {a.name}
                  </T>
                  <T size={12.5} color={colors.muted}>
                    {distanceKm(place, a) < 1 ? `${Math.round(distanceKm(place, a) * 1000)} m` : `${distanceKm(place, a).toFixed(1)} km`}
                  </T>
                </View>
                {a.muslimFocused ? <Badge label={tr('Hajj, Umrah or Muslim travel')} tone="sage" /> : null}
                {a.address ? (
                  <T size={12.5} color={colors.muted}>
                    {a.address}
                  </T>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
                  {a.phone ? (
                    <T size={13} weight="bold" color={colors.walnut} onPress={() => Linking.openURL(`tel:${a.phone}`)}>
                      {tr('Call')}
                    </T>
                  ) : null}
                  {a.website ? (
                    <T size={13} weight="bold" color={colors.walnut} onPress={() => Linking.openURL(/^https?:/.test(a.website!) ? a.website! : `https://${a.website}`)}>
                      {tr('Website')} ↗
                    </T>
                  ) : null}
                  <T
                    size={13}
                    weight="bold"
                    color={colors.walnut}
                    onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${a.latitude},${a.longitude}`)}
                  >
                    {tr('Directions')} ↗
                  </T>
                </View>
              </Card>
            ))
          )}
          <T size={12} color={colors.muted} style={{ lineHeight: 17 }}>
            {tr('From OpenStreetMap. These agencies are not verified by Firdam — always check licences (e.g. TICO in Ontario, ATOL in the UK) and reviews before booking.')}
          </T>
        </>
      )}
    </>
  );
}

function Guide() {
  return (
    <>
      <Card style={{ gap: 12 }}>
        <T weight="bold" size={17}>
          {tr('The steps of Umrah')}
        </T>
        {UMRAH_STEPS.map((s, i) => (
          <View key={s.title} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={styles.stepNo}>
              <T size={13} weight="bold" color={colors.walnut}>
                {i + 1}
              </T>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T weight="bold" size={14.5}>
                {tr(s.title)}
              </T>
              <T size={13.5} color={colors.muted} style={{ lineHeight: 19 }}>
                {tr(s.detail)}
              </T>
            </View>
          </View>
        ))}
      </Card>
      <Card style={{ gap: 10 }}>
        <T weight="bold" size={17}>
          {tr('The days of Hajj')}
        </T>
        {HAJJ_DAYS.map((d) => (
          <View key={d.day} style={styles.hajjDay}>
            <T size={12} weight="bold" color={colors.sage}>
              {tr(d.day)}
            </T>
            <T weight="bold" size={14.5}>
              {tr(d.title)}
            </T>
            <T size={13.5} color={colors.muted} style={{ lineHeight: 19 }}>
              {tr(d.detail)}
            </T>
          </View>
        ))}
      </Card>
      <Card style={{ gap: 10 }}>
        <T weight="bold" size={17}>
          {tr('Travel tips for Muslims')}
        </T>
        {TRAVEL_TIPS.map((t) => (
          <T key={t} size={13.5} color={colors.muted} style={{ lineHeight: 19 }}>
            ✈️ {tr(t)}
          </T>
        ))}
      </Card>
      <T size={12} color={colors.muted} style={{ lineHeight: 17 }}>
        {tr('A brief overview to help you prepare. Learn the rulings in detail from a qualified scholar or your Hajj/Umrah group before you travel.')}
      </T>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.linen },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 14 },
  trip: { borderRadius: 20, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  tripTop: { backgroundColor: colors.espresso, padding: 16, gap: 4 },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.tint, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: colors.sage },
  stepNo: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  hajjDay: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12, gap: 2 },
});
