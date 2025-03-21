import { createClient } from '@supabase/supabase-js';

// Cloud Supabase for authentication
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Local Supabase for data
const supabaseDataUrl = import.meta.env.VITE_SUPABASE_DATA_URL;
const supabaseDataKey = import.meta.env.VITE_SUPABASE_DATA_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

// Cloud Supabase client for authentication
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      storageKey: 'supabase.auth.token',
      storage: {
        getItem: (key) => {
          try {
            return localStorage.getItem(key);
          } catch (error) {
            console.error('Error accessing localStorage:', error);
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            localStorage.setItem(key, value);
          } catch (error) {
            console.error('Error setting localStorage:', error);
          }
        },
        removeItem: (key) => {
          try {
            localStorage.removeItem(key);
          } catch (error) {
            console.error('Error removing from localStorage:', error);
          }
        }
      },
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// Local Supabase client for data operations
export const supabaseData = createClient(
  supabaseDataUrl || '',
  supabaseDataKey || '',
  {
    auth: {
      persistSession: false, // Don't persist auth for data client
      autoRefreshToken: false
    }
  }
);

/**
 * Initialize the local database schema and tables if they don't exist.
 * This is a helper function to create tables when using local development.
 */
export const initializeLocalDatabase = async () => {
  // First check if the training_sessions table exists
  const { error: checkError } = await supabaseData
    .from('training_sessions')
    .select('id')
    .limit(1);
  
  // If we get a "relation does not exist" error, create the tables
  if (checkError && checkError.code === '42P01') {
    console.log('Local database tables do not exist. Creating tables...');
    
    try {
      // Create training_sessions table
      const { error: createSessionsError } = await supabaseData.rpc('create_training_tables');
      
      if (createSessionsError) {
        // If RPC fails, create tables directly with SQL
        await supabaseData.rpc('exec_sql', {
          sql: `
            -- Create training_sessions table
            CREATE TABLE IF NOT EXISTS public.training_sessions (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id UUID NOT NULL,
              date DATE NOT NULL,
              weekly_focus TEXT,
              week_number INTEGER,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
            );
            
            -- Create training_hour_slots table
            CREATE TABLE IF NOT EXISTS public.training_hour_slots (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
              start_time TIME NOT NULL,
              end_time TIME NOT NULL,
              level TEXT,
              group_name TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
            );
            
            -- Create drills table
            CREATE TABLE IF NOT EXISTS public.drills (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              hour_slot_id UUID NOT NULL REFERENCES public.training_hour_slots(id) ON DELETE CASCADE,
              title TEXT NOT NULL,
              description TEXT NOT NULL,
              duration TEXT NOT NULL,
              difficulty TEXT,
              player_count INTEGER,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
            );
            
            -- Enable RLS
            ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.training_hour_slots ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.drills ENABLE ROW LEVEL SECURITY;
          `
        });
        
        console.log('Database tables created successfully');
      } else {
        console.log('Database tables created successfully via RPC');
      }
      
      return true;
    } catch (err) {
      console.error('Failed to create database tables:', err);
      return false;
    }
  } else if (checkError) {
    console.error('Error checking for training_sessions table:', checkError);
    return false;
  } else {
    console.log('Database tables already exist');
    return true;
  }
};