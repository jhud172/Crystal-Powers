import { ReactNode } from "react";

type PageHeroProps = {
  eyebrow: string;
  signal: string;
  title: string;
  body: string;
  actions?: ReactNode;
  visual?: ReactNode;
  className?: string;
};

export function PageHero({ eyebrow, signal, title, body, actions, visual, className = "" }: PageHeroProps) {
  return (
    <section className={`page-scene page-scene-secondary ${className}`.trim()}>
      <div className="page-scene-shell">
        <div className="page-scene-grid">
          <div className="page-scene-copy" data-reveal="up">
            <div className="scene-meta-row">
              <span className="eyebrow">{eyebrow}</span>
              <span className="scene-signal-pill">{signal}</span>
            </div>
            <h1 className="page-scene-title">{title}</h1>
            <p className="page-scene-body">{body}</p>
            {actions ? <div className="scene-action-row">{actions}</div> : null}
          </div>
          {visual ? <div className="scene-visual-column" data-reveal="left">{visual}</div> : null}
        </div>
      </div>
    </section>
  );
}
