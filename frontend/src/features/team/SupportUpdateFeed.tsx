import { useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "../admin/OwnerError";

type Page<T> = { items: T[]; nextCursor: string | null };
export function SupportUpdateFeed<T extends { id: string }>({ request, kind, title, revision, disabled, onExpired, render }: {
  request: string; kind: "MESSAGES" | "REPLIES" | "EVENTS"; title: string; revision: number;
  disabled: boolean; onExpired: () => void; render: (item: T) => ReactNode;
}) {
  const [page, setPage] = useState<Page<T> | null>(null), [cursor, setCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<(string | null)[]>([]), [refresh, setRefresh] = useState(0);
  const [error, setError] = useState(""), [expired, setExpired] = useState(false), [loading, setLoading] = useState(true);
  const generation = useRef(0), heading = useRef<HTMLHeadingElement>(null), focus = useRef(false);
  useEffect(() => {
    const current = ++generation.current, abort = new AbortController(); setLoading(true); setError(""); setExpired(false);
    void api<Page<T>>(`/api/team/support/requests/${request}/updates?kind=${kind}${cursor ? `&before=${encodeURIComponent(cursor)}` : ""}`, { signal: abort.signal }).then(result => {
      if (current !== generation.current) return; setPage(result); if (focus.current) { heading.current?.focus(); focus.current = false; }
    }).catch((failure: unknown) => {
      if (current !== generation.current || failure instanceof DOMException && failure.name === "AbortError") return;
      setPage(null); setError((failure as Error).message); setExpired(failure instanceof ApiError && failure.status === 401);
    }).finally(() => { if (current === generation.current) setLoading(false); });
    return () => { ++generation.current; abort.abort(); };
  }, [request, kind, cursor, revision, refresh]);
  function move(next: string | null, direction: "older" | "newer" | "latest") {
    if (disabled || loading) return; focus.current = true;
    if (direction === "older") setHistory(values => [...values.slice(-99), cursor]);
    else if (direction === "newer") setHistory(values => values.slice(0, -1));
    else setHistory([]);
    setCursor(next); if (next === cursor) setRefresh(value => value + 1);
  }
  return <section className="support-update-feed" aria-label={title}><h4 ref={heading} tabIndex={-1}>{title}</h4><p>Newest first · up to 50 entries per page{cursor ? " · earlier entries" : ""}.</p><OwnerError message={error} />
    {expired && <button className="admin-secondary" disabled={disabled} onClick={() => { if (window.confirm("Return to team sign-in? Eligible request messages and progress edits stay in this tab. Copy other unsaved form input before returning to sign-in.")) onExpired(); }}>Return to team sign-in</button>}
    <nav className="team-history-nav" aria-label={`${title} pages`}><button className="admin-secondary" disabled={disabled || loading} onClick={() => { focus.current = true; setRefresh(value => value + 1); }}>Refresh page</button><button className="admin-secondary" disabled={disabled || loading || !history.length} onClick={() => move(history[history.length - 1], "newer")}>Newer entries</button><button className="admin-secondary" disabled={disabled || loading || !page?.nextCursor} onClick={() => { if (page?.nextCursor) move(page.nextCursor, "older"); }}>Older entries</button><button className="admin-text-button" disabled={disabled || loading || cursor === null} onClick={() => move(null, "latest")}>Latest entries</button></nav>
    {loading ? <p role="status">Loading {title.toLowerCase()}…</p> : page && !page.items.length ? <p>No entries on this page.</p> : <ol className={kind === "EVENTS" ? "support-event-list" : "support-message-list"}>{page?.items.map(item => <li key={item.id}>{render(item)}</li>)}</ol>}
  </section>;
}
