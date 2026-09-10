/** How many hours of (approved) permission an employee may take per
 * calendar month before it's flagged on their profile. This is a separate
 * concept from the per-request cap in schemas.ts (a single request can't
 * exceed 4 hours either, but that's about one outing, not a monthly total)
 * — purely informational, not enforced at request time. */
export const PERMISSION_MONTHLY_LIMIT_HOURS = 4
