import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "local-dummy-key";
  return createBrowserClient(url, key);
}
