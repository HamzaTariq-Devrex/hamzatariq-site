// Admin sessions stay signed in for 30 days. The cookie is re-set on every refresh (middleware),
// so the 30 days count from the last visit to /admin. Shared by the server client and the middleware.
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * @supabase/ssr always writes auth cookies with a 400-day maxAge (it ignores cookieOptions.maxAge),
 * so the 30 days are applied here when a cookie is written. Removals (maxAge 0) pass through.
 */
export const withSessionAge = <T extends { maxAge?: number }>(options: T): T =>
  options.maxAge ? { ...options, maxAge: SESSION_MAX_AGE } : options;
