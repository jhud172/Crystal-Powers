import { useEffect } from "react";

export function usePageMetadata(title: string, description: string, path?: string) {
  useEffect(() => {
    document.title = title;
    const set = (selector: string, content: string) => document.querySelector(selector)?.setAttribute("content", content);
    set('meta[name="description"]', description); set('meta[property="og:title"]', title); set('meta[property="og:description"]', description);
    set('meta[name="twitter:title"]', title); set('meta[name="twitter:description"]', description);
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (path && canonical) { canonical.href = new URL(path, canonical.href || location.origin).href; set('meta[property="og:url"]', canonical.href); }
  }, [title, description, path]);
}
