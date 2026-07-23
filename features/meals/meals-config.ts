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

export const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
  'Seafood-Free',
] as const;

export const PREDEFINED_ALLERGIES = [
  'Peanuts',
  'Tree Nuts',
  'Milk',
  'Eggs',
  'Wheat',
  'Soy',
  'Fish',
  'Shellfish',
  'Sesame',
  'Mustard',
  'Sulphites',
  'Gluten',
] as const;

export const DEFAULT_PREFERENCES = {
  planningDuration: 7,
  mealTypes: ['breakfast', 'lunch', 'dinner'] as string[],
  usePantryFirst: false,
  dietaryPreferences: [] as string[],
  allergies: [] as string[],
} as const;

export type MealPreferencesState = {
  planningDuration: number;
  mealTypes: string[];
  usePantryFirst: boolean;
  dietaryPreferences: string[];
  allergies: string[];
};

export function getMealTypeLabel(key: string): string {
  return MEAL_TYPES.find((m) => m.key === key)?.label ?? key;
}
