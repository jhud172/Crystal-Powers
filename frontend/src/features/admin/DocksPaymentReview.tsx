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
type Delivery = {
  eventId: string;
  type: string;
  attempts: number;
  state: "pending" | "processing" | "review";
  nextAttemptEpoch: number;
  lastRetryEpoch: number | null;
};
const deliveryLabels = { pending: "Waiting to retry", processing: "Processing", review: "Needs review" };
const deliveriesEndpoint = "/api/admin/docks/payment-deliveries";

export function DocksPaymentReview({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [open, setOpen] = useState(false);
  return <details onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Crystal Docks payment review</summary>
    {open && <>
      <PaymentReviews onSessionExpired={onSessionExpired} />
      <PaymentDeliveries onSessionExpired={onSessionExpired} />
    </>}
  </details>;
}

function PaymentDeliveries({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loaded, setLoaded] = useState(false);

  async function load(retry?: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (retry) {
        await api(`${deliveriesEndpoint}/${encodeURIComponent(retry)}/retry`, { method: "POST" });
        setNotice("Delivery queued for another attempt.");
      }
      setDeliveries(await api<Delivery[]>(deliveriesEndpoint));
      setLoaded(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not open the delivery queue.");
      if (failure instanceof ApiError && failure.status === 401) onSessionExpired();
    } finally { setBusy(false); }
  }

  return <section aria-label="Stripe delivery queue" aria-busy={busy}>
    <h3>Stripe delivery queue</h3>
    <p>See pending Docks payment updates and retry a delivery after checking it in Stripe.</p>
    <button className="admin-secondary" type="button" disabled={busy} onClick={() => void load()}>
      {loaded ? "Refresh deliveries" : "Load pending deliveries"}
    </button>
    {notice && <p role="status">{notice}</p>}
    <OwnerError message={error} />
    {loaded && deliveries.length === 0 && <p role="status">No pending deliveries.</p>}
    {deliveries.length > 0 && <ul>{deliveries.map(item => <li key={item.eventId}>
      <strong>{deliveryLabels[item.state]}</strong> · <code>{item.eventId}</code>
      <p>{item.type} · {item.attempts} {item.attempts === 1 ? "attempt" : "attempts"}</p>
      {item.state === "pending" && <p>Next attempt {new Date(item.nextAttemptEpoch * 1000).toLocaleString("en-GB")}</p>}
      {item.lastRetryEpoch !== null && <p>Last manual retry {new Date(item.lastRetryEpoch * 1000).toLocaleString("en-GB")}</p>}
      {item.state !== "processing" && <button className="admin-secondary" type="button" disabled={busy}
        onClick={() => void load(item.eventId)}>Retry {item.eventId}</button>}
    </li>)}</ul>}
  </section>;
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
