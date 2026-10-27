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
let activeClient: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (activeClient) return activeClient;

  const url = getEnvVar("VITE_SUPABASE_URL");
  const key = getEnvVar("VITE_SUPABASE_ANON_KEY");

  if (url && key) {
    activeClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return activeClient;
  }

  return new Proxy({} as SupabaseClient, {
    get(_target, prop) {
      // Recheck in case env was loaded after module evaluation
      const lateUrl = getEnvVar("VITE_SUPABASE_URL");
      const lateKey = getEnvVar("VITE_SUPABASE_ANON_KEY");
      if (lateUrl && lateKey) {
        activeClient = createClient(lateUrl, lateKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
        return (activeClient as any)[prop];
      }
      throw new Error(
        `Missing Supabase environment variables: Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment before calling supabase.${String(prop)}().`
      );
    },
  });
}

export const supabase: SupabaseClient = getClient();
