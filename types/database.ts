/**
 * Supabase database type definitions.
 *
 * Generated from the database schema with `supabase gen types typescript`.
 * Extend this as tables are added. Keeping it in one place lets every
 * Supabase client (browser / server / admin) share strong typing.
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string | null;
        };
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
  };
};
