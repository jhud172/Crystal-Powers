import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

type Summary = { deviceId: string; deviceLabel: string; checkedAt: string; cpuPercent: number | null; memoryPercent: number | null };
type Reports = { enabled: boolean; reports: Summary[] };
type EnrolledDevice = { id: string; installationId: string; label: string; enrolledAt: string };
const planLabels = {
  SINGLE_MONTHLY: "One device, monthly",
  SINGLE_ANNUAL: "One device, annual",
  HOUSEHOLD_MONTHLY: "Household, monthly",
  HOUSEHOLD_ANNUAL: "Household, annual",
};
type Plan = keyof typeof planLabels;
type Subscription = { plan: Plan; state: string; paidUntilEpoch: number | null };
type SessionResponse = { accessToken: string; expiresAt: string };
type Session = { accessToken: string; expiresAt: number; pending: AbortController };
type AccountRequest = <T>(path: string, method?: string, value?: unknown) => Promise<T>;

class SessionEnded extends Error {}
class Unauthorised extends Error {}

function deviceName(device: EnrolledDevice) {
  return `${device.label} · ${device.installationId.slice(0, 8).toUpperCase()}`;
}

async function request<T>(path: string, method = "GET", value?: unknown, token?: string,
    browserCookies = false, signal?: AbortSignal): Promise<T> {
  const headers = new Headers();
  if (value !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`/api/docks/${path}`, {
    method, headers, body: value === undefined ? undefined : JSON.stringify(value),
    cache: "no-store", credentials: browserCookies ? "same-origin" : "omit", redirect: "error", signal,
  });
  if (response.status === 401) throw new Unauthorised("The sign-in code is invalid or expired. Request a new code.");
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || "Crystal Docks could not complete the request.");
  }
  return body as T;
}

export default function DocksReports() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [requested, setRequested] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const activeSession = useRef<Session | null>(null);
  const [view, setView] = useState<Reports | null>(null);
  const [devices, setDevices] = useState<EnrolledDevice[] | null>(null);
  const [supportRevision, setSupportRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const reportsHeading = useRef<HTMLHeadingElement>(null);
  const devicesHeading = useRef<HTMLHeadingElement>(null);
  const pageHeading = useRef<HTMLHeadingElement>(null);
  const [signInMethods, setSignInMethods] = useState<{ email: boolean; google: boolean } | null>(null);
  const googleEnabled = signInMethods?.google === true;
  const [desktopCode, setDesktopCode] = useState("");
  const handledGoogle = useRef(false);
  const [checkoutReturn, setCheckoutReturn] = useState(() => new URLSearchParams(window.location.search).get("checkout"));

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("checkout")) return;
    url.searchParams.delete("checkout");
    window.history.replaceState(window.history.state, "", url);
  }, []);

  const clearSession = useCallback(() => {
    activeSession.current?.pending.abort();
    activeSession.current = null;
    setSession(null);
    setDesktopCode("");
    setView(null);
    setDevices(null);
    setSupportRevision(0);
    setRequested(false);
    setEmail("");
    setCode("");
  }, []);

  const expireSession = useCallback((current: Session) => {
    if (activeSession.current !== current) return;
    clearSession();
    setNotice("");
    setError("Your Crystal Docks session ended. Sign in again to view your reports.");
    pageHeading.current?.focus();
  }, [clearSession]);

  const requestForSession = useCallback(async <T,>(current: Session | null, path: string, method?: string, value?: unknown) => {
    if (!current || activeSession.current !== current) throw new SessionEnded();
    try {
      if (current.expiresAt <= Date.now()) throw new Unauthorised();
      const result = await request<T>(path, method, value, current.accessToken, false, current.pending.signal);
      if (activeSession.current !== current) throw new SessionEnded();
      if (current.expiresAt <= Date.now()) throw new Unauthorised();
      return result;
    } catch (failure) {
      if (failure instanceof Unauthorised) expireSession(current);
      if (activeSession.current !== current) throw new SessionEnded();
      throw failure;
    }
  }, [expireSession]);

  const accountRequest: AccountRequest = useCallback(
    (path, method, value) => requestForSession(session, path, method, value), [requestForSession, session]);

  const openSession = useCallback(async (response: SessionResponse) => {
    const expiresAt = Date.parse(response?.expiresAt);
    if (!response?.accessToken || !Number.isFinite(expiresAt) || expiresAt <= Date.now())
      throw new Error("Crystal Docks did not return a valid sign-in session.");
    const current = { accessToken: response.accessToken, expiresAt, pending: new AbortController() };
    activeSession.current = current;
    setSession(current);
    setView(await requestForSession<Reports>(current, "reports"));
  }, [requestForSession]);

  useEffect(() => {
    if (!session) return;
    const current = session;
    let timer: number;
    function checkExpiry() {
      window.clearTimeout(timer);
      const remaining = current.expiresAt - Date.now();
      if (remaining <= 0) expireSession(current);
      else timer = window.setTimeout(checkExpiry, Math.min(remaining, 2_147_483_647));
    }
    checkExpiry();
    document.addEventListener("visibilitychange", checkExpiry);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", checkExpiry);
    };
  }, [expireSession, session]);

  useEffect(() => {
    let mounted = true;
    const available = (method: string) => request<{ enabled: boolean }>(`auth/${method}`)
      .then(result => result?.enabled === true).catch(() => false);
    void Promise.all([available("email"), available("google")]).then(([email, google]) => {
      if (mounted) setSignInMethods({ email, google });
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (handledGoogle.current) return;
    const url = new URL(window.location.href);
    const outcome = url.searchParams.get("google");
    if (outcome !== "ready" && outcome !== "failed") return;
    handledGoogle.current = true;
    url.searchParams.delete("google");
    window.history.replaceState(window.history.state, "", url);
    if (outcome === "failed") {
      setError("Google sign-in did not finish. Try signing in again.");
      return;
    }
    setBusy(true);
    void request<SessionResponse>("auth/google/exchange", "POST", undefined, undefined, true)
      .then(openSession).catch(failure => {
        if (!(failure instanceof SessionEnded))
          setError(activeSession.current ? "Could not load reports. Select Refresh reports to try again."
            : "Google sign-in expired or could not be completed. Try signing in again.");
      })
      .finally(() => setBusy(false));
  }, [openSession]);

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try { await action(); }
    catch (failure) {
      if (!(failure instanceof SessionEnded)) setError(failure instanceof Error ? failure.message : "Something went wrong.");
    }
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
      const response = await request<SessionResponse>("auth/email/exchange", "POST", { code: code.trim() });
      setCode("");
      await openSession(response);
    });
  }

  function signOut() {
    if (!session) return;
    void run(async () => {
      clearSession();
      try { await request("auth/sign-out", "POST", undefined, session.accessToken); }
      catch { setNotice("Signed out of this page. The server session could not be revoked."); }
    });
  }

  function deleteAccount() {
    if (!window.confirm("Permanently delete this Crystal Docks account and its uploaded data?")) return;
    void run(async () => {
      await accountRequest("account", "DELETE");
      clearSession();
      setNotice("Your Crystal Docks account and uploaded data have been deleted.");
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
      const result = await accountRequest<{ code: string }>("auth/google/desktop-code", "POST");
      if (!/^[A-Za-z0-9_-]{43}$/.test(result.code)) throw new Error("Crystal Docks did not return a Windows code.");
      setDesktopCode(result.code);
    });
  }

  function disable() {
    if (!window.confirm("Turn off report sharing and delete all of your uploaded reports?")) return;
    void run(async () => {
      await accountRequest("reports/preference", "PUT", { enabled: false });
      setView({ enabled: false, reports: [] });
      setNotice("Sharing is off and your uploaded reports have been deleted.");
    });
  }

  function clearReports() {
    if (!window.confirm("Delete your uploaded device summaries and keep report sharing on?")) return;
    void run(async () => {
      await accountRequest("reports", "DELETE");
      setView(previous => previous && { ...previous, reports: [] });
      setNotice("Uploaded summaries deleted. You can still share new checks from the Windows app.");
    });
  }

  function removeSummary(report: Summary) {
    if (!window.confirm("Delete this uploaded device summary? This also ends any current support access to your summaries.")) return;
    void run(async () => {
      const query = new URLSearchParams({ checkedAt: report.checkedAt });
      await accountRequest(`reports/devices/${encodeURIComponent(report.deviceId)}?${query}`, "DELETE");
      setView(previous => previous && {
        ...previous,
        reports: previous.reports.filter(item => item.deviceId !== report.deviceId),
      });
      setNotice("Device summary deleted. Any current summary support access has ended.");
      reportsHeading.current?.focus();
    });
  }

  function refreshDevices() {
    void run(async () => {
      const list = await accountRequest<EnrolledDevice[]>("devices");
      if (!Array.isArray(list)) throw new Error("Crystal Docks could not load the enrolled devices.");
      setDevices(list);
    });
  }

  function removeDevice(device: EnrolledDevice) {
    if (!window.confirm(`Remove ${deviceName(device)} from your account? This frees any Premium place it uses and deletes its uploaded summary and diagnostic log. Saved checks stay on that computer.`)) return;
    void run(async () => {
      await accountRequest(`devices/${encodeURIComponent(device.id)}`, "DELETE");
      setDevices(previous => previous?.filter(item => item.id !== device.id) ?? null);
      setView(previous => previous && { ...previous, reports: previous.reports.filter(report => report.deviceId !== device.id) });
      setSupportRevision(previous => previous + 1);
      setNotice("Device removed. You can now use any Premium place it freed on another computer.");
      devicesHeading.current?.focus();
    });
  }

  function downloadSummary({ deviceLabel, checkedAt, cpuPercent, memoryPercent }: Summary) {
    const content = JSON.stringify({ deviceLabel, checkedAt, cpuPercent, memoryPercent }, null, 2) + "\n";
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "crystal-docks-summary.json";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setError("");
    setNotice("Device summary download started.");
  }

  return <section className="studio-section" aria-labelledby="docks-reports-title" aria-busy={busy}>
    <h1 id="docks-reports-title" ref={pageHeading} tabIndex={-1}>Crystal Docks reports</h1>
    <p>View the device summaries you shared from the Windows app. Each summary expires 30 days after its check.</p>
    <p><Link to="/docks">About Crystal Docks</Link>{" · "}<Link to="/docks/support">Get Crystal Docks support</Link></p>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {checkoutReturn === "returned" && <p role="status">{session
      ? "Stripe can take a moment to confirm a payment. Check your status under Premium."
      : "You’ve returned from Stripe. Sign in to check your subscription status."}</p>}
    {checkoutReturn === "cancelled" && <p role="status">You left Stripe checkout. {session
      ? "You can start again under Premium."
      : "Sign in to choose a plan again."}</p>}
    {session ? <>
      <button className="admin-secondary" type="button" disabled={busy} onClick={() => void run(async () => {
        setView(await accountRequest<Reports>("reports"));
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
      <PremiumBilling accountRequest={accountRequest} onCheckout={checkoutReturn ? () => setCheckoutReturn(null) : undefined} />
      <Household accountRequest={accountRequest} />
      <details onToggle={event => { if (event.currentTarget.open && devices === null) refreshDevices(); }}>
        <summary>Manage enrolled devices</summary>
        <section className="admin-form" aria-labelledby="docks-devices-heading">
          <h2 id="docks-devices-heading" ref={devicesHeading} tabIndex={-1}>Your enrolled devices</h2>
          <p>Match the device reference in Access keys and devices in the Windows app before removing a computer.</p>
          {devices?.length === 0 && <p>No devices are enrolled on this account.</p>}
          {devices && devices.length > 0 && <ul>{devices.map(device => <li key={device.id}>
            <h3>{deviceName(device)}</h3>
            <p>Enrolled <time dateTime={device.enrolledAt}>{new Date(device.enrolledAt).toLocaleDateString("en-GB")}</time></p>
            <button className="admin-secondary" type="button" disabled={busy}
              aria-label={`Remove ${deviceName(device)}`} onClick={() => removeDevice(device)}>Remove device</button>
          </li>)}</ul>}
          <button className="admin-secondary" type="button" disabled={busy} onClick={refreshDevices}>Refresh devices</button>
        </section>
      </details>
      <ResearchPreference accountRequest={accountRequest} />
      <ReportSupport key={`log-${supportRevision}`} accountRequest={accountRequest} forLog />
      {view && <>
        <h2 tabIndex={-1} ref={reportsHeading}>Shared device summaries</h2>
        {view.reports.length === 0 && <p>{view.enabled ? "You have not shared a device summary yet." : "Report sharing is turned off. You can turn it on in the Windows app."}</p>}
        {view.reports.length > 0 && <ul>{view.reports.map(report => <li key={report.deviceId}>
          <h3>{report.deviceLabel}</h3>
          <p><time dateTime={report.checkedAt}>{new Date(report.checkedAt).toLocaleString("en-GB")}</time></p>
          <p>CPU {report.cpuPercent === null ? "unavailable" : `${report.cpuPercent}%`} · Memory {report.memoryPercent === null ? "unavailable" : `${report.memoryPercent}%`}</p>
          <button className="admin-secondary" type="button" disabled={busy}
            aria-label={`Download summary for ${report.deviceLabel}`}
            onClick={() => downloadSummary(report)}>Download summary</button>{" "}
          <button className="admin-secondary" type="button" disabled={busy}
            aria-label={`Delete summary for ${report.deviceLabel}`}
            onClick={() => removeSummary(report)}>Delete summary</button>
        </li>)}</ul>}
        {view.enabled && view.reports.length > 0 && <button className="admin-secondary" type="button"
          disabled={busy} onClick={clearReports}>Delete uploaded summaries</button>}{" "}
        {view.enabled && <button className="admin-secondary" type="button" disabled={busy} onClick={disable}>Turn off sharing and delete reports</button>}
        <ReportSupport key={`reports-${supportRevision}`} accountRequest={accountRequest}
          canGrant={view.enabled && view.reports.length > 0} changingReports={busy} />
      </>}
      <details>
        <summary>Account privacy</summary>
        <section className="admin-form" aria-label="Delete Crystal Docks account">
          <p>Delete your Docks account, enrolled devices and uploaded reports, logs and research data. Saved checks on Windows and past billing records are kept.</p>
          <p>To remove saved Windows checks too, use Clear saved checks in Advanced view before deleting your account.</p>
          <p>Sign in again if your session is older than ten minutes. If you have a subscription, arrange cancellation in Stripe and wait for the paid period to end.</p>
          <button className="admin-secondary" type="button" disabled={busy} onClick={deleteAccount}>Delete Docks account</button>
        </section>
      </details>
    </> : <>
      {signInMethods === null && <p role="status">Checking sign-in availability…</p>}
      {signInMethods && !signInMethods.email && !signInMethods.google && <p role="status">Sign-in is currently unavailable. Try again later.</p>}
      {googleEnabled && <button className="admin-secondary" type="button" disabled={busy}
        onClick={startGoogle}>Sign in with Google</button>}
      {signInMethods?.email && <form className="admin-form" onSubmit={send}>
        <label>Email address<input type="email" autoComplete="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} required /></label>
        <button className="studio-button" disabled={busy}>{requested ? "Send another code" : "Send sign-in code"}</button>
      </form>}
      {requested && <form className="admin-form" onSubmit={signIn}>
        <label>Sign-in code<input type="password" autoComplete="one-time-code" maxLength={43} minLength={43} value={code} onChange={event => setCode(event.target.value)} required /></label>
        <button className="studio-button" disabled={busy}>Sign in</button>
      </form>}
    </>}
  </section>;
}

function ResearchPreference({ accountRequest }: { accountRequest: AccountRequest }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    void accountRequest<{ enabled: boolean }>("research").then(result => {
      if (live) setEnabled(result.enabled === true);
    }).catch(() => { /* Keep the reports usable independently of research. */ });
    return () => { live = false; };
  }, [accountRequest]);

  async function withdraw() {
    if (busy || !window.confirm("Turn off research and delete your current contribution?")) return;
    setBusy(true);
    setError("");
    try {
      const result = await accountRequest<{ enabled: boolean }>("research/preference", "PUT", { enabled: false });
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

function ReportSupport({ accountRequest, canGrant = false, changingReports = false, forLog = false }: {
  accountRequest: AccountRequest; canGrant?: boolean; changingReports?: boolean; forLog?: boolean;
}) {
  const [state, setState] = useState<SupportState | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const endpoint = forLog ? "diagnostic-log" : "reports/support-access";
  const heading = forLog ? "docks-log-support" : "docks-report-support";

  useEffect(() => {
    if (changingReports) return;
    let current = true;
    void accountRequest<SupportState>(endpoint).then(result => {
      if (current) setState(result);
    }).catch(() => { /* Report viewing remains available. */ });
    return () => { current = false; };
  }, [accountRequest, changingReports, endpoint]);

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
        const grant = await accountRequest<SupportGrant>(endpoint, method);
        setState(previous => ({ grant, activity: previous?.activity ?? [] }));
        setNotice("Support access is active.");
      } else if (method === "DELETE") {
        await accountRequest(endpoint, method);
        setState(previous => previous && { ...previous, grant: null });
        setNotice(forLog ? "The diagnostic log was deleted and support access ended." : "Support access ended.");
      }
      setState(await accountRequest<SupportState>(endpoint));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not confirm support access.");
    } finally { setBusy(false); }
  }

  const activity = Array.isArray(state?.activity) ? state.activity : [];
  if (!forLog && (!state || (!canGrant && !state.grant && activity.length === 0))) return null;
  return <section className="admin-form" aria-labelledby={heading} aria-busy={busy}>
    <h2 id={heading}>{forLog ? "Diagnostic log for support" : "Support access"}</h2>
    <p>{forLog ? "Choose Reports and logs in the Windows app to review and share one check for up to an hour."
      : "Give Crystal Powers support up to an hour to view your uploaded summaries."}</p>
    {state?.grant ? <>
      <p>Share this reference with support before {new Date(state.grant.expiresAt).toLocaleString("en-GB")}.</p>
      <label>{forLog ? "Diagnostic log reference" : "Support reference"}<input readOnly
        className={forLog ? "docks-log-reference" : undefined} value={state.grant.reference}
        onFocus={event => event.currentTarget.select()} /></label>
      <button className="admin-secondary" type="button" disabled={busy || changingReports}
        onClick={() => void change("DELETE")}>{forLog ? "Delete log and end access" : "End support access"}</button>
    </> : canGrant && <button className="admin-secondary" type="button" disabled={busy || changingReports}
      onClick={() => void change("POST")}>Allow support for one hour</button>}
    <button className="admin-secondary" type="button" disabled={busy || changingReports}
      onClick={() => void change()}>{forLog ? "Refresh diagnostic log activity" : "Refresh support activity"}</button>
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert">{error}</p>}
    {activity.length > 0 && <ul aria-label={forLog ? "Recent diagnostic log activity" : "Recent support activity"}>{activity.map((item, index) =>
      <li key={item.recordedAt + index}>{forLog && item.action === "VIEWED" ? "Support opened your diagnostic log" : supportLabels[item.action]} ·{" "}
        <time dateTime={item.recordedAt}>{new Date(item.recordedAt).toLocaleString("en-GB")}</time></li>)}</ul>}
  </section>;
}

function PremiumBilling({ accountRequest, onCheckout }: { accountRequest: AccountRequest; onCheckout?: () => void }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [testMode, setTestMode] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [plan, setPlan] = useState<Plan | "">("");
  const [link, setLink] = useState("");
  const [portalLink, setPortalLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let current = true;
    void accountRequest<{ plans?: string[]; testMode?: boolean; subscription?: Subscription | null; canManage?: boolean }>(
      "billing/plans",
    ).then(result => {
      if (!current || typeof result?.testMode !== "boolean") return;
      const available = (result.plans ?? []).filter((item): item is Plan =>
        Object.prototype.hasOwnProperty.call(planLabels, item));
      setPlans(available);
      setTestMode(result.testMode);
      setCanManage(result.canManage === true);
      setPlan(previous => previous && available.includes(previous) ? previous : (available[0] ?? ""));
      setSubscription(result.subscription ?? null);
    }).catch(() => {
      if (current && refresh > 0) setError("Could not check your subscription status. Try again.");
    }).finally(() => {
      if (current) setChecking(false);
    });
    return () => { current = false; };
  }, [accountRequest, refresh]);

  async function prepare(event: FormEvent) {
    event.preventDefault();
    if (!plan || busy) return;
    setBusy(true);
    setLink("");
    setError("");
    try {
      const result = await accountRequest<{ url: string; testMode: boolean }>("billing/checkout", "POST", { plan });
      const url = new URL(result.url);
      if (result.testMode !== testMode || url.origin !== "https://checkout.stripe.com" || url.username || url.password)
        throw new Error("Stripe did not return a valid checkout.");
      setLink(url.href);
      onCheckout?.();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Checkout is currently unavailable.");
    } finally { setBusy(false); }
  }

  async function manage() {
    if (busy || !canManage) return;
    setBusy(true);
    setError("");
    setPortalLink("");
    try {
      const result = await accountRequest<{ url: string; testMode: boolean }>("billing/portal", "POST");
      const url = new URL(result.url);
      if (result.testMode !== testMode || url.origin !== "https://billing.stripe.com" || url.username || url.password)
        throw new Error("Stripe did not return a valid subscription management link.");
      setPortalLink(url.href);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Subscription management is currently unavailable.");
    } finally { setBusy(false); }
  }

  if (plans.length === 0 && !subscription) return null;
  const canPrepare = plans.length > 0 && (!subscription
    || subscription.state === "canceled" || subscription.state === "incomplete_expired");
  const title = testMode ? "Premium test checkout" : "Premium subscription";
  return <section className="admin-form" aria-label={title} aria-busy={busy}>
    <h2>{title}</h2>
    <p>{testMode ? "Use Stripe test card details. This sandbox does not charge money."
      : "Choose one device or a household of up to five devices. Stripe shows the price and renewal terms before you pay."}</p>
    {subscription && <p>
      <strong>{planLabels[subscription.plan]}</strong> · {subscription.state === "payment_review" ? "Payment under review" : subscription.state.replace(/_/g, " ")}
      {subscription.paidUntilEpoch !== null && <> · Paid through {new Date(subscription.paidUntilEpoch * 1000).toLocaleDateString("en-GB")}</>}
    </p>}
    {subscription?.state === "payment_review" && <p>Manage your subscription or contact support for help with the payment.</p>}
    <button type="button" className="admin-secondary" disabled={busy || checking} onClick={() => {
      setChecking(true);
      setError("");
      setRefresh(value => value + 1);
    }}>Check subscription status</button>
    {canPrepare && <form onSubmit={prepare}>
      <label>{testMode ? "Choose a test plan" : "Choose a Premium plan"}<select value={plan} disabled={busy} onChange={event => {
        setPlan(event.target.value as Plan); setLink("");
      }}>{plans.map(item => <option key={item} value={item}>{planLabels[item]}</option>)}</select></label>
      <button className="admin-secondary" disabled={busy}>{testMode ? "Prepare test checkout" : "Prepare checkout"}</button>
    </form>}
    {error && <p role="alert">{error}</p>}
    {link && <a className="studio-button" href={link} rel="noreferrer">{testMode ? "Open Stripe test checkout" : "Open Stripe checkout"}</a>}
    {canManage && <button type="button" className="admin-secondary" disabled={busy} onClick={() => void manage()}>
      {testMode ? "Manage test subscription" : "Manage subscription"}
    </button>}
    {portalLink && <a className="studio-button" href={portalLink} rel="noreferrer">
      {testMode ? "Open Stripe test portal" : "Open Stripe subscription management"}
    </a>}
  </section>;
}

type HouseholdInvitation = { id: string; email: string | null; sentByYou: boolean; accepted: boolean; active: boolean };
type HouseholdView = { available: boolean; canInvite: boolean; invitations: HouseholdInvitation[] };

function Household({ accountRequest }: { accountRequest: AccountRequest }) {
  const [view, setView] = useState<HouseholdView | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    void accountRequest<HouseholdView>("household").then(result => {
      if (current) setView(result);
    }).catch(() => { /* The reports page is usable while household management is unavailable. */ });
    return () => { current = false; };
  }, [accountRequest]);

  async function change(path?: string, method = "POST", body?: unknown, message = "") {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (path) await accountRequest(path, method, body);
      if (body) setEmail("");
      setView(await accountRequest<HouseholdView>("household"));
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
