import { TripDetailPage } from '@/features/travel/trip-detail-page';

export const metadata = { title: 'Trip' };

export default function TripPage({ params }: { params: { id: string } }) {
  return <TripDetailPage tripId={params.id} />;
}
