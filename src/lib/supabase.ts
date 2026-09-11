import { createClient, SupabaseClient } from "@supabase/supabase-js";

const getEnvVar = (key: string): string | undefined => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env[key];
  }
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }
  return undefined;
};

const supabaseUrl = getEnvVar("VITE_SUPABASE_URL");
const supabaseAnonKey = getEnvVar("VITE_SUPABASE_ANON_KEY");

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Creates and exports a single reusable Supabase client.
 * Uses Vite environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
 * Fails clearly if the required Supabase environment variables are missing.
 */
function initSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Proxy({} as SupabaseClient, {
      get(_target, prop) {
        throw new Error(
          `Missing Supabase environment variables: Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment before calling supabase.${String(prop)}().`
        );
      },
    });
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase: SupabaseClient = initSupabase();
