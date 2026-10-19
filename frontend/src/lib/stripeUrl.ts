type StripeDestination = "checkout" | "portal" | "invoice" | "receipt";
const hosts: Record<StripeDestination, string> = {
  checkout: "checkout.stripe.com",
  portal: "billing.stripe.com",
  invoice: "invoice.stripe.com",
  receipt: "pay.stripe.com",
};

/** Provider links must use the expected secure host, without credentials or alternate ports. */
export function trustedStripeUrl(value: string | null | undefined, destination: StripeDestination): string | null {
  if (typeof value !== "string" || !value || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== hosts[destination] || url.username || url.password || url.port) return null;
    if (destination === "receipt" && !url.pathname.startsWith("/receipts/")) return null;
    return url.href;
  } catch {
    return null;
  }
}
