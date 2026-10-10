import { ComingNext, TabScreen } from '@/components/screen';

export default function Halal() {
  return (
    <TabScreen title="Halal near me">
      <ComingNext step={6} title="Halal food around you" text="Restaurants, butchers and groceries on a map, with halal status confirmed by families nearby." />
    </TabScreen>
  );
}
