import Stripe from 'stripe';

// Lazy-initialize Stripe to prevent `new Stripe()` from being evaluated
// at module load time during Vercel static builds (when env vars may be absent).
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY || 'sk_dummy_build_key';
    _stripe = new Stripe(key, {
      apiVersion: "2025-02-24.acacia" as any,
      typescript: true,
    });
  }
  return _stripe;
}

// Keep the legacy named export as a compatibility shim so existing code still works.
// This works because it's a getter — Stripe is not instantiated until `stripe` is first accessed.
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop];
  }
});
