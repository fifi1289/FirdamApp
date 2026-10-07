import { JoinHousehold } from '@/features/family/join-household';

export const metadata = { title: 'Join household' };

export default function JoinHouseholdPage({ params }: { params: { token: string } }) {
  return <JoinHousehold token={params.token} />;
}
