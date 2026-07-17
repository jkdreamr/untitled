/**
 * Handle rules mirror the DB CHECK constraint (`^[a-z0-9_]{3,20}$` + reserved).
 * The database is the source of truth; this exists for instant client feedback.
 */
export const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

const RESERVED = new Set([
  "admin", "administrator", "api", "app", "auth", "about", "account", "settings", "support",
  "scout", "untitled", "novum", "help", "home", "feed", "wander", "explore", "discover",
  "search", "collections", "collection", "piece", "pieces", "profile", "profiles", "post",
  "posts", "upload", "compose", "new", "edit", "delete", "onboarding", "dashboard", "notifications",
  "login", "logout", "signin", "signup", "register", "verify", "callback", "reset", "me", "you",
  "user", "users", "u", "artist", "artists", "terms", "privacy", "dmca", "legal", "report", "reports",
  "null", "undefined", "root", "system", "staff", "team", "mod", "moderator", "www", "mail", "ftp",
  "static", "public", "assets", "_next", "favicon",
]);

export function isReservedHandle(handle: string): boolean {
  return RESERVED.has(handle.toLowerCase());
}

export function handleError(handle: string): string | null {
  if (handle.length < 3) return "at least 3 characters";
  if (handle.length > 20) return "at most 20 characters";
  if (!HANDLE_RE.test(handle)) return "lowercase letters, numbers, and _ only";
  if (isReservedHandle(handle)) return "that handle is reserved";
  return null;
}

/** Suggest a starting handle from a display name or email. */
export function suggestHandle(seed: string): string {
  const base = seed
    .toLowerCase()
    .split("@")[0]!
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 20);
  return base.length >= 3 ? base : `artist_${base}`.slice(0, 20);
}
