const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  (import.meta.env.VITE_NEXT_PUBLIC_SUPABASE_URL as string | undefined);

const supabaseKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  (import.meta.env.VITE_NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined);

export const getSupabaseUrl = () => supabaseUrl;
export const getSupabaseKey = () => supabaseKey;
export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseKey);

export const getSupabaseHeaders = (accessToken?: string) => ({
  apikey: supabaseKey as string,
  Authorization: `Bearer ${accessToken ?? supabaseKey}`,
  "Content-Type": "application/json",
});
