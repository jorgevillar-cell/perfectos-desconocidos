import Stripe from "stripe";

function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing ${name} in environment variables`);
  }

  return value;
}

let stripeClient: Stripe | null = null;

export function getStripeSecretKey() {
  return requireEnv(process.env.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY");
}

export function getStripePublishableKey() {
  return requireEnv(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  );
}

export function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET ?? "";
}

export function getStripeClient() {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeSecretKey());
  }

  return stripeClient;
}

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