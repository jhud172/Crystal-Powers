import { useEffect, useState } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "./OwnerError";

type Configuration = {
  emailSignIn: boolean;
  googleSignIn: boolean;
  testBilling: boolean;
  checkoutPlans: number;
  subscriptionPortal: boolean;
  onlineExplanations: boolean;
  windowsVersion: string | null;
};

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
          <div><dt>Windows release feed</dt><dd>{configuration.windowsVersion ? `Version ${configuration.windowsVersion} listed` : "No installer listed"}</dd></div>
        </dl>
      </>}
    </>}
  </details>;
}
