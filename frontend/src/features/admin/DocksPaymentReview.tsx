import { useEffect, useState } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "./OwnerError";

type Review = {
  subscriptionId: string;
  invoiceId: string;
  chargeId: string;
  kind: string;
  outcome: string;
  holdsAccess: boolean;
  observedAtEpoch: number;
};

export function DocksPaymentReview({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [open, setOpen] = useState(false);
  return <details onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Crystal Docks payment review</summary>
    {open && <PaymentReviews onSessionExpired={onSessionExpired} />}
  </details>;
}

function PaymentReviews({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [rows, setRows] = useState<Review[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    void api<Review[]>("/api/admin/docks/payment-review").then(result => {
      if (current) setRows(result);
    }).catch(failure => {
      if (!current) return;
      setError(failure instanceof Error ? failure.message : "Could not load payment reviews.");
      if (failure instanceof ApiError && failure.status === 401) onSessionExpired();
    });
    return () => { current = false; };
  }, [onSessionExpired]);

  return <section aria-label="Crystal Docks payment review" aria-busy={!rows && !error}>
    <p>Review the affected payment in Stripe using the charge or invoice ID below. A hold applies to the listed invoice.</p>
    <OwnerError message={error} />
    {rows ? rows.length === 0 ? <p role="status">No payment reviews found.</p> : <ul>
      {rows.map((item, index) => <li key={item.invoiceId + item.chargeId + index}>
        <strong>{item.kind.replace(/_/g, " ")} · {item.outcome.replace(/_/g, " ")}</strong>
        <p>{item.holdsAccess ? "Invoice on hold" : "No hold from this event"}</p>
        <p>Charge <code>{item.chargeId}</code> · invoice <code>{item.invoiceId}</code></p>
        <p>Subscription <code>{item.subscriptionId}</code> · {new Date(item.observedAtEpoch * 1000).toLocaleString("en-GB")}</p>
      </li>)}
    </ul> : !error && <p role="status">Loading payment reviews…</p>}
  </section>;
}
