import { ComingNext, TabScreen } from '@/components/screen';

export default function Prayer() {
  return (
    <TabScreen title="Prayer">
      <ComingNext step={3} title="Prayer times and adhan alerts" text="Accurate times for where you are, with an adhan alert for each prayer that works even offline." />
      <ComingNext step={3} title="Qibla" text="A compass that points to the Kaaba from wherever you stand." />
    </TabScreen>
  );
}
