import { useEffect, useState } from "react";

type Chapter = { id: string; label: string };

/** Native section links keep scrolling, history and keyboard behaviour predictable. */
export function ChapterLinks({ chapters, label = "On this page" }: { chapters: Chapter[]; label?: string }) {
  const [current, setCurrent] = useState("");
  const key = chapters.map(chapter => chapter.id).join("|");
  useEffect(() => {
    setCurrent("");
    if (typeof IntersectionObserver !== "function") return;
    const observer = new IntersectionObserver(entries => {
      const arriving = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (arriving[0]) setCurrent(arriving[0].target.id);
    }, { rootMargin: "-15% 0px -55% 0px" });
    for (const id of key.split("|")) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, [key]);
  return <nav className="chapter-links" aria-label={label}><span className="chapter-links-label">{label}</span><div>{chapters.map((chapter, index) => <a key={chapter.id} href={`#${chapter.id}`} aria-current={current === chapter.id ? "location" : undefined}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{chapter.label}</a>)}</div></nav>;
}
