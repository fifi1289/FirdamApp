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
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
