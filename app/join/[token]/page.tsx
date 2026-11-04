import { JoinHousehold } from '@/features/family/join-household';
import { JoinReferral } from '@/features/earn/join-referral';
import { isReferralCode } from '@/features/earn/referral-code';

export const metadata = { title: 'Join Firdam' };

/** /join/<uuid> is a household invite; /join/<short code> is a family's invite link. */
export default function JoinPage({ params }: { params: { token: string } }) {
  if (isReferralCode(params.token)) return <JoinReferral code={params.token.toLowerCase()} />;
  return <JoinHousehold token={params.token} />;
}
