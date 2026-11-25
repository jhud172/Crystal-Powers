import { useEffect, useRef, useState } from "react";
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

async function request<T>(path: string, method = "GET", value?: unknown, token?: string, browserCookies = false): Promise<T> {
  const headers = new Headers();
  if (value !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`/api/docks/${path}`, {
    method, headers, body: value === undefined ? undefined : JSON.stringify(value),
    cache: "no-store", credentials: browserCookies ? "same-origin" : "omit", redirect: "error",
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
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [desktopCode, setDesktopCode] = useState("");
  const handledGoogle = useRef(false);

  useEffect(() => {
    void request<{ enabled: boolean }>("auth/google").then(result => setGoogleEnabled(result?.enabled === true))
      .catch(() => { /* Email remains available when Google is unavailable. */ });
    if (handledGoogle.current) return;
    const url = new URL(window.location.href);
    const outcome = url.searchParams.get("google");
    if (outcome !== "ready" && outcome !== "failed") return;
    handledGoogle.current = true;
    url.searchParams.delete("google");
    window.history.replaceState(window.history.state, "", url);
    if (outcome === "failed") {
      setError("Google sign-in did not finish. Try again or sign in by email.");
      return;
    }
    setBusy(true);
    void request<{ accessToken: string }>("auth/google/exchange", "POST", undefined, undefined, true)
      .then(async session => {
        if (!session?.accessToken) throw new Error("Crystal Docks did not return a session.");
        setToken(session.accessToken);
        setView(await request<Reports>("reports", "GET", undefined, session.accessToken));
      }).catch(() => setError("Google sign-in expired or could not be completed. Try signing in again."))
      .finally(() => setBusy(false));
  }, []);

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
      setDesktopCode("");
      setView(null);
      setRequested(false);
      setEmail("");
      try { await request("auth/sign-out", "POST", undefined, token); }
      catch { setNotice("Signed out of this page. The server session could not be revoked."); }
    });
  }

  function startGoogle() {
    void run(async () => {
      const result = await request<{ url: string }>("auth/google/start", "POST", undefined, undefined, true);
      const destination = new URL(result.url);
      if (destination.origin !== "https://accounts.google.com" || destination.pathname !== "/o/oauth2/v2/auth"
          || destination.username || destination.password)
        throw new Error("Crystal Docks could not verify the Google sign-in page.");
      window.location.assign(destination.href);
    });
  }

  function getDesktopCode() {
    void run(async () => {
      setDesktopCode("");
      const result = await request<{ code: string }>("auth/google/desktop-code", "POST", undefined, token);
      if (!/^[A-Za-z0-9_-]{43}$/.test(result.code)) throw new Error("Crystal Docks did not return a Windows code.");
      setDesktopCode(result.code);
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

  function clearReports() {
    if (!window.confirm("Delete your uploaded device summaries and keep report sharing on?")) return;
    void run(async () => {
      await request("reports", "DELETE", undefined, token);
      setView(previous => previous && { ...previous, reports: [] });
      setNotice("Uploaded summaries deleted. You can still share new checks from the Windows app.");
    });
  }

  return <section className="studio-section" aria-labelledby="docks-reports-title" aria-busy={busy}>
    <h1 id="docks-reports-title">Crystal Docks reports</h1>
    <p>View the device summaries you shared from the Windows app. Each summary expires 30 days after its check.</p>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {token ? <>
      <button className="admin-secondary" type="button" disabled={busy} onClick={() => void run(async () => {
        setView(await request<Reports>("reports", "GET", undefined, token));
      })}>Refresh reports</button>{" "}
      <button className="admin-secondary" type="button" disabled={busy} onClick={signOut}>Sign out</button>
      {googleEnabled && <section className="admin-form" aria-label="Windows sign-in">
        <button className="admin-secondary" type="button" disabled={busy} onClick={getDesktopCode}>Get a Windows sign-in code</button>
        {desktopCode && <div>
          <label>Windows sign-in code
            <input readOnly autoComplete="off" value={desktopCode} aria-describedby="docks-code-help"
              onFocus={event => event.currentTarget.select()} />
          </label>
          <small id="docks-code-help">Paste this code into your own Crystal Docks app within two minutes. Keep it private.</small>
        </div>}
      </section>}
      <SandboxCheckout token={token} />
      <Household token={token} />
      <ResearchPreference token={token} />
      {view && <>
        {view.reports.length === 0 && <p>{view.enabled ? "You have not shared a device summary yet." : "Report sharing is turned off. You can turn it on in the Windows app."}</p>}
        {view.reports.length > 0 && <ul>{view.reports.map((report, index) => <li key={`${report.checkedAt}-${index}`}>
          <h2>{report.deviceLabel}</h2>
          <p><time dateTime={report.checkedAt}>{new Date(report.checkedAt).toLocaleString("en-GB")}</time></p>
          <p>CPU {report.cpuPercent === null ? "unavailable" : `${report.cpuPercent}%`} · Memory {report.memoryPercent === null ? "unavailable" : `${report.memoryPercent}%`}</p>
        </li>)}</ul>}
        {view.enabled && view.reports.length > 0 && <button className="admin-secondary" type="button"
          disabled={busy} onClick={clearReports}>Delete uploaded summaries</button>}{" "}
        {view.enabled && <button className="admin-secondary" type="button" disabled={busy} onClick={disable}>Turn off sharing and delete reports</button>}
        <ReportSupport token={token} canGrant={view.enabled && view.reports.length > 0} changingReports={busy} />
      </>}
    </> : <>
      {googleEnabled && <button className="admin-secondary" type="button" disabled={busy}
        onClick={startGoogle}>Sign in with Google</button>}
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

function ResearchPreference({ token }: { token: string }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    void request<{ enabled: boolean }>("research", "GET", undefined, token).then(result => {
      if (live) setEnabled(result.enabled === true);
    }).catch(() => { /* Keep the reports usable independently of research. */ });
    return () => { live = false; };
  }, [token]);

  async function withdraw() {
    if (busy || !window.confirm("Turn off research and delete your current contribution?")) return;
    setBusy(true);
    setError("");
    try {
      const result = await request<{ enabled: boolean }>("research/preference", "PUT", { enabled: false }, token);
      setEnabled(result.enabled);
      setNotice(result.enabled ? "" : "Research is off and your contribution was removed.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not change research settings.");
    } finally { setBusy(false); }
  }

  if (!enabled && !notice && !error) return null;
  return <section className="admin-form" aria-labelledby="docks-research-preference">
    <h2 id="docks-research-preference">Diagnostic research</h2>
    {enabled && <button className="admin-secondary" type="button" disabled={busy}
      onClick={() => void withdraw()}>Turn off research and delete contribution</button>}
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}

type SupportGrant = { reference: string; expiresAt: string };
type SupportState = { grant: SupportGrant | null; activity: { action: string; recordedAt: string }[] };
const supportLabels: Record<string, string> = {
  GRANTED: "Support access allowed",
  REVOKED: "Support access ended",
  VIEWED: "Support opened your summaries",
};

function ReportSupport({ token, canGrant, changingReports }: {
  token: string; canGrant: boolean; changingReports: boolean;
}) {
  const [state, setState] = useState<SupportState | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const endpoint = "reports/support-access";

  useEffect(() => {
    if (changingReports) return;
    let current = true;
    void request<SupportState>(endpoint, "GET", undefined, token).then(result => {
      if (current) setState(result);
    }).catch(() => { /* Report viewing remains available. */ });
    return () => { current = false; };
  }, [token, changingReports]);

  useEffect(() => {
    if (!state?.grant) return;
    const delay = Math.max(0, Date.parse(state.grant.expiresAt) - Date.now());
    const timer = window.setTimeout(() => setState(previous => previous && { ...previous, grant: null }), delay);
    return () => window.clearTimeout(timer);
  }, [state?.grant]);

  async function change(method = "GET") {
    if (busy || changingReports) return;
    if (method === "POST" && !window.confirm("Allow Crystal Powers support to view the summaries on your account for one hour?")) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (method === "POST") {
        const grant = await request<SupportGrant>(endpoint, method, undefined, token);
        setState(previous => ({ grant, activity: previous?.activity ?? [] }));
        setNotice("Support access is active.");
      } else if (method === "DELETE") {
        await request(endpoint, method, undefined, token);
        setState(previous => previous && { ...previous, grant: null });
        setNotice("Support access ended.");
      }
      setState(await request<SupportState>(endpoint, "GET", undefined, token));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not confirm support access.");
    } finally { setBusy(false); }
  }

  if (!state || !Array.isArray(state.activity) || (!canGrant && !state.grant && state.activity.length === 0)) return null;
  return <section className="admin-form" aria-labelledby="docks-report-support" aria-busy={busy}>
    <h2 id="docks-report-support">Support access</h2>
    <p>Give Crystal Powers support up to an hour to view your uploaded summaries.</p>
    {state.grant ? <>
      <p>Share this reference with support before {new Date(state.grant.expiresAt).toLocaleString("en-GB")}.</p>
      <label>Support reference<input readOnly value={state.grant.reference} onFocus={event => event.currentTarget.select()} /></label>
      <button className="admin-secondary" type="button" disabled={busy || changingReports}
        onClick={() => void change("DELETE")}>End support access</button>
    </> : canGrant && <button className="admin-secondary" type="button" disabled={busy || changingReports}
      onClick={() => void change("POST")}>Allow support for one hour</button>}
    <button className="admin-secondary" type="button" disabled={busy || changingReports}
      onClick={() => void change()}>Refresh support activity</button>
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert">{error}</p>}
    {state.activity.length > 0 && <ul aria-label="Recent support activity">{state.activity.map((item, index) =>
      <li key={item.recordedAt + index}>{supportLabels[item.action]} ·{" "}
        <time dateTime={item.recordedAt}>{new Date(item.recordedAt).toLocaleString("en-GB")}</time></li>)}</ul>}
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
    <p>Use Stripe test card details. This sandbox does not charge money.</p>
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

type HouseholdInvitation = { id: string; email: string | null; sentByYou: boolean; accepted: boolean; active: boolean };
type HouseholdView = { available: boolean; canInvite: boolean; invitations: HouseholdInvitation[] };

function Household({ token }: { token: string }) {
  const [view, setView] = useState<HouseholdView | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    void request<HouseholdView>("household", "GET", undefined, token).then(result => {
      if (current) setView(result);
    }).catch(() => { /* The reports page is usable while household management is unavailable. */ });
    return () => { current = false; };
  }, [token]);

  async function change(path?: string, method = "POST", body?: unknown, message = "") {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (path) await request(path, method, body, token);
      if (body) setEmail("");
      setView(await request<HouseholdView>("household", "GET", undefined, token));
      setNotice(message);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Household access is currently unavailable.");
    } finally { setBusy(false); }
  }

  if (!view?.available) return null;
  return <section className="admin-form" aria-labelledby="docks-household-title">
    <h2 id="docks-household-title">Household plan</h2>
    <p>Share up to five device seats. Each adult keeps control of their devices and reports.</p>
    {view.canInvite && <form onSubmit={event => {
      event.preventDefault();
      void change("household/invitations", "POST", { email },
        "Invitation created. Ask the other adult to sign in here using that email address.");
    }}>
      <label>Adult’s email address<input type="email" value={email} maxLength={254} required
        aria-describedby="docks-household-invite-note" onChange={event => setEmail(event.target.value)} /></label>
      <p id="docks-household-invite-note">The other adult will see your sign-in email with the invitation.</p>
      <button className="admin-secondary" disabled={busy}>Create invitation</button>
    </form>}
    {view.invitations.length === 0 ? <p>No household invitations or memberships.</p> :
      <ul>{view.invitations.map(invite => {
        const path = `household/invitations/${invite.id}`;
        const remove = invite.sentByYou ? (invite.accepted ? "Remove member" : "Cancel invitation")
          : (invite.accepted ? "Leave household" : "Decline invitation");
        return <li key={invite.id}>
          <p>{invite.sentByYou ? invite.email : invite.email ? "Household from " + invite.email : "Household invitation"} · {
            !invite.active ? "Plan inactive" : invite.accepted ? "Accepted" : "Awaiting acceptance"
          }</p>
          {!invite.sentByYou && !invite.accepted && invite.active &&
            <button type="button" className="admin-secondary" disabled={busy}
              onClick={() => void change(path + "/accept", "POST", undefined, "You joined the household.")}>Accept invitation</button>}
          <button type="button" className="admin-secondary" disabled={busy} onClick={() => {
            if (invite.accepted && !window.confirm("Remove access to this household plan?")) return;
            void change(path, "DELETE", undefined, "Household access updated.");
          }}>{remove}</button>
        </li>;
      })}</ul>}
    <button type="button" className="admin-secondary" disabled={busy}
      onClick={() => void change(undefined, "GET", undefined, "Household invitations refreshed.")}>Refresh invitations</button>
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
