/**
 * Row shapes for the tables the app reads, matching types/database.ts on the
 * website. Kept small on purpose: only what the app uses.
 */
export type PantryCategory =
  | 'Fruits'
  | 'Vegetables'
  | 'Meat'
  | 'Poultry'
  | 'Seafood'
  | 'Dairy'
  | 'Eggs'
  | 'Grains'
  | 'Pasta & Rice'
  | 'Canned Foods'
  | 'Frozen Foods'
  | 'Bakery'
  | 'Snacks'
  | 'Beverages'
  | 'Spices'
  | 'Oils & Condiments'
  | 'Other';

export type PantryUnit = 'Pieces' | 'g' | 'kg' | 'ml' | 'L' | 'Pack' | 'Bottle' | 'Can' | 'Box';

export const PANTRY_CATEGORIES: PantryCategory[] = [
  'Fruits', 'Vegetables', 'Meat', 'Poultry', 'Seafood', 'Dairy', 'Eggs', 'Grains', 'Pasta & Rice',
  'Canned Foods', 'Frozen Foods', 'Bakery', 'Snacks', 'Beverages', 'Spices', 'Oils & Condiments', 'Other',
];

export const PANTRY_UNITS: PantryUnit[] = ['Pieces', 'g', 'kg', 'ml', 'L', 'Pack', 'Bottle', 'Can', 'Box'];

export interface PantryItem {
  id: string;
  user_id: string;
  name: string;
  category: PantryCategory;
  quantity: number;
  unit: PantryUnit;
  expiration_date: string | null;
  notes: string | null;
  tracking: 'count' | 'level';
  level: 'full' | 'half' | 'low' | 'out' | null;
  created_at: string;
  updated_at: string;
}

export interface GroceryItem {
  id: string;
  user_id: string;
  list_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: PantryCategory;
  checked: boolean;
  note: string | null;
  from_meal_plan: boolean;
  created_at: string;
  updated_at: string;
}

export interface MealPreferencesRow {
  planning_duration: number;
  meal_types: string[];
  use_pantry_first: boolean;
  dietary_preferences: string[];
  allergies: string[];
  cuisine_preferences: Record<string, string[]>;
}
