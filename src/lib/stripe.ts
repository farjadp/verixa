import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

// Initialize Stripe instance
// Using latest API version typical for new SDKs.
export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia", 
  typescript: true,
});
