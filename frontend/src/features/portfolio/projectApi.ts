import { useCallback, useEffect, useState } from "react";

export type ProjectContent = {
  title: string; category: "WEBSITE" | "APP" | "SYSTEM"; summary: string;
  overview: string; approach: string; outcome: string; liveUrl: string; technologies: string[];
  displayDevice: "laptop" | "monitor" | "phone"; coverMediaId: string | null; coverAlt: string;
  gallery: { mediaId: string; alt: string }[];
};
export type PublicProject = { id: string; slug: string; featured: boolean; sortOrder: number; content: ProjectContent };
export type ProjectDraft = PublicProject & { version: number; publishedVersion: number | null; archived: boolean; updatedAt: string };
export type ProjectImage = { id: string; bytes: number; width: number; height: number };
export const categoryLabel = { WEBSITE: "Website", APP: "App", SYSTEM: "Bespoke system" };
export const imageUrl = (id: string, privateImage = false) => `/api/${privateImage ? "admin/" : ""}media/${encodeURIComponent(id)}`;
export class ApiError extends Error {
  constructor(public status: number, message: string, public fieldErrors: Record<string, string> = {}) { super(message); }
}

let csrf: { token: string; headerName: string } | null = null;
export function clearCsrf() { csrf = null; }
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const mutation = options.method && !["GET", "HEAD"].includes(options.method);
  if (mutation) {
    if (!csrf) csrf = await api("/api/admin/auth/csrf");
    headers.set(csrf!.headerName, csrf!.token);
    if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  }
  let response: Response;
  try { response = await fetch(path, { ...options, headers, credentials: "same-origin", cache: "no-store" }); }
  catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "The connection was interrupted. Your changes have not been confirmed. Please try again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) clearCsrf();
    if (response.status === 403 && path.startsWith("/api/admin/") && !path.startsWith("/api/admin/auth/")) {
      const session = await api<{ authenticated: boolean }>("/api/admin/auth/session");
      if (!session.authenticated) throw new ApiError(401, "Your session has ended. Sign in again to keep editing.");
      throw new ApiError(403, "The security token changed. Your edits are still here; try the action again.");
    }
    throw new ApiError(response.status, body?.message ?? "The service is temporarily unavailable. Please try again.", body?.fieldErrors);
  }
  return body as T;
}

/** Revalidate while visible so owner publication changes appear without a deployment. */
export function usePublishedProjects(slug?: string) {
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let live = true;
    const abort = new AbortController();
    setLoading(true);
    const fetchProjects = async () => {
      try {
        const result = await api<PublicProject[] | PublicProject>(slug ? `/api/projects/${encodeURIComponent(slug)}` : "/api/projects", { signal: abort.signal });
        if (live) { setProjects(Array.isArray(result) ? result : [result]); setError(null); }
      } catch (failure) {
        if (live && !(failure instanceof DOMException && failure.name === "AbortError")) { setProjects([]); setError(failure as ApiError); }
      } finally { if (live) setLoading(false); }
    };
    void fetchProjects();
    const revalidate = () => { if (document.visibilityState === "visible") void fetchProjects(); };
    const timer = window.setInterval(revalidate, 30_000);
    document.addEventListener("visibilitychange", revalidate);
    return () => { live = false; abort.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", revalidate); };
  }, [slug, revision]);
  return { projects, loading, error, refresh };
}
