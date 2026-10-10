import { ComingNext, TabScreen } from '@/components/screen';

export default function Kitchen() {
  return (
    <TabScreen title="Kitchen">
      <ComingNext step={4} title="Your week of meals" text="A halal plan built from your pantry, sized for adults and children, safe for every allergy in your home." />
      <ComingNext step={4} title="Shared shopping list" text="Everyone at home sees the same list. Missing ingredients are added for you." />
      <ComingNext step={5} title="Smart pantry" text="Scan a receipt, and Firdam keeps track of what you have and what to use first." />
    </TabScreen>
  );
}
