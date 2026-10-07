import type { HalalPlaceCategory } from '@/types/database';
import type { HalalStatus } from '@/features/halal-places/halal-places-config';

/** A place from either OpenStreetMap or the Firdam community, in one shape. */
export interface HalalPlace {
  key: string;
  source: 'osm' | 'community';
  name: string;
  category: HalalPlaceCategory;
  latitude: number;
  longitude: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  openingHours: string | null;
  halalStatus: HalalStatus;
  certification: string | null;
  cuisine: string | null;
  notes?: string | null;
  /** Community places only: who added it. */
  ownerId?: string;
  /** Filled in client-side. */
  distanceKm?: number;
}

export interface PlaceRating {
  avgRating: number;
  reviewCount: number;
  confirmations: number;
  disputes: number;
}
