'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface PlannerContextValue {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

function toLocalDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState(() =>
    toLocalDateInputValue(new Date())
  );

  const value = useMemo(
    () => ({ selectedDate, setSelectedDate }),
    [selectedDate]
  );

  return (
    <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>
  );
}

export function usePlannerDate(): PlannerContextValue {
  const ctx = useContext(PlannerContext);
  if (!ctx) {
    throw new Error('usePlannerDate must be used within a <PlannerProvider>.');
  }
  return ctx;
}

export function isToday(dateKey: string): boolean {
  return dateKey === toLocalDateInputValue(new Date());
}

export function formatDateLong(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
