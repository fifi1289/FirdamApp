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
