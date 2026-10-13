import { useEffect } from "react";

export function usePageMetadata(title: string, description: string, path?: string, image = "/renders/liquid-light/hero.png", metadataDocument = document) {
  useEffect(() => {
    metadataDocument.title = title;
    const set = (selector: string, content: string) => metadataDocument.querySelector(selector)?.setAttribute("content", content);
    set('meta[name="description"]', description); set('meta[property="og:title"]', title); set('meta[property="og:description"]', description);
    set('meta[name="twitter:title"]', title); set('meta[name="twitter:description"]', description);
    const canonical = metadataDocument.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (path && canonical) { canonical.href = new URL(path, canonical.href || location.origin).href; set('meta[property="og:url"]', canonical.href); }
    const imageAddress = new URL(image, canonical?.href || location.href).href;
    set('meta[property="og:image"]', imageAddress); set('meta[name="twitter:image"]', imageAddress);
  }, [title, description, path, image, metadataDocument]);
}
