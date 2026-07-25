/**
 * Supabase database type definitions.
 *
 * Extend this as tables are added. Keeping it in one place lets every
 * Supabase client (browser / server / admin) share strong typing.
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          first_name?: string | null;
          last_name?: string | null;
          email: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      planner_tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          time: string | null;
          end_time: string | null;
          scheduled_date: string;
          completed: boolean;
          priority: TaskPriority;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          description?: string | null;
          time?: string | null;
          end_time?: string | null;
          scheduled_date?: string;
          completed?: boolean;
          priority?: TaskPriority;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          time?: string | null;
          end_time?: string | null;
          scheduled_date?: string;
          completed?: boolean;
          priority?: TaskPriority;
          created_at?: string;
        };
        Relationships: [];
      };
      planner_goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          target_date: string | null;
          progress: number;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          description?: string | null;
          target_date?: string | null;
          progress?: number;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          target_date?: string | null;
          progress?: number;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pantry_items: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: PantryCategory;
          quantity: number;
          unit: PantryUnit;
          expiration_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          category?: PantryCategory;
          quantity?: number;
          unit?: PantryUnit;
          expiration_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          category?: PantryCategory;
          quantity?: number;
          unit?: PantryUnit;
          expiration_date?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      family_members: {
        Row: {
          id: string;
          user_id: string;
          first_name: string;
          relationship: FamilyRelationship;
          birth_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          first_name: string;
          relationship: FamilyRelationship;
          birth_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          first_name?: string;
          relationship?: FamilyRelationship;
          birth_date?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      meal_preferences: {
        Row: {
          id: string;
          user_id: string;
          planning_duration: number;
          meal_types: string[];
          use_pantry_first: boolean;
          dietary_preferences: string[];
          allergies: string[];
          cuisine_preferences: Record<string, string[]>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          planning_duration?: number;
          meal_types?: string[];
          use_pantry_first?: boolean;
          dietary_preferences?: string[];
          allergies?: string[];
          cuisine_preferences?: Record<string, string[]>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          planning_duration?: number;
          meal_types?: string[];
          use_pantry_first?: boolean;
          dietary_preferences?: string[];
          allergies?: string[];
          cuisine_preferences?: Record<string, string[]>;
          updated_at?: string;
        };
        Relationships: [];
      };
      meal_plans: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          plan_data: Record<string, unknown>;
          preferences: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name?: string;
          plan_data: Record<string, unknown>;
          preferences: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          plan_data?: Record<string, unknown>;
          preferences?: Record<string, unknown>;
          updated_at?: string;
        };
        Relationships: [];
      };
      recipes: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          short_description: string | null;
          long_description: string | null;
          cuisine_id: string | null;
          meal_type_id: string | null;
          difficulty_id: string | null;
          prep_time_minutes: number | null;
          cook_time_minutes: number | null;
          servings: number | null;
          calories: number | null;
          protein: number | null;
          carbs: number | null;
          fat: number | null;
          fiber: number | null;
          image_path: string | null;
          halal: boolean | null;
          is_active: boolean | null;
          is_featured: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          sugar: number | null;
          sodium: number | null;
          cholesterol: number | null;
          storage_instructions: string | null;
          reheating_instructions: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          short_description?: string | null;
          long_description?: string | null;
          cuisine_id?: string | null;
          meal_type_id?: string | null;
          difficulty_id?: string | null;
          prep_time_minutes?: number | null;
          cook_time_minutes?: number | null;
          servings?: number | null;
          calories?: number | null;
          protein?: number | null;
          carbs?: number | null;
          fat?: number | null;
          fiber?: number | null;
          image_path?: string | null;
          halal?: boolean | null;
          is_active?: boolean | null;
          is_featured?: boolean | null;
          sugar?: number | null;
          sodium?: number | null;
          cholesterol?: number | null;
          storage_instructions?: string | null;
          reheating_instructions?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          short_description?: string | null;
          long_description?: string | null;
          cuisine_id?: string | null;
          meal_type_id?: string | null;
          difficulty_id?: string | null;
          prep_time_minutes?: number | null;
          cook_time_minutes?: number | null;
          servings?: number | null;
          calories?: number | null;
          protein?: number | null;
          carbs?: number | null;
          fat?: number | null;
          fiber?: number | null;
          image_path?: string | null;
          halal?: boolean | null;
          is_active?: boolean | null;
          is_featured?: boolean | null;
          sugar?: number | null;
          sodium?: number | null;
          cholesterol?: number | null;
          storage_instructions?: string | null;
          reheating_instructions?: string | null;
        };
        Relationships: [];
      };
      recipe_ingredients: {
        Row: {
          id: string;
          recipe_id: string;
          ingredient_id: string;
          quantity: number | null;
          unit: string | null;
          optional: boolean | null;
          display_order: number | null;
          notes: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          ingredient_id: string;
          quantity?: number | null;
          unit?: string | null;
          optional?: boolean | null;
          display_order?: number | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          recipe_id?: string;
          ingredient_id?: string;
          quantity?: number | null;
          unit?: string | null;
          optional?: boolean | null;
          display_order?: number | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      recipe_steps: {
        Row: {
          id: string;
          recipe_id: string;
          step_number: number;
          instruction: string;
          estimated_minutes: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          step_number: number;
          instruction: string;
          estimated_minutes?: number | null;
        };
        Update: {
          id?: string;
          recipe_id?: string;
          step_number?: number;
          instruction?: string;
          estimated_minutes?: number | null;
        };
        Relationships: [];
      };
      recipe_tips: {
        Row: {
          id: string;
          recipe_id: string;
          tip: string;
          display_order: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          tip: string;
          display_order?: number | null;
        };
        Update: {
          id?: string;
          recipe_id?: string;
          tip?: string;
          display_order?: number | null;
        };
        Relationships: [];
      };
      recipe_equipment: {
        Row: {
          id: string;
          recipe_id: string;
          equipment: string;
          display_order: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          equipment: string;
          display_order?: number | null;
        };
        Update: {
          id?: string;
          recipe_id?: string;
          equipment?: string;
          display_order?: number | null;
        };
        Relationships: [];
      };
      recipe_tags: {
        Row: { recipe_id: string; tag_id: string };
        Insert: { recipe_id: string; tag_id: string };
        Update: { recipe_id?: string; tag_id?: string };
        Relationships: [];
      };
      recipe_allergens: {
        Row: { recipe_id: string; allergen_id: string };
        Insert: { recipe_id: string; allergen_id: string };
        Update: { recipe_id?: string; allergen_id?: string };
        Relationships: [];
      };
      recipe_age_groups: {
        Row: {
          recipe_id: string;
          age_group_id: string;
          recommended: boolean | null;
        };
        Insert: {
          recipe_id: string;
          age_group_id: string;
          recommended?: boolean | null;
        };
        Update: {
          recipe_id?: string;
          age_group_id?: string;
          recommended?: boolean | null;
        };
        Relationships: [];
      };
      recipe_adaptations: {
        Row: {
          id: string;
          recipe_id: string;
          age_group_id: string;
          title: string;
          adaptation_instructions: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          age_group_id: string;
          title: string;
          adaptation_instructions: string;
        };
        Update: {
          id?: string;
          recipe_id?: string;
          age_group_id?: string;
          title?: string;
          adaptation_instructions?: string;
        };
        Relationships: [];
      };
      cuisines: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          active: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          active?: boolean | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          active?: boolean | null;
        };
        Relationships: [];
      };
      meal_types: {
        Row: { id: string; name: string; active: boolean | null };
        Insert: { id?: string; name: string; active?: boolean | null };
        Update: { id?: string; name?: string; active?: boolean | null };
        Relationships: [];
      };
      difficulties: {
        Row: {
          id: string;
          name: string;
          active: boolean | null;
          created_at: string | null;
        };
        Insert: { id?: string; name: string; active?: boolean | null };
        Update: { id?: string; name?: string; active?: boolean | null };
        Relationships: [];
      };
      ingredients: {
        Row: {
          id: string;
          name: string;
          category: string | null;
          halal: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          slug: string | null;
          category_id: string | null;
          default_unit: string | null;
          pantry_trackable: boolean | null;
        };
        Insert: {
          id?: string;
          name: string;
          category?: string | null;
          halal?: boolean | null;
          slug?: string | null;
          category_id?: string | null;
          default_unit?: string | null;
          pantry_trackable?: boolean | null;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string | null;
          halal?: boolean | null;
          slug?: string | null;
          category_id?: string | null;
          default_unit?: string | null;
          pantry_trackable?: boolean | null;
        };
        Relationships: [];
      };
      tags: {
        Row: { id: string; name: string; created_at: string | null };
        Insert: { id?: string; name: string };
        Update: { id?: string; name?: string };
        Relationships: [];
      };
      allergens: {
        Row: { id: string; name: string; created_at: string | null };
        Insert: { id?: string; name: string };
        Update: { id?: string; name?: string };
        Relationships: [];
      };
      age_groups: {
        Row: {
          id: string;
          name: string;
          min_months: number | null;
          max_months: number | null;
          active: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          min_months?: number | null;
          max_months?: number | null;
          active?: boolean | null;
        };
        Update: {
          id?: string;
          name?: string;
          min_months?: number | null;
          max_months?: number | null;
          active?: boolean | null;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type PlannerTask = Database['public']['Tables']['planner_tasks']['Row'];
export type PlannerGoal = Database['public']['Tables']['planner_goals']['Row'];
export type PantryItem = Database['public']['Tables']['pantry_items']['Row'];
export type FamilyMember = Database['public']['Tables']['family_members']['Row'];
export type MealPreference = Database['public']['Tables']['meal_preferences']['Row'];
export type MealPlanRecord = Database['public']['Tables']['meal_plans']['Row'];

export type TaskPriority = 'high' | 'medium' | 'low';

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

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

export type PantryUnit =
  | 'Pieces'
  | 'g'
  | 'kg'
  | 'ml'
  | 'L'
  | 'Pack'
  | 'Bottle'
  | 'Can'
  | 'Box';

export const PANTRY_CATEGORIES: PantryCategory[] = [
  'Fruits',
  'Vegetables',
  'Meat',
  'Poultry',
  'Seafood',
  'Dairy',
  'Eggs',
  'Grains',
  'Pasta & Rice',
  'Canned Foods',
  'Frozen Foods',
  'Bakery',
  'Snacks',
  'Beverages',
  'Spices',
  'Oils & Condiments',
  'Other',
];

export const PANTRY_UNITS: PantryUnit[] = [
  'Pieces',
  'g',
  'kg',
  'ml',
  'L',
  'Pack',
  'Bottle',
  'Can',
  'Box',
];

export type FamilyRelationship =
  | 'Self'
  | 'Spouse'
  | 'Son'
  | 'Daughter'
  | 'Father'
  | 'Mother'
  | 'Brother'
  | 'Sister'
  | 'Grandfather'
  | 'Grandmother'
  | 'Other';

export const FAMILY_RELATIONSHIPS: FamilyRelationship[] = [
  'Self',
  'Spouse',
  'Son',
  'Daughter',
  'Father',
  'Mother',
  'Brother',
  'Sister',
  'Grandfather',
  'Grandmother',
  'Other',
];
