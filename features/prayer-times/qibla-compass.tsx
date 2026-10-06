'use client';

import { useEffect, useRef, useState } from 'react';
import { Compass, Navigation2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { qiblaBearing } from '@/lib/geo/location';

type OrientationEventWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number };
type OrientationPermission = { requestPermission?: () => Promise<'granted' | 'denied'> };

function cardinal(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8] ?? 'N';
}

export function QiblaCompass({ latitude, longitude }: { latitude: number; longitude: number }) {
  const bearing = qiblaBearing(latitude, longitude);
  const [heading, setHeading] = useState<number | null>(null);
  const [live, setLive] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const gotReading = useRef(false);

  useEffect(() => {
    if (!live) return;
    const handler = (e: Event) => {
      const ev = e as OrientationEventWithCompass;
      if (typeof ev.webkitCompassHeading === 'number') {
        gotReading.current = true;
        setHeading(ev.webkitCompassHeading);
      } else if (ev.absolute && typeof ev.alpha === 'number') {
        gotReading.current = true;
        setHeading((360 - ev.alpha) % 360);
      }
    };
    const eventName =
      'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(eventName, handler, true);
    return () => window.removeEventListener(eventName, handler, true);
  }, [live]);

  const startLive = async () => {
    if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') {
      setUnsupported(true);
      return;
    }
    const ctor = DeviceOrientationEvent as unknown as OrientationPermission;
    if (typeof ctor.requestPermission === 'function') {
      try {
        const result = await ctor.requestPermission();
        if (result !== 'granted') {
          setUnsupported(true);
          return;
        }
      } catch {
        setUnsupported(true);
        return;
      }
    }
    setLive(true);
    // If no reading arrives the device has no compass (e.g. a laptop).
    setTimeout(() => {
      if (!gotReading.current) {
        setLive(false);
        setUnsupported(true);
      }
    }, 2500);
  };

  // With a live heading, rotate the dial so north points to real north.
  const dialRotation = heading !== null ? -heading : 0;
  const facingQibla = heading !== null && Math.abs(((bearing - heading + 540) % 360) - 180) < 5;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Qibla direction</p>
            <p className="text-xs text-muted-foreground">
              {Math.round(bearing)}° {cardinal(bearing)} from true north
            </p>
          </div>
          <Compass className="h-5 w-5 text-primary" />
        </div>

        <div className="relative mx-auto mt-5 aspect-square w-full max-w-[220px]">
          <div
            className="absolute inset-0 rounded-full border border-border bg-gradient-to-br from-secondary/60 to-card shadow-inner transition-transform duration-300 ease-out"
            style={{ transform: `rotate(${dialRotation}deg)` }}
          >
            {['N', 'E', 'S', 'W'].map((d, i) => (
              <span
                key={d}
                className="absolute left-1/2 top-1/2 text-[11px] font-semibold text-muted-foreground"
                style={{
                  transform: `rotate(${i * 90}deg) translateY(-92px) rotate(${-i * 90}deg) translate(-50%, -50%)`,
                }}
              >
                {d}
              </span>
            ))}
            {Array.from({ length: 72 }).map((_, i) => (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 block w-px origin-top bg-border"
                style={{
                  height: i % 18 === 0 ? 10 : 5,
                  transform: `rotate(${i * 5}deg) translateY(-104px)`,
                }}
              />
            ))}
            {/* Kaaba direction needle */}
            <div
              className="absolute left-1/2 top-1/2 h-[42%] w-0"
              style={{ transform: `translate(-50%, -100%) rotate(${bearing}deg)`, transformOrigin: 'bottom center' }}
            >
              <div className="absolute -top-1 left-1/2 flex -translate-x-1/2 flex-col items-center">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-espresso shadow-md ring-2 ring-brand-gold">
                  <span className="h-1.5 w-full bg-brand-gold" />
                </span>
                <span className="mt-0.5 h-[70px] w-1 rounded-full bg-gradient-to-b from-primary to-primary/0" />
              </div>
            </div>
          </div>
          <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-primary" />
          {heading !== null && (
            <Navigation2 className="absolute -top-3 left-1/2 h-5 w-5 -translate-x-1/2 fill-primary text-primary" />
          )}
        </div>

        <div className="mt-5 text-center">
          {facingQibla ? (
            <p className="text-sm font-semibold text-brand-sage">You are facing the Qibla</p>
          ) : heading !== null ? (
            <p className="text-xs text-muted-foreground">Turn until the Kaaba is at the top.</p>
          ) : unsupported ? (
            <p className="text-xs text-muted-foreground">
              No compass on this device. Face {Math.round(bearing)}° ({cardinal(bearing)}) using a
              map or phone compass.
            </p>
          ) : (
            <Button variant="outline" size="sm" onClick={startLive}>
              Use phone compass
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
