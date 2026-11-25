import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type Summary = { deviceLabel: string; checkedAt: string; cpuPercent: number | null; memoryPercent: number | null };
type Reports = { enabled: boolean; reports: Summary[] };
const planLabels = {
  SINGLE_MONTHLY: "One device, monthly",
  SINGLE_ANNUAL: "One device, annual",
  HOUSEHOLD_MONTHLY: "Household, monthly",
  HOUSEHOLD_ANNUAL: "Household, annual",
};
type Plan = keyof typeof planLabels;
type TestSubscription = { plan: Plan; state: string; paidUntilEpoch: number | null };

async function request<T>(path: string, method = "GET", value?: unknown, token?: string): Promise<T> {
  const headers = new Headers();
  if (value !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`/api/docks/${path}`, {
    method, headers, body: value === undefined ? undefined : JSON.stringify(value),
    cache: "no-store", credentials: "omit", redirect: "error",
  });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const message = response.status === 401 ? "The sign-in code or session has expired. Request a new code." : body?.message;
    throw new Error(message || "Crystal Docks could not complete the request.");
  }
  return body as T;
}

export default function DocksReports() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [requested, setRequested] = useState(false);
  const [token, setToken] = useState("");
  const [view, setView] = useState<Reports | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  function send(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      await request("auth/email/request", "POST", { email });
      setRequested(true);
      setNotice("Check your inbox for a Crystal Docks sign-in code.");
    });
  }

  function signIn(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      const session = await request<{ accessToken?: string }>("auth/email/exchange", "POST", { code: code.trim() });
      if (!session?.accessToken) throw new Error("Crystal Docks did not return a session.");
      setCode("");
      setToken(session.accessToken);
      setView(await request<Reports>("reports", "GET", undefined, session.accessToken));
    });
  }

  function signOut() {
    void run(async () => {
      setToken("");
      setView(null);
      setRequested(false);
      setEmail("");
      try { await request("auth/sign-out", "POST", undefined, token); }
      catch { setNotice("Signed out of this page. The server session could not be revoked."); }
    });
  }

  function disable() {
    if (!window.confirm("Turn off report sharing and delete all of your uploaded reports?")) return;
    void run(async () => {
      await request("reports/preference", "PUT", { enabled: false }, token);
      setView({ enabled: false, reports: [] });
      setNotice("Sharing is off and your uploaded reports have been deleted.");
    });
  }

  return <section className="studio-section" aria-labelledby="docks-reports-title" aria-busy={busy}>
    <h1 id="docks-reports-title">Crystal Docks reports</h1>
    <p>View the device summaries you shared from the Windows app.</p>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {token ? <>
      <button className="admin-secondary" type="button" disabled={busy} onClick={() => void run(async () => {
        setView(await request<Reports>("reports", "GET", undefined, token));
      })}>Refresh reports</button>{" "}
      <button className="admin-secondary" type="button" disabled={busy} onClick={signOut}>Sign out</button>
      <SandboxCheckout token={token} />
      {view && <>
        {view.reports.length === 0 && <p>{view.enabled ? "You have not shared a device summary yet." : "Report sharing is turned off. You can turn it on in the Windows app."}</p>}
        {view.reports.length > 0 && <ul>{view.reports.map((report, index) => <li key={`${report.checkedAt}-${index}`}>
          <h2>{report.deviceLabel}</h2>
          <p><time dateTime={report.checkedAt}>{new Date(report.checkedAt).toLocaleString("en-GB")}</time></p>
          <p>CPU {report.cpuPercent === null ? "unavailable" : `${report.cpuPercent}%`} · Memory {report.memoryPercent === null ? "unavailable" : `${report.memoryPercent}%`}</p>
        </li>)}</ul>}
        {view.enabled && <button className="admin-secondary" type="button" disabled={busy} onClick={disable}>Turn off sharing and delete reports</button>}
      </>}
    </> : <>
      <form className="admin-form" onSubmit={send}>
        <label>Email address<input type="email" autoComplete="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} required /></label>
        <button className="studio-button" disabled={busy}>{requested ? "Send another code" : "Send sign-in code"}</button>
      </form>
      {requested && <form className="admin-form" onSubmit={signIn}>
        <label>Sign-in code<input type="password" autoComplete="one-time-code" maxLength={43} minLength={43} value={code} onChange={event => setCode(event.target.value)} required /></label>
        <button className="studio-button" disabled={busy}>Sign in</button>
      </form>}
    </>}
  </section>;
}

function SandboxCheckout({ token }: { token: string }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<TestSubscription | null>(null);
  const [plan, setPlan] = useState<Plan | "">("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    void request<{ plans?: string[]; testMode?: boolean; subscription?: TestSubscription | null }>(
      "billing/plans", "GET", undefined, token,
    ).then(result => {
      if (!current || result?.testMode !== true) return;
      const available = (result.plans ?? []).filter((item): item is Plan =>
        Object.prototype.hasOwnProperty.call(planLabels, item));
      setPlans(available);
      setPlan(available[0] ?? "");
      setSubscription(result.subscription ?? null);
    }).catch(() => { /* Billing is optional and must not interrupt the report viewer. */ });
    return () => { current = false; };
  }, [token]);

  async function prepare(event: FormEvent) {
    event.preventDefault();
    if (!plan || busy) return;
    setBusy(true);
    setLink("");
    setError("");
    try {
      const result = await request<{ url: string; testMode: boolean }>("billing/checkout", "POST", { plan }, token);
      const url = new URL(result.url);
      if (result.testMode !== true || url.origin !== "https://checkout.stripe.com" || url.username || url.password)
        throw new Error("Stripe did not return a valid test checkout.");
      setLink(url.href);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Checkout is currently unavailable.");
    } finally { setBusy(false); }
  }

  if (plans.length === 0 && !subscription) return null;
  const canPrepare = plans.length > 0 && (!subscription
    || subscription.state === "canceled" || subscription.state === "incomplete_expired");
  return <section className="admin-form" aria-label="Premium test checkout">
    <h2>Premium test checkout</h2>
    <p>Use Stripe test card details. This sandbox does not charge money or activate Premium access.</p>
    {subscription && <p>
      <strong>{planLabels[subscription.plan]}</strong> · {subscription.state.replace(/_/g, " ")}
      {subscription.paidUntilEpoch !== null && <> · Paid through {new Date(subscription.paidUntilEpoch * 1000).toLocaleDateString("en-GB")}</>}
    </p>}
    {canPrepare && <form onSubmit={prepare}>
      <label>Choose a test plan<select value={plan} disabled={busy} onChange={event => {
        setPlan(event.target.value as Plan); setLink("");
      }}>{plans.map(item => <option key={item} value={item}>{planLabels[item]}</option>)}</select></label>
      <button className="admin-secondary" disabled={busy}>Prepare test checkout</button>
    </form>}
    {error && <p role="alert">{error}</p>}
    {link && <a className="studio-button" href={link} rel="noreferrer">Open Stripe test checkout</a>}
  </section>;
}
