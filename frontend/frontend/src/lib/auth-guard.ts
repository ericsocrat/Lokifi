import { me } from "./auth";

/**
 * Simple guard you can call at page load (client) to ensure auth.
 * Returns the profile (me) or throws.
 */
export async function requireAuth(): Promise<{handle: string; avatar_url?: string; bio?: string; created_at: string;}> {
  const profile = await me();
  if (!profile?.handle) {
    throw new Error("Not authenticated");
  }
  return profile;
}
