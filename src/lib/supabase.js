import { createClient } from "@supabase/supabase-js";

/**
 * DEMO_MODE = no Supabase env vars configured.
 * The app runs fully on mock data (like the original demo) until you add
 * VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY to .env — then it goes live.
 */
export const DEMO_MODE =
  !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = DEMO_MODE
  ? null
  : createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
