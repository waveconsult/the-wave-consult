// Which payment processor is live, resolved in ONE place so the client bundle
// and the server can never disagree about it.
//
// Two traps this exists to close:
//  1. NEXT_PUBLIC_* is inlined into the client bundle at BUILD time but read at
//     runtime on the server. The literal `process.env.NEXT_PUBLIC_...` below is
//     what makes Next inline it — a computed lookup would silently not be
//     replaced and would read as undefined in the browser.
//  2. The value is typed by hand into a Vercel field. "FastSpring", "Fastspring"
//     or a trailing space would all fail a naive === "fastspring" comparison and
//     leave the app quietly on Stripe, which is exactly what happened. Normalise
//     instead of trusting the input.
const RAW = process.env.NEXT_PUBLIC_PAYMENTS_PROVIDER ?? "stripe";

export const PAYMENTS_PROVIDER = RAW.trim().toLowerCase();

export const IS_FASTSPRING = PAYMENTS_PROVIDER === "fastspring";

/** Shown to members next to the checkout button. */
export const PROCESSOR_NAME = IS_FASTSPRING ? "FastSpring" : "Stripe";
