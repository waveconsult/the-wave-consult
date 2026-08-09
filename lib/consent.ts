import type Stripe from "stripe";

// The checkbox the withdrawal terms stand on.
//
// WaveHub is digital content delivered in full the moment someone pays, so the
// 14-day right of withdrawal only expires early if the buyer (a) expressly asks
// us to start before the period is up, (b) acknowledges that this costs them
// the right, and (c) gets that confirmed on a durable medium. Both legal pages
// state that this happens at checkout — so it has to actually happen at
// checkout, and it has to leave a record.
//
// Stripe stores the result on the session as `consent.terms_of_service`, which
// is the evidence that the acknowledgement was given for this specific order.
// The order confirmation email is (c).
//
// NOTE for whoever wires the Stripe account: the checkbox only renders a link
// if a Terms of Service URL is set under Settings → Branding → Checkout. Point
// it at https://wavehubtennis.com/terms.html.

export function withdrawalConsent(): Pick<
  Stripe.Checkout.SessionCreateParams,
  "consent_collection" | "custom_text"
> {
  return {
    consent_collection: { terms_of_service: "required" },
    custom_text: {
      terms_of_service_acceptance: {
        message:
          "I agree to the [Terms and Conditions](https://wavehubtennis.com/terms.html). " +
          "I expressly request that WaveHub starts immediately, and I acknowledge that " +
          "I therefore lose my 14-day right of withdrawal once access is granted " +
          "([details](https://wavehubtennis.com/withdrawal.html)).",
      },
    },
  };
}
