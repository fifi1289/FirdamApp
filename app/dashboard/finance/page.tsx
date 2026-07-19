import { ModulePlaceholderPage } from '@/features/modules/module-placeholder-page';

export const metadata = { title: 'Finance' };

export default function FinancePage() {
  return (
    <ModulePlaceholderPage
      moduleId="finance"
      icon="wallet"
      title="Finance"
      description="Budget, track expenses, and visualize your financial goals with clean insights."
      placeholderDescription="Budgets, expense tracking, and goal insights are on the way. Check back soon."
    />
  );
}
