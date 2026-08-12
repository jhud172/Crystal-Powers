import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import "../styles/pages/birthday/post-birthday.css";

const releaseDate = new Date("2026-11-19T00:00:00Z").getTime();

type Chapter = "afterglow" | "secured" | "runway" | "destination";

type Countdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  launched: boolean;
};

function getCountdown(): Countdown {
  const remaining = Math.max(0, releaseDate - Date.now());
  const totalSeconds = Math.floor(remaining / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    launched: remaining === 0
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function PostBirthdayMission() {
  const reducedMotion = usePrefersReducedMotion();
  const [activeChapter, setActiveChapter] = useState<Chapter>("afterglow");
  const [driveMode, setDriveMode] = useState(false);
  const [countdown, setCountdown] = useState<Countdown>(getCountdown);
  const [announcement, setAnnouncement] = useState("");
  const experienceRef = useRef<HTMLElement>(null);
  const securedRef = useRef<HTMLElement>(null);

  const beginDrive = () => {
    setDriveMode(true);
    setAnnouncement("Night drive started. Moving to the secured purchase record.");
    navigator.vibrate?.([12, 24, 18]);
    securedRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start"
    });
  };

  const toggleDrive = () => {
    setDriveMode((current) => {
      const next = !current;
      setAnnouncement(next ? "Night drive lights switched on." : "Night drive lights switched off.");
      navigator.vibrate?.(12);
      return next;
    });
  };

  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const originalTitle = document.title;
    const originalLang = html.lang;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const themeColour = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const existingColourScheme = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
    const colourScheme = existingColourScheme ?? document.createElement("meta");
    const originalDescription = description?.content ?? "";
    const originalViewport = viewport?.content ?? "";
    const originalThemeColour = themeColour?.content ?? "";
    const originalColourScheme = existingColourScheme?.content ?? "";
    const robots = document.createElement("meta");

    document.title = "Mission VI - The Wait Begins";
    html.lang = "en-GB";
    html.classList.add("after-route-active-root");
    body.classList.add("after-route-active");
    description?.setAttribute("content", "Dad's Grand Theft Auto VI purchase is secured. The countdown to launch continues.");
    viewport?.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover");
    themeColour?.setAttribute("content", "#050809");
    colourScheme.name = "color-scheme";
    colourScheme.content = "only dark";
    if (!existingColourScheme) {
      document.head.appendChild(colourScheme);
    }
    robots.name = "robots";
    robots.content = "noindex, nofollow, noarchive";
    document.head.appendChild(robots);

    return () => {
      document.title = originalTitle;
      html.lang = originalLang;
      html.classList.remove("after-route-active-root");
      html.style.removeProperty("--after-scroll");
      html.style.removeProperty("--after-depth");
      body.classList.remove("after-route-active");
      description?.setAttribute("content", originalDescription);
      viewport?.setAttribute("content", originalViewport);
      themeColour?.setAttribute("content", originalThemeColour);
      if (existingColourScheme) {
        colourScheme.content = originalColourScheme;
      } else {
        colourScheme.remove();
      }
      robots.remove();
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setCountdown(getCountdown()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const experience = experienceRef.current;
    if (!experience) {
      return;
    }

    const revealTargets = experience.querySelectorAll<HTMLElement>("[data-after-reveal]");
    const sections = experience.querySelectorAll<HTMLElement>("[data-after-chapter]");
    const revealObserver = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")),
      { threshold: 0.16, rootMargin: "0px 0px -8%" }
    );
    const chapterObserver = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];
        const chapter = (current?.target as HTMLElement | undefined)?.dataset.afterChapter as Chapter | undefined;
        if (chapter) {
          setActiveChapter(chapter);
        }
      },
      { rootMargin: "-28% 0px -52%", threshold: [0, 0.18, 0.48] }
    );

    revealTargets.forEach((target) => revealObserver.observe(target));
    sections.forEach((section) => chapterObserver.observe(section));

    return () => {
      revealObserver.disconnect();
      chapterObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const html = document.documentElement;
    let frame = 0;
    const updateScroll = () => {
      if (frame) {
        return;
      }
      frame = window.requestAnimationFrame(() => {
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
        html.style.setProperty("--after-scroll", progress.toFixed(4));
        html.style.setProperty("--after-depth", `${Math.min(90, window.scrollY * 0.045).toFixed(1)}px`);
        frame = 0;
      });
    };

    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateScroll);
      window.cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  return (
    <>
      <a className="after-skip-link" href="#after-main">Skip to mission status</a>
      <main
        id="after-main"
        ref={experienceRef}
        className={`after-experience${driveMode ? " is-driving" : ""}`}
        data-active-chapter={activeChapter}
      >
        <div className="after-progress" aria-hidden="true"><i /></div>
        <div className="after-road-light" aria-hidden="true"><i /><i /><i /></div>

        <nav className="after-nav" aria-label="Mission progress">
          <a className="after-nav__mark" href="#afterglow" aria-label="Mission VI start"><span>VI</span></a>
          <p><span>Day</span><strong>+01</strong></p>
          <ol>
            {([
              ["afterglow", "afterglow", "Afterglow"],
              ["secured", "secured", "Secured"],
              ["runway", "runway", "Runway"],
              ["destination", "destination", "Destination"]
            ] as const).map(([chapter, target, label]) => (
              <li key={chapter}>
                <a href={`#${target}`} aria-current={activeChapter === chapter ? "step" : undefined}>
                  <i aria-hidden="true" /><span>{label}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <section id="afterglow" className="after-hero" data-after-chapter="afterglow" aria-labelledby="after-title">
          <div className="after-hero__art" aria-hidden="true" />
          <div className="after-hero__horizon" aria-hidden="true"><i /></div>
          <div className="after-hero__copy">
            <p className="after-eyebrow"><span>12.08.2026</span> The day after</p>
            <h1 id="after-title"><span>The wait</span><em>begins.</em></h1>
            <p className="after-hero__lead">The birthday mission is complete. Your copy is secured. Now there is only one road left: the one to launch day.</p>
            <div className="after-hero__actions">
              <button className="after-drive-button" type="button" onClick={beginDrive}>
                <span aria-hidden="true"><i /><i /></span>
                Start the night drive
              </button>
              <a href="#secured">View mission status <i aria-hidden="true">↘</i></a>
            </div>
          </div>
          <div className="after-hero__stamp" aria-hidden="true"><span>Mission</span><strong>Active</strong><small>Account linked</small></div>
          <a className="after-scroll-cue" href="#secured"><span>Continue</span><i aria-hidden="true" /></a>
        </section>

        <section
          id="secured"
          ref={securedRef}
          className="after-secured"
          data-after-chapter="secured"
          aria-labelledby="secured-title"
        >
          <div className="after-secured__number" aria-hidden="true">01</div>
          <div className="after-secured__copy" data-after-reveal>
            <p className="after-eyebrow"><span>Verified</span> Nothing left to claim</p>
            <h2 id="secured-title">Already<br /><em>yours.</em></h2>
            <p>Grand Theft Auto VI is purchased directly on your account. Everything is linked, with no extra step when release day arrives.</p>
          </div>
          <dl className="after-ledger" data-after-reveal aria-label="Mission purchase status">
            <div><dt>Asset</dt><dd>Grand Theft Auto VI</dd><span>01</span></div>
            <div><dt>Owner</dt><dd>Dad</dd><span>02</span></div>
            <div><dt>Delivery</dt><dd>Linked to your account</dd><span>03</span></div>
            <div><dt>State</dt><dd><i aria-hidden="true" /> Purchase complete</dd><span>04</span></div>
          </dl>
          <a className="after-section-link" href="#runway"><small>Next checkpoint</small><strong>Enter the launch runway</strong><i aria-hidden="true">↓</i></a>
        </section>

        <section id="runway" className="after-runway" data-after-chapter="runway" aria-labelledby="runway-title">
          <div className="after-runway__sky" aria-hidden="true" />
          <div className="after-runway__road" aria-hidden="true"><i /><i /></div>
          <div className="after-runway__heading" data-after-reveal>
            <p className="after-eyebrow"><span>Checkpoint 02</span> Live launch runway</p>
            <h2 id="runway-title">Next stop:<br /><em>Vice City.</em></h2>
          </div>
          <div className="after-countdown" data-after-reveal aria-live="polite" aria-atomic="true">
            <div><span>Days</span><strong>{countdown.days}</strong></div>
            <div><span>Hours</span><strong>{pad(countdown.hours)}</strong></div>
            <div><span>Minutes</span><strong>{pad(countdown.minutes)}</strong></div>
            <div><span>Seconds</span><strong>{pad(countdown.seconds)}</strong></div>
          </div>
          <p className="after-runway__note" data-after-reveal>
            {countdown.launched ? "The runway is open. Your mission is ready to play." : "Official release target: 19 November 2026."}
          </p>
          <a className="after-section-link after-section-link--light" href="#destination"><small>Final checkpoint</small><strong>A message for Dad</strong><i aria-hidden="true">↓</i></a>
        </section>

        <section id="destination" className="after-destination" data-after-chapter="destination" aria-labelledby="destination-title">
          <div className="after-destination__art" aria-hidden="true" />
          <div className="after-destination__copy" data-after-reveal>
            <p className="after-eyebrow"><span>Destination set</span> Whenever launch day comes</p>
            <h2 id="destination-title">See you in<br /><em>Vice City, Dad.</em></h2>
            <p>The candles are out, but the gift is only getting closer. Your copy is waiting, the countdown is running, and the first drive is still yours.</p>
            <button className="after-light-button" type="button" onClick={toggleDrive} aria-pressed={driveMode}>
              <span aria-hidden="true" />
              {driveMode ? "Switch off night drive" : "Switch on night drive"}
            </button>
          </div>
          <footer className="after-footer"><strong>Mission VI</strong><span>Purchase complete</span><span>For Dad</span></footer>
        </section>

        <div className="after-live-region" aria-live="polite" aria-atomic="true">{announcement}</div>
      </main>
    </>
  );
}
