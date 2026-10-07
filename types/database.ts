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
      dietary_preferences: {
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
      halal_places: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: HalalPlaceCategory;
          address: string | null;
          city: string | null;
          country: string | null;
          latitude: number;
          longitude: number;
          phone: string | null;
          website: string | null;
          certification: string | null;
          halal_status: CommunityHalalStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          category?: HalalPlaceCategory;
          address?: string | null;
          city?: string | null;
          country?: string | null;
          latitude: number;
          longitude: number;
          phone?: string | null;
          website?: string | null;
          certification?: string | null;
          halal_status?: CommunityHalalStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          category?: HalalPlaceCategory;
          address?: string | null;
          city?: string | null;
          country?: string | null;
          latitude?: number;
          longitude?: number;
          phone?: string | null;
          website?: string | null;
          certification?: string | null;
          halal_status?: CommunityHalalStatus;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      halal_place_reviews: {
        Row: {
          id: string;
          user_id: string;
          place_key: string;
          place_name: string | null;
          rating: number;
          comment: string | null;
          halal_confirmed: boolean | null;
          author_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          place_key: string;
          place_name?: string | null;
          rating: number;
          comment?: string | null;
          halal_confirmed?: boolean | null;
          author_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          rating?: number;
          comment?: string | null;
          halal_confirmed?: boolean | null;
          author_name?: string | null;
          place_name?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      saved_halal_places: {
        Row: {
          id: string;
          user_id: string;
          place_key: string;
          snapshot: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          place_key: string;
          snapshot?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          snapshot?: Record<string, unknown>;
        };
        Relationships: [];
      };
      grocery_lists: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          store_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          store_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          store_name?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      grocery_items: {
        Row: {
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
        };
        Insert: {
          id?: string;
          user_id?: string;
          list_id: string;
          name: string;
          quantity?: number | null;
          unit?: string | null;
          category?: PantryCategory;
          checked?: boolean;
          note?: string | null;
          from_meal_plan?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          quantity?: number | null;
          unit?: string | null;
          category?: PantryCategory;
          checked?: boolean;
          note?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      budget_categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          monthly_limit: number | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          icon?: string;
          monthly_limit?: number | null;
          position?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          icon?: string;
          monthly_limit?: number | null;
          position?: number;
        };
        Relationships: [];
      };
      budget_transactions: {
        Row: {
          id: string;
          user_id: string;
          type: TransactionType;
          amount: number;
          category_id: string | null;
          description: string | null;
          occurred_on: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          type: TransactionType;
          amount: number;
          category_id?: string | null;
          description?: string | null;
          occurred_on?: string;
          created_at?: string;
        };
        Update: {
          type?: TransactionType;
          amount?: number;
          category_id?: string | null;
          description?: string | null;
          occurred_on?: string;
        };
        Relationships: [];
      };
      savings_goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          kind: SavingsGoalKind;
          target: number;
          saved: number;
          target_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          kind?: SavingsGoalKind;
          target: number;
          saved?: number;
          target_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          kind?: SavingsGoalKind;
          target?: number;
          saved?: number;
          target_date?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      ramadan_days: {
        Row: {
          id: string;
          user_id: string;
          hijri_year: number;
          day: number;
          fast_status: FastStatus | null;
          taraweeh: boolean;
          quran_pages: number;
          charity: boolean;
          note: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          hijri_year: number;
          day: number;
          fast_status?: FastStatus | null;
          taraweeh?: boolean;
          quran_pages?: number;
          charity?: boolean;
          note?: string | null;
          updated_at?: string;
        };
        Update: {
          fast_status?: FastStatus | null;
          taraweeh?: boolean;
          quran_pages?: number;
          charity?: boolean;
          note?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      quran_reading_sessions: {
        Row: {
          id: string;
          user_id: string;
          read_on: string;
          pages: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          read_on?: string;
          pages: number;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          read_on?: string;
          pages?: number;
          note?: string | null;
        };
        Relationships: [];
      };
      family_events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          kind: FamilyEventKind;
          starts_on: string;
          start_time: string | null;
          end_time: string | null;
          location: string | null;
          notes: string | null;
          member_ids: string[];
          repeats_yearly: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          kind?: FamilyEventKind;
          starts_on: string;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          notes?: string | null;
          member_ids?: string[];
          repeats_yearly?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          kind?: FamilyEventKind;
          starts_on?: string;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          notes?: string | null;
          member_ids?: string[];
          repeats_yearly?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          user_id: string;
          plan: PlanId;
          status: SubscriptionStatus;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          price_id: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          plan?: PlanId;
          status?: SubscriptionStatus;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          price_id?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          updated_at?: string;
        };
        Update: {
          plan?: PlanId;
          status?: SubscriptionStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
      app_admins: {
        Row: { user_id: string; created_at: string };
        Insert: { user_id: string; created_at?: string };
        Update: { created_at?: string };
        Relationships: [];
      };
      ai_usage: {
        Row: { id: string; user_id: string; kind: string; created_at: string };
        Insert: { id?: string; user_id: string; kind: string; created_at?: string };
        Update: { kind?: string };
        Relationships: [];
      };
      recipe_favorites: {
        Row: { id: string; user_id: string; recipe_key: string; created_at: string };
        Insert: { id?: string; user_id?: string; recipe_key: string; created_at?: string };
        Update: { recipe_key?: string };
        Relationships: [];
      };
      user_recipes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          cuisine: string | null;
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
          difficulty: 'Easy' | 'Medium' | 'Hard';
          prep_minutes: number;
          cook_minutes: number;
          servings: number;
          ingredients: { name: string; quantity: string; unit: string }[];
          steps: string[];
          tips: string | null;
          image_url: string | null;
          is_public: boolean;
          author_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          description?: string | null;
          cuisine?: string | null;
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
          difficulty?: 'Easy' | 'Medium' | 'Hard';
          prep_minutes?: number;
          cook_minutes?: number;
          servings?: number;
          ingredients?: { name: string; quantity: string; unit: string }[];
          steps?: string[];
          tips?: string | null;
          image_url?: string | null;
          is_public?: boolean;
          author_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          cuisine?: string | null;
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
          difficulty?: 'Easy' | 'Medium' | 'Hard';
          prep_minutes?: number;
          cook_minutes?: number;
          servings?: number;
          ingredients?: { name: string; quantity: string; unit: string }[];
          steps?: string[];
          tips?: string | null;
          image_url?: string | null;
          is_public?: boolean;
          author_name?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          category: BusinessCategory;
          description: string | null;
          services: string[];
          address: string | null;
          city: string | null;
          country: string | null;
          latitude: number | null;
          longitude: number | null;
          serves_online: boolean;
          phone: string | null;
          email: string | null;
          website: string | null;
          logo_url: string | null;
          licence_number: string | null;
          languages: string[];
          partner_offer: string | null;
          status: 'pending' | 'approved' | 'rejected';
          is_partner: boolean;
          featured: boolean;
          admin_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          name: string;
          category: BusinessCategory;
          description?: string | null;
          services?: string[];
          address?: string | null;
          city?: string | null;
          country?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          serves_online?: boolean;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          logo_url?: string | null;
          licence_number?: string | null;
          languages?: string[];
          partner_offer?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          is_partner?: boolean;
          featured?: boolean;
          admin_note?: string | null;
        };
        Update: {
          name?: string;
          category?: BusinessCategory;
          description?: string | null;
          services?: string[];
          address?: string | null;
          city?: string | null;
          country?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          serves_online?: boolean;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          logo_url?: string | null;
          licence_number?: string | null;
          languages?: string[];
          partner_offer?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          is_partner?: boolean;
          featured?: boolean;
          admin_note?: string | null;
        };
        Relationships: [];
      };
      business_enquiries: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          name: string;
          email: string;
          phone: string | null;
          message: string;
          travel_date: string | null;
          travellers: number | null;
          status: 'new' | 'contacted' | 'closed';
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id?: string;
          name: string;
          email: string;
          phone?: string | null;
          message: string;
          travel_date?: string | null;
          travellers?: number | null;
          status?: 'new' | 'contacted' | 'closed';
        };
        Update: { status?: 'new' | 'contacted' | 'closed' };
        Relationships: [];
      };
      trips: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          kind: TripKind;
          destination_label: string;
          latitude: number;
          longitude: number;
          start_date: string | null;
          end_date: string | null;
          travellers: number;
          budget: number | null;
          notes: string | null;
          checklist: ChecklistItem[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          kind?: TripKind;
          destination_label: string;
          latitude: number;
          longitude: number;
          start_date?: string | null;
          end_date?: string | null;
          travellers?: number;
          budget?: number | null;
          notes?: string | null;
          checklist?: ChecklistItem[];
        };
        Update: {
          name?: string;
          kind?: TripKind;
          destination_label?: string;
          latitude?: number;
          longitude?: number;
          start_date?: string | null;
          end_date?: string | null;
          travellers?: number;
          budget?: number | null;
          notes?: string | null;
          checklist?: ChecklistItem[];
          updated_at?: string;
        };
        Relationships: [];
      };
      community_events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          kind: CommunityEventKind;
          description: string | null;
          starts_at: string;
          ends_at: string | null;
          venue: string | null;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          online_url: string | null;
          organizer: string | null;
          contact: string | null;
          audience: 'everyone' | 'brothers' | 'sisters' | 'families' | 'youth' | 'kids';
          is_free: boolean;
          price: string | null;
          status: 'active' | 'hidden';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          kind?: CommunityEventKind;
          description?: string | null;
          starts_at: string;
          ends_at?: string | null;
          venue?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          online_url?: string | null;
          organizer?: string | null;
          contact?: string | null;
          audience?: 'everyone' | 'brothers' | 'sisters' | 'families' | 'youth' | 'kids';
          is_free?: boolean;
          price?: string | null;
          status?: 'active' | 'hidden';
        };
        Update: {
          title?: string;
          kind?: CommunityEventKind;
          description?: string | null;
          starts_at?: string;
          ends_at?: string | null;
          venue?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          online_url?: string | null;
          organizer?: string | null;
          contact?: string | null;
          audience?: 'everyone' | 'brothers' | 'sisters' | 'families' | 'youth' | 'kids';
          is_free?: boolean;
          price?: string | null;
          status?: 'active' | 'hidden';
        };
        Relationships: [];
      };
      households: {
        Row: { id: string; name: string; owner_id: string; created_at: string };
        Insert: { id?: string; name: string; owner_id: string };
        Update: { name?: string };
        Relationships: [];
      };
      household_members: {
        Row: {
          household_id: string;
          user_id: string;
          role: 'owner' | 'member';
          display_name: string | null;
          joined_at: string;
        };
        Insert: { household_id: string; user_id: string; role?: 'owner' | 'member'; display_name?: string | null };
        Update: { display_name?: string | null };
        Relationships: [];
      };
      household_invites: {
        Row: {
          id: string;
          household_id: string;
          email: string;
          token: string;
          invited_by: string;
          status: 'pending' | 'accepted' | 'revoked';
          created_at: string;
          expires_at: string;
        };
        Insert: { household_id: string; email: string; invited_by?: string };
        Update: { status?: 'pending' | 'accepted' | 'revoked' };
        Relationships: [];
      };
      event_rsvps: {
        Row: { event_id: string; user_id: string; status: 'going' | 'interested'; created_at: string };
        Insert: { event_id: string; user_id?: string; status?: 'going' | 'interested' };
        Update: { status?: 'going' | 'interested' };
        Relationships: [];
      };
      event_reports: {
        Row: { id: string; event_id: string; user_id: string; reason: string; created_at: string };
        Insert: { id?: string; event_id: string; user_id?: string; reason: string };
        Update: { reason?: string };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      my_household_id: { Args: Record<string, never>; Returns: string | null };
      create_household: { Args: { household_name: string }; Returns: string };
      accept_household_invite: { Args: { invite_token: string }; Returns: string };
      leave_household: { Args: Record<string, never>; Returns: undefined };
      remove_household_member: { Args: { member: string }; Returns: undefined };
      household_invite_preview: {
        Args: { invite_token: string };
        Returns: { household_name: string; invited_by_name: string | null; email: string; valid: boolean }[];
      };
      event_rsvp_counts: {
        Args: { ids: string[] };
        Returns: { event_id: string; going: number; interested: number }[];
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      halal_place_ratings: {
        Args: { keys: string[] };
        Returns: {
          place_key: string;
          avg_rating: number;
          review_count: number;
          confirmations: number;
          disputes: number;
        }[];
      };
    };
    Enums: Record<never, never>;
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type PlannerTask = Database['public']['Tables']['planner_tasks']['Row'];
export type PlannerGoal = Database['public']['Tables']['planner_goals']['Row'];
export type PantryItem = Database['public']['Tables']['pantry_items']['Row'];
export type FamilyMember = Database['public']['Tables']['family_members']['Row'];
export type MealPreference = Database['public']['Tables']['meal_preferences']['Row'];
export type Household = Database['public']['Tables']['households']['Row'];
export type HouseholdMember = Database['public']['Tables']['household_members']['Row'];
export type HouseholdInvite = Database['public']['Tables']['household_invites']['Row'];
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

export type HalalPlaceCategory =
  | 'grocery'
  | 'butcher'
  | 'restaurant'
  | 'cafe'
  | 'mosque'
  | 'other';

export type CommunityHalalStatus = 'halal' | 'halal_options' | 'muslim_owned';

export type HalalPlaceRecord = Database['public']['Tables']['halal_places']['Row'];
export type HalalPlaceReview = Database['public']['Tables']['halal_place_reviews']['Row'];
export type SavedHalalPlace = Database['public']['Tables']['saved_halal_places']['Row'];

export type GroceryList = Database['public']['Tables']['grocery_lists']['Row'];
export type GroceryItem = Database['public']['Tables']['grocery_items']['Row'];

export type TransactionType = 'income' | 'expense' | 'sadaqah' | 'zakat';
export type SavingsGoalKind =
  | 'general'
  | 'hajj'
  | 'umrah'
  | 'eid'
  | 'education'
  | 'emergency'
  | 'home'
  | 'wedding';

export type BudgetCategory = Database['public']['Tables']['budget_categories']['Row'];
export type BudgetTransaction = Database['public']['Tables']['budget_transactions']['Row'];
export type SavingsGoal = Database['public']['Tables']['savings_goals']['Row'];

export type FastStatus = 'fasted' | 'missed' | 'excused';
export type RamadanDay = Database['public']['Tables']['ramadan_days']['Row'];
export type QuranReadingSession = Database['public']['Tables']['quran_reading_sessions']['Row'];

export type FamilyEventKind =
  | 'eid'
  | 'aqiqah'
  | 'nikah'
  | 'walima'
  | 'birthday'
  | 'anniversary'
  | 'school'
  | 'appointment'
  | 'gathering'
  | 'islamic'
  | 'other';
export type FamilyEvent = Database['public']['Tables']['family_events']['Row'];

export type PlanId = 'free' | 'premium' | 'family';
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused';
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];

export type UserRecipe = Database['public']['Tables']['user_recipes']['Row'];

export type BusinessCategory =
  | 'travel_agency'
  | 'hajj_umrah'
  | 'halal_hotel'
  | 'tour_guide'
  | 'islamic_school'
  | 'tutor'
  | 'halal_catering'
  | 'islamic_finance'
  | 'other';
export type Business = Database['public']['Tables']['businesses']['Row'];
export type BusinessEnquiry = Database['public']['Tables']['business_enquiries']['Row'];
export type TripKind = 'holiday' | 'umrah' | 'hajj' | 'family_visit' | 'business' | 'other';
export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  group?: string;
}
export type Trip = Database['public']['Tables']['trips']['Row'];

export type CommunityEventKind =
  | 'halaqa'
  | 'iftar'
  | 'eid'
  | 'jumuah'
  | 'fundraiser'
  | 'volunteering'
  | 'sisters'
  | 'youth'
  | 'kids'
  | 'social'
  | 'class'
  | 'other';
export type CommunityEvent = Database['public']['Tables']['community_events']['Row'];
