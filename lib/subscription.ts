// One answer to "is this membership active", shared by the website and the bot.
//
// These used to disagree. The Stripe webhook counted only `active` and
// `trialing`, while the bot's own check also let `past_due` through — so a
// member whose card bounced kept the Telegram group but silently lost the
// courses on the website. That produces the worst kind of support message,
// because from the outside it looks like the site is broken rather than the
// payment.
//
// The rule now, in one place: a subscription grants access while Stripe still
// considers it live, AND for as long as the period they already paid for runs.
// `past_due` is inside the grace window on purpose — they have paid for the
// current period, Stripe is retrying the card, and throwing them out mid-term
// punishes them for a bank's decision.

/** Stripe statuses that still grant access. */
export const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

/** Statuses that end access immediately, whatever the period end says. */
const DEAD_STATUSES = new Set(["canceled", "incomplete_expired", "unpaid"]);

export function isActiveStatus(status: string | null | undefined): boolean {
  return Boolean(status && ACTIVE_STATUSES.has(status));
}

/**
 * The access decision. `periodEnd` matters because Stripe reports a
 * cancellation the moment it is requested, but the member has paid through the
 * end of the term and keeps access until then.
 */
export function grantsAccess(
  status: string | null | undefined,
  periodEnd: string | Date | null | undefined,
): boolean {
  if (status && DEAD_STATUSES.has(status)) {
    // Cancelled but still inside the paid term — let them finish it.
    return stillWithinPaidPeriod(periodEnd);
  }
  if (!isActiveStatus(status)) return false;
  // An active status with an elapsed period end means the renewal never
  // landed; trust the clock over the label.
  return periodEnd ? stillWithinPaidPeriod(periodEnd) : true;
}

export function stillWithinPaidPeriod(
  periodEnd: string | Date | null | undefined,
): boolean {
  if (!periodEnd) return false;
  const end = periodEnd instanceof Date ? periodEnd : new Date(periodEnd);
  return !Number.isNaN(end.getTime()) && end > new Date();
}
