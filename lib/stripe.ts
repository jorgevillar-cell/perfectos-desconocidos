import Stripe from "stripe";

function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing ${name} in environment variables`);
  }

  return value;
}

export const stripeSecretKey = requireEnv(process.env.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY");
export const stripePublishableKey = requireEnv(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
);
export const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

export const stripe = new Stripe(stripeSecretKey);

export function platformFeeAmount(amount: number) {
  return Math.max(0, Math.round(amount * 0.1));
}

export function ownerPayoutAmount(amount: number) {
  return Math.max(0, amount - platformFeeAmount(amount));
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}