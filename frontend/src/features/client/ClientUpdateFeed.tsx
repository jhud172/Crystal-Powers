import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../portfolio/projectApi";
import { OwnerError } from "../admin/OwnerError";

type Message = { id: string; author: string; body: string; direction: "TEAM" | "CLIENT"; createdAt: string };
type History = { id: string; detail: string; createdAt: string };
type Row = Message | History;
type Page = { items: Row[]; nextCursor: string | null };
export function ClientUpdateFeed({ project, kind, revision, latestRevision = 0, disabled, onExpired, onUnavailable }: {
  project: string; kind: "conversation" | "history"; revision: number; latestRevision?: number;
  disabled: boolean; onExpired: () => void; onUnavailable: () => void;
}) {
  const [page, setPage] = useState<Page | null>(null), [cursor, setCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<(string | null)[]>([]), [error, setError] = useState("");
  const [loading, setLoading] = useState(true), [refresh, setRefresh] = useState(0);
  const generation = useRef(0), heading = useRef<HTMLHeadingElement>(null), moveFocus = useRef(true), seenLatest = useRef(latestRevision);
  useEffect(() => {
    if (latestRevision === seenLatest.current) return;
    seenLatest.current = latestRevision; setCursor(null); setHistory([]); setRefresh(value => value + 1);
  }, [latestRevision]);
  useEffect(() => {
    const current = ++generation.current, abort = new AbortController(); setLoading(true); setError("");
    void api<Page>(`/api/client/projects/${project}/${kind}${cursor ? `?before=${encodeURIComponent(cursor)}` : ""}`, { signal: abort.signal }).then(result => {
      if (current !== generation.current) return; setPage(result);
      if (moveFocus.current) { heading.current?.focus(); moveFocus.current = false; }
    }).catch((failure: unknown) => {
      if (current !== generation.current || failure instanceof DOMException && failure.name === "AbortError") return;
      setError((failure as Error).message); setPage(null); if (failure instanceof ApiError) { if (failure.status === 401) onExpired(); else if ([403,404].includes(failure.status)) onUnavailable(); }
    }).finally(() => { if (current === generation.current) setLoading(false); });
    return () => { ++generation.current; abort.abort(); };
  }, [project, kind, cursor, revision, refresh]);
  function move(next: string | null, direction: "older" | "newer" | "latest") {
    if (loading || disabled) return; moveFocus.current = true;
    if (direction === "older") setHistory(values => [...values.slice(-99), cursor]);
    else if (direction === "newer") setHistory(values => values.slice(0, -1));
    else setHistory([]);
    setCursor(next); if (next === cursor) setRefresh(value => value + 1);
  }
  const title = kind === "conversation" ? "Conversation" : "Project history";
  return <section className="client-update-feed" aria-label={title}><h3 ref={heading} tabIndex={-1}>{title}</h3><p>Newest first · up to 50 updates per page{cursor ? " · viewing earlier updates" : ""}.</p><OwnerError message={error} />
    <div className="team-history-nav"><button className="admin-secondary" disabled={disabled || loading} onClick={() => { moveFocus.current = true; setRefresh(value => value + 1); }}>Refresh this page</button><button className="admin-secondary" disabled={disabled || loading || !history.length} onClick={() => move(history[history.length - 1], "newer")}>Newer updates</button><button className="admin-secondary" disabled={disabled || loading || !page?.nextCursor} onClick={() => { if (page?.nextCursor) move(page.nextCursor, "older"); }}>Older updates</button><button className="admin-text-button" disabled={disabled || loading || cursor === null} onClick={() => move(null, "latest")}>Latest updates</button></div>
    {loading ? <p role="status">Loading {title.toLowerCase()}…</p> : page && !page.items.length ? <p>No updates on this page.</p> : <ol className="support-message-list">{page?.items.map(row => <li key={`${"direction" in row ? row.direction : "EVENT"}:${row.id}`}>
      {"direction" in row && <strong>{row.direction === "TEAM" ? "Crystal Powers" : row.author}</strong>}<time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString("en-GB")}</time><p>{"body" in row ? row.body : row.detail}</p>
    </li>)}</ol>}
  </section>;
}
