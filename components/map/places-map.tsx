'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPinOff } from 'lucide-react';

import { cn } from '@/lib/utils';

/*
 * Lightweight Leaflet map. Leaflet is loaded from cdnjs at runtime so the app
 * needs no extra npm dependency; tiles come from CARTO (OpenStreetMap data).
 */

const LEAFLET_VERSION = '1.9.4';
const LEAFLET_JS = `https://cdnjs.cloudflare.com/ajax/libs/leaflet/${LEAFLET_VERSION}/leaflet.min.js`;
const LEAFLET_CSS = `https://cdnjs.cloudflare.com/ajax/libs/leaflet/${LEAFLET_VERSION}/leaflet.min.css`;

/* Minimal typings for the parts of Leaflet we use. */
interface LLatLng {
  lat: number;
  lng: number;
}
interface LLayer {
  addTo(map: LMap): LLayer;
  remove(): void;
}
interface LMarker extends LLayer {
  on(event: 'click', fn: () => void): LMarker;
  setZIndexOffset(z: number): LMarker;
}
interface LMap {
  setView(center: [number, number], zoom: number, opts?: { animate?: boolean }): LMap;
  flyTo(center: [number, number], zoom?: number, opts?: { duration?: number }): LMap;
  fitBounds(bounds: [number, number][], opts?: { padding?: [number, number]; maxZoom?: number }): LMap;
  getZoom(): number;
  invalidateSize(): void;
  remove(): void;
  on(event: string, fn: () => void): LMap;
  getCenter(): LLatLng;
}
interface LeafletStatic {
  map(el: HTMLElement, opts?: Record<string, unknown>): LMap;
  tileLayer(url: string, opts?: Record<string, unknown>): LLayer;
  marker(latlng: [number, number], opts?: Record<string, unknown>): LMarker;
  circle(latlng: [number, number], opts?: Record<string, unknown>): LLayer;
  divIcon(opts: Record<string, unknown>): unknown;
  control: { zoom(opts?: Record<string, unknown>): LLayer };
}

declare global {
  interface Window {
    L?: LeafletStatic;
  }
}

let leafletPromise: Promise<LeafletStatic> | null = null;

function loadLeaflet(): Promise<LeafletStatic> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise<LeafletStatic>((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => (window.L ? resolve(window.L) : reject(new Error('Leaflet failed')));
    script.onerror = () => {
      leafletPromise = null;
      reject(new Error('Could not load the map'));
    };
    document.body.appendChild(script);
  });
  return leafletPromise;
}

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  /** CSS class suffix for the pin colour, e.g. "grocery". */
  variant: string;
  /** Short text shown inside the pin (1–2 characters). */
  glyph?: string;
  title: string;
}

interface PlacesMapProps {
  center: { latitude: number; longitude: number } | null;
  markers: MapMarker[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  radiusKm?: number;
  className?: string;
}

export function PlacesMap({
  center,
  markers,
  selectedId,
  onSelect,
  radiusKm,
  className,
}: PlacesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const layersRef = useRef<LLayer[]>([]);
  const markerRefs = useRef<Map<string, LMarker>>(new Map());
  const onSelectRef = useRef(onSelect);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  onSelectRef.current = onSelect;

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, {
          zoomControl: false,
          attributionControl: true,
          scrollWheelZoom: true,
        });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd',
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }).addTo(map);
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        map.setView([center?.latitude ?? 21.4225, center?.longitude ?? 39.8262], center ? 13 : 3);
        mapRef.current = map;
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('error'));

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRefs.current.clear();
      layersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the map sized to its container.
  useEffect(() => {
    if (status !== 'ready' || !containerRef.current) return;
    const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [status]);

  // Draw markers, the user's position and the search radius.
  useEffect(() => {
    const L = typeof window !== 'undefined' ? window.L : undefined;
    const map = mapRef.current;
    if (status !== 'ready' || !L || !map) return;

    layersRef.current.forEach((l) => l.remove());
    layersRef.current = [];
    markerRefs.current.clear();

    if (center) {
      if (radiusKm) {
        layersRef.current.push(
          L.circle([center.latitude, center.longitude], {
            radius: radiusKm * 1000,
            color: '#855C49',
            weight: 1,
            opacity: 0.35,
            fillColor: '#C49A6C',
            fillOpacity: 0.06,
            interactive: false,
          }).addTo(map)
        );
      }
      layersRef.current.push(
        L.marker([center.latitude, center.longitude], {
          icon: L.divIcon({
            className: 'firdam-you',
            html: '<span class="firdam-you__dot"></span>',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
          interactive: false,
          keyboard: false,
        }).addTo(map)
      );
    }

    for (const m of markers) {
      const marker = L.marker([m.latitude, m.longitude], {
        title: m.title,
        alt: m.title,
        riseOnHover: true,
        icon: L.divIcon({
          className: 'firdam-pin-wrap',
          html: `<span class="firdam-pin firdam-pin--${m.variant}"><span>${m.glyph ?? ''}</span></span>`,
          iconSize: [30, 38],
          iconAnchor: [15, 36],
        }),
      });
      marker.on('click', () => onSelectRef.current?.(m.id));
      marker.addTo(map);
      markerRefs.current.set(m.id, marker);
      layersRef.current.push(marker);
    }

    if (center && markers.length > 0) {
      const pts: [number, number][] = markers
        .slice(0, 60)
        .map((m) => [m.latitude, m.longitude] as [number, number]);
      pts.push([center.latitude, center.longitude]);
      map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
    } else if (center) {
      map.setView([center.latitude, center.longitude], 13, { animate: false });
    }
  }, [status, markers, center, radiusKm]);

  // Highlight and pan to the selected place.
  useEffect(() => {
    const map = mapRef.current;
    if (status !== 'ready' || !map) return;
    markerRefs.current.forEach((marker, id) => {
      marker.setZIndexOffset(id === selectedId ? 1000 : 0);
      const el = (marker as unknown as { getElement?: () => HTMLElement | undefined }).getElement?.();
      el?.classList.toggle('firdam-pin-wrap--active', id === selectedId);
    });
    const sel = markers.find((m) => m.id === selectedId);
    if (sel) map.flyTo([sel.latitude, sel.longitude], Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [selectedId, status, markers]);

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-border bg-muted', className)}>
      <div ref={containerRef} className="absolute inset-0 z-0" aria-label="Map of halal places" />
      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading map…
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
          <MapPinOff className="h-6 w-6" />
          The map could not be loaded. The list still works.
        </div>
      )}
    </div>
  );
}
