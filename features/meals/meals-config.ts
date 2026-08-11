export const DURATION_OPTIONS = [
  { value: 3, label: '3 Days' },
  { value: 5, label: '5 Days' },
  { value: 7, label: '7 Days' },
] as const;

export const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
] as const;


export type CuisinePreferences = Record<string, string[]>;

export const DEFAULT_PREFERENCES = {
  planningDuration: 7,
  mealTypes: ['breakfast', 'lunch', 'dinner'] as string[],
  usePantryFirst: false,
  dietaryPreferences: [] as string[],
  allergies: [] as string[],
  cuisinePreferences: {} as CuisinePreferences,
} as const;

export type MealPreferencesState = {
  planningDuration: number;
  mealTypes: string[];
  usePantryFirst: boolean;
  dietaryPreferences: string[];
  allergies: string[];
  cuisinePreferences: CuisinePreferences;
};

export function getMealTypeLabel(key: string): string {
  return MEAL_TYPES.find((m) => m.key === key)?.label ?? key;
}
