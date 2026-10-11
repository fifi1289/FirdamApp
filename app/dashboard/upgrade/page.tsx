import { redirect } from 'next/navigation';

import { UpgradePage } from '@/features/plan/upgrade-page';
import { FREE_LAUNCH } from '@/lib/plan/launch';

export const metadata = { title: 'Plans' };

export default function Page() {
  if (FREE_LAUNCH) redirect('/dashboard');
  return <UpgradePage />;
}
