import { useEffect, useState } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "./OwnerError";

type OnlineAiBudget = {
  monthUtc: string;
  reservedPence: number;
  monthlyBudgetPence: number | null;
  remainingPence: number | null;
  requestReservePence: number | null;
  accountMonthlyLimit: number | null;
};

type Configuration = {
  emailSignIn: boolean;
  googleSignIn: boolean;
  testBilling: boolean;
  checkoutPlans: number;
  subscriptionPortal: boolean;
  onlineExplanations: boolean;
  windowsVersion: string | null;
  onlineAiBudget?: OnlineAiBudget;
};

const pounds = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const utcMonth = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

export function DocksConfiguration({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [open, setOpen] = useState(false);
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const abort = new AbortController();
    setConfiguration(null);
    setError("");
    void api<Configuration>("/api/admin/docks/configuration", { signal: abort.signal }).then(value => {
      if (!abort.signal.aborted) setConfiguration(value);
    }).catch(failure => {
      if (abort.signal.aborted) return;
      setError(failure instanceof Error ? failure.message : "Could not load the release configuration.");
      if (failure instanceof ApiError && failure.status === 401) onSessionExpired();
    });
    return () => abort.abort();
  }, [open, onSessionExpired]);

  return <details onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Crystal Docks release configuration</summary>
    {open && <>
      <OwnerError message={error} />
      {!configuration && !error && <p role="status">Loading release configuration…</p>}
      {configuration && <>
        <p>These settings show what the server offers. Verify delivery, payments and installation on the pilot before release.</p>
        <dl className="docks-configuration-list">
          <div><dt>Email sign-in</dt><dd>{configuration.emailSignIn ? "Configured" : "Unavailable"}</dd></div>
          <div><dt>Google sign-in</dt><dd>{configuration.googleSignIn ? "Configured" : "Unavailable"}</dd></div>
          <div><dt>Subscription checkout</dt><dd>{configuration.checkoutPlans === 0 ? "Unavailable" :
            `${configuration.testBilling ? "Sandbox" : "Live"} · ${configuration.checkoutPlans} of 4 plans`}</dd></div>
          <div><dt>Subscription portal</dt><dd>{configuration.subscriptionPortal ? "Configuration ID set" : "Unavailable"}</dd></div>
          <div><dt>Online AI explanations</dt><dd>{configuration.onlineExplanations ? "Configured" : "Unavailable"}</dd></div>
          {configuration.onlineAiBudget && <BudgetRows budget={configuration.onlineAiBudget} />}
          <div><dt>Windows release feed</dt><dd>{configuration.windowsVersion ? `Version ${configuration.windowsVersion} listed` : "No installer listed"}</dd></div>
        </dl>
      </>}
    </>}
  </details>;
}

function BudgetRows({ budget }: { budget: OnlineAiBudget }) {
  const month = utcMonth.format(new Date(`${budget.monthUtc}-01T00:00:00Z`));
  return <>
    <div><dt>Online AI budget for {month} (UTC)</dt><dd>
      {pounds.format(budget.reservedPence / 100)} reserved
      {budget.monthlyBudgetPence === null ? " · No valid cap configured" : ` of ${pounds.format(budget.monthlyBudgetPence / 100)}`}
      {budget.remainingPence !== null && <> · {pounds.format(budget.remainingPence / 100)} remaining</>}
    </dd></div>
    {budget.requestReservePence !== null && budget.accountMonthlyLimit !== null && <div>
      <dt>Online AI limits</dt><dd>{pounds.format(budget.requestReservePence / 100)} reserved per request · {budget.accountMonthlyLimit} requests per account each month</dd>
    </div>}
    <div><dt>What the total includes</dt><dd>Reservations include failed or timed-out requests. Provider charges are shown in the provider dashboard.</dd></div>
  </>;
}
