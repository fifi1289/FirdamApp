'use client';

import { useEffect, useState } from 'react';
import { Utensils } from 'lucide-react';

import { getCategoryImage } from '@/features/meals/meal-images';

interface MealImageProps {
  src: string;
  alt: string;
  category: string;
  className?: string;
}

export function MealImage({ src, alt, category, className }: MealImageProps) {
  const categoryFallback = getCategoryImage(category);
  const [currentSrc, setCurrentSrc] = useState(src || categoryFallback);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(src || categoryFallback);
    setFailed(false);
  }, [src, categoryFallback]);

  const handleError = () => {
    if (currentSrc !== categoryFallback) {
      setCurrentSrc(categoryFallback);
    } else {
      setFailed(true);
    }
  };

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className ?? ''}`}
      >
        <Utensils className="h-8 w-8 text-muted-foreground/40" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
}
