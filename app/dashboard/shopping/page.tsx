import { ModulePlaceholderPage } from '@/features/modules/module-placeholder-page';

export const metadata = { title: 'Shopping' };

export default function ShoppingPage() {
  return (
    <ModulePlaceholderPage
      moduleId="shopping"
      icon="shopping-cart"
      title="Shopping"
      description="Build smart lists, compare prices, and never forget the essentials again."
      placeholderDescription="Smart lists and price tracking are coming soon. Check back later."
    />
  );
}
