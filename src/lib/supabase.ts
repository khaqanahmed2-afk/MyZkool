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

export const checkIsSupabaseConfigured = (): boolean => {
  return Boolean(getEnvVar("VITE_SUPABASE_URL") && getEnvVar("VITE_SUPABASE_ANON_KEY"));
};

/**
 * Custom fetch wrapper to synchronize client and Supabase server clocks.
 * If the user's OS clock is skewed ahead or behind UTC, this ensures
 * `expires_at` is aligned with client time, preventing proactive token-refresh storms.
 */
let clockSkewSec = 0;

const clockSkewSafeFetch: typeof fetch = async (input, init) => {
  const res = await fetch(input, init);
  try {
    const dateHdr = res.headers.get("date");
    if (dateHdr) {
      const serverSec = Math.round(new Date(dateHdr).getTime() / 1000);
      const localSec = Math.round(Date.now() / 1000);
      clockSkewSec = localSec - serverSec;
    }

    const urlStr = typeof input === "string" ? input : (input as any)?.url || "";
    if (urlStr.includes("/auth/v1/token") && clockSkewSec !== 0) {
      const clone = res.clone();
      const json = await clone.json();
      if (json && json.expires_in && json.expires_at) {
        json.expires_at = Math.round(Date.now() / 1000) + json.expires_in;
        return new Response(JSON.stringify(json), {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
        });
      }
    }
  } catch {
    // Fallback safely to original response
  }
  return res;
};

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
      global: {
        fetch: clockSkewSafeFetch,
      },
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
          global: {
            fetch: clockSkewSafeFetch,
          },
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
