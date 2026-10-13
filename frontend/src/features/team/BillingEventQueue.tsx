import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "../admin/OwnerError";

type Event = {
  id: string; type: string; objectId: string; attempts: number; retryAfter: number;
  receivedAt: string; lastFailureAt: string | null;
};
type Filter = "ALL" | "DUE" | "WAITING" | "REVIEW";
type Page = {
  events: Event[]; nextCursor: string | null; serverTime: number;
  totals: { pending: number; due: number; waiting: number; review: number };
};
type Props = { disabled: boolean; connected: boolean; onBusy: (value: boolean) => void; onExpired: () => void };
const filters: Record<Filter, string> = {
  ALL: "All pending events", DUE: "Ready for retry", WAITING: "Waiting for backoff", REVIEW: "Admin review required",
};

export function BillingEventQueue({ disabled, connected, onBusy, onExpired }: Props) {
  const [page, setPage] = useState<Page | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [cursor, setCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<(string | null)[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const live = useRef(true), pending = useRef(false), generation = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  function fail(value: unknown) {
    if (!live.current || (value instanceof DOMException && value.name === "AbortError")) return;
    setError((value as Error).message);
    if (value instanceof ApiError && value.status === 401) onExpired();
  }
  async function load(nextFilter = filter, after: string | null = cursor, movement: "first" | "next" | "back" | "refresh" = "refresh") {
    const current = ++generation.current;
    abort.current?.abort();
    const controller = new AbortController(); abort.current = controller;
    if (live.current) {
      setLoading(true);
      if (movement === "first") { setFilter(nextFilter); setPage(null); setCursor(null); setHistory([]); setPageNumber(1); }
    }
    const query = new URLSearchParams({ filter: nextFilter });
    if (after) query.set("after", after);
    try {
      const result = await api<Page>(`/api/team/billing/events?${query}`, { signal: controller.signal });
      if (live.current && current === generation.current) {
        setPage(result); setCursor(after);
        if (movement === "next") { setHistory(values => [...values.slice(-99), cursor]); setPageNumber(value => value + 1); }
        if (movement === "back") { setHistory(values => values.slice(0, -1)); setPageNumber(value => Math.max(1, value - 1)); }
        if (movement === "next" || movement === "back") heading.current?.focus();
      }
    } catch (failure) { if (current === generation.current) fail(failure); }
    finally { if (live.current && current === generation.current) setLoading(false); }
  }
  useEffect(() => {
    live.current = true; void load("ALL", null, "first");
    return () => { live.current = false; generation.current++; abort.current?.abort(); };
  }, []);
  async function retry(id: string) {
    if (pending.current || disabled || loading) return;
    pending.current = true; setBusy(true); onBusy(true); setError(""); setNotice("");
    try {
      await api(`/api/team/billing/events/${id}/retry`, { method: "POST" });
      if (live.current) setNotice("Event reconciled or already processed. Billing status still comes from verified Stripe data.");
    } catch (failure) { fail(failure); }
    finally {
      if (live.current) await load();
      pending.current = false;
      if (live.current) { setBusy(false); onBusy(false); }
    }
  }
  const locked = disabled || busy || loading;
  return <details className="support-billing-event-queue">
    <summary>Pending Stripe events — admin recovery</summary>
    <h5 tabIndex={-1} ref={heading}>Company billing recovery</h5>
    <p>Events in the current Stripe environment. Counts and retry eligibility update when this view refreshes.</p>
    <OwnerError message={error} />{notice && <p role="status" className="admin-notice">{notice}</p>}
    {page && <p>{page.totals.pending} pending · {page.totals.due} ready · {page.totals.waiting} waiting · {page.totals.review} need admin review</p>}
    <label>Show events<select disabled={locked} value={filter} onChange={event => { setError(""); void load(event.target.value as Filter, null, "first"); }}>
      {Object.entries(filters).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    <button className="admin-secondary" disabled={locked} onClick={() => { setError(""); void load(); }}>Refresh this page</button>
    <button className="admin-text-button" disabled={locked || !cursor} onClick={() => { setError(""); void load(filter, null, "first"); }}>Return to oldest pending events</button>
    {loading && <p role="status">Loading events…</p>}
    {!loading && !error && page && !page.events.length && <p>No events on this page. Use Previous page or return to the oldest pending events if the queue has changed.</p>}
    <ul className="support-billing-list" aria-busy={loading}>
      {page?.events.map(event => <li key={event.id}>
        <strong>{event.type}</strong>
        <p><code>{event.id}</code> · {event.attempts} processing attempts{event.attempts >= 10 ? " · Automatic retries paused; admin review required" : ""}</p>
        <p>Received {new Date(event.receivedAt).toLocaleString("en-GB")}{event.lastFailureAt ? ` · Last failure ${new Date(event.lastFailureAt).toLocaleString("en-GB")}` : ""}</p>
        {event.retryAfter > 0 && event.attempts < 10 && <p>Automatic retry eligible from {new Date(event.retryAfter * 1000).toLocaleString("en-GB")} when background recovery is enabled.</p>}
        <button className="admin-secondary" disabled={locked || !connected} onClick={() => void retry(event.id)}>Reconcile this event now</button>
      </li>)}
    </ul>
    <nav aria-label="Billing event pages" className="admin-actions">
      <button className="admin-secondary" disabled={locked || !history.length} onClick={() => { setError(""); void load(filter, history[history.length - 1], "back"); }}>Previous page</button>
      <span aria-live="polite">Page {pageNumber}</span>
      <button className="admin-secondary" disabled={locked || !page?.nextCursor} onClick={() => { if (page?.nextCursor) { setError(""); void load(filter, page.nextCursor, "next"); } }}>Next page</button>
    </nav>
    {pageNumber > 100 && <p>Previous navigation remembers recent pages. Return to the oldest pending events to start again.</p>}
  </details>;
}
