import {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import "../styles/pages/birthday/mission-vi.css";

const releaseDate = new Date("2026-11-19T00:00:00Z").getTime();

type IntroPhase = "active" | "leaving" | "hidden";
type TakeoverPhase = "active" | "leaving" | "hidden";
type Chapter = "opening" | "promise" | "countdown" | "finale";

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

function addTimer(timers: number[], callback: () => void, delay: number) {
  const timer = window.setTimeout(callback, delay);
  timers.push(timer);
  return timer;
}

function clearTimers(timers: number[]) {
  timers.forEach((timer) => window.clearTimeout(timer));
  timers.length = 0;
}

export default function BirthdayMission() {
  const reducedMotion = usePrefersReducedMotion();
  const [introPhase, setIntroPhase] = useState<IntroPhase>("active");
  const [takeoverPhase, setTakeoverPhase] = useState<TakeoverPhase>("hidden");
  const [unlocked, setUnlocked] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [activeChapter, setActiveChapter] = useState<Chapter>("opening");
  const [countdown, setCountdown] = useState<Countdown>(getCountdown);
  const [announcement, setAnnouncement] = useState("");

  const experienceRef = useRef<HTMLElement>(null);
  const holdButtonRef = useRef<HTMLButtonElement>(null);
  const promiseRef = useRef<HTMLElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);
  const fireworksRef = useRef<HTMLDivElement>(null);
  const holdFrameRef = useRef(0);
  const holdStartedAtRef = useRef(0);
  const unlockedRef = useRef(false);
  const introTimersRef = useRef<number[]>([]);
  const missionTimersRef = useRef<number[]>([]);

  const updateHoldProgress = useCallback((progress: number) => {
    holdButtonRef.current?.style.setProperty(
      "--birthday-hold-progress",
      Math.min(1, Math.max(0, progress)).toFixed(3)
    );
  }, []);

  const playIntro = useCallback(() => {
    clearTimers(introTimersRef.current);
    setIntroPhase("active");
    document.body.classList.add("birthday-is-locked");
    document.documentElement.classList.remove("birthday-entered");
    window.scrollTo({ top: 0, behavior: "auto" });

    addTimer(
      introTimersRef.current,
      () => setIntroPhase("leaving"),
      reducedMotion ? 40 : 1250
    );
    addTimer(
      introTimersRef.current,
      () => {
        setIntroPhase("hidden");
        document.body.classList.remove("birthday-is-locked");
        document.documentElement.classList.add("birthday-entered");
        holdButtonRef.current?.focus({ preventScroll: true });
      },
      reducedMotion ? 80 : 2120
    );
  }, [reducedMotion]);

  const burstConfetti = useCallback((pieceCount = 72) => {
    if (!confettiRef.current || reducedMotion) {
      return;
    }

    const colours = ["#ff5f6d", "#ff3fa4", "#7cecff", "#fff3dc", "#ffad78"];
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < pieceCount; index += 1) {
      const piece = document.createElement("i");
      const width = 5 + Math.random() * 8;
      piece.style.setProperty("--confetti-x", `${Math.random() * 100}%`);
      piece.style.setProperty("--confetti-width", `${width}px`);
      piece.style.setProperty("--confetti-height", `${width * (0.45 + Math.random())}px`);
      piece.style.setProperty("--confetti-colour", colours[index % colours.length]);
      piece.style.setProperty("--confetti-duration", `${2.2 + Math.random() * 2.2}s`);
      piece.style.setProperty("--confetti-delay", `${Math.random() * 0.45}s`);
      piece.style.setProperty("--confetti-drift", `${-120 + Math.random() * 240}px`);
      piece.style.setProperty("--confetti-rotation", `${Math.random() * 360}deg`);
      fragment.appendChild(piece);
    }

    confettiRef.current.replaceChildren(fragment);
    addTimer(missionTimersRef.current, () => confettiRef.current?.replaceChildren(), 5200);
  }, [reducedMotion]);

  const launchFireworks = useCallback(() => {
    if (!fireworksRef.current || reducedMotion) {
      return;
    }

    const colours = ["#ff5f6d", "#ff3fa4", "#7cecff", "#fff3dc", "#ffad78"];
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < 9; index += 1) {
      const firework = document.createElement("i");
      firework.style.setProperty("--firework-x", `${12 + Math.random() * 76}%`);
      firework.style.setProperty("--firework-y", `${8 + Math.random() * 48}%`);
      firework.style.setProperty("--firework-colour", colours[index % colours.length]);
      firework.style.setProperty("--firework-delay", `${Math.random() * 0.85}s`);
      fragment.appendChild(firework);
    }

    fireworksRef.current.replaceChildren(fragment);
    addTimer(missionTimersRef.current, () => fireworksRef.current?.replaceChildren(), 2600);
  }, [reducedMotion]);

  const completeUnlock = useCallback(() => {
    if (unlockedRef.current) {
      return;
    }

    unlockedRef.current = true;
    setUnlocked(true);
    window.cancelAnimationFrame(holdFrameRef.current);
    holdFrameRef.current = 0;
    updateHoldProgress(1);
    holdButtonRef.current?.classList.remove("is-holding");
    setIsHolding(false);
    setAnnouncement("Mission unlocked. Your GTA VI birthday promise is ready.");
    navigator.vibrate?.([18, 42, 38]);

    const holdTime = reducedMotion ? 180 : 1480;
    const totalTime = reducedMotion ? 340 : 2010;
    setTakeoverPhase("active");
    addTimer(missionTimersRef.current, () => setTakeoverPhase("leaving"), holdTime);
    addTimer(missionTimersRef.current, () => setTakeoverPhase("hidden"), totalTime);
    addTimer(missionTimersRef.current, () => burstConfetti(), Math.max(0, totalTime - 460));
    addTimer(
      missionTimersRef.current,
      () => promiseRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" }),
      totalTime
    );
  }, [burstConfetti, reducedMotion, updateHoldProgress]);

  const cancelHold = useCallback(() => {
    if (unlockedRef.current) {
      return;
    }

    window.cancelAnimationFrame(holdFrameRef.current);
    holdFrameRef.current = 0;
    holdStartedAtRef.current = 0;
    holdButtonRef.current?.classList.remove("is-holding");
    setIsHolding(false);
    updateHoldProgress(0);
  }, [updateHoldProgress]);

  const startHold = useCallback(() => {
    if (unlockedRef.current || holdFrameRef.current) {
      return;
    }

    const holdDuration = reducedMotion ? 250 : 1250;
    holdButtonRef.current?.classList.add("is-holding");
    setIsHolding(true);
    navigator.vibrate?.(12);

    const advance = (timestamp: number) => {
      if (!holdStartedAtRef.current) {
        holdStartedAtRef.current = timestamp;
      }

      const progress = (timestamp - holdStartedAtRef.current) / holdDuration;
      updateHoldProgress(progress);

      if (progress >= 1) {
        completeUnlock();
        return;
      }

      holdFrameRef.current = window.requestAnimationFrame(advance);
    };

    holdFrameRef.current = window.requestAnimationFrame(advance);
  }, [completeUnlock, reducedMotion, updateHoldProgress]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can be unavailable for synthetic or interrupted events.
    }
    startHold();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    startHold();
  };

  const handleKeyUp = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      cancelHold();
    }
  };

  const handleFireworks = () => {
    launchFireworks();
    burstConfetti(42);
    navigator.vibrate?.([14, 34, 22]);
    setAnnouncement("Birthday fireworks launched.");
  };

  const handleReplay = () => {
    clearTimers(missionTimersRef.current);
    unlockedRef.current = false;
    setUnlocked(false);
    setTakeoverPhase("hidden");
    setIsHolding(false);
    setAnnouncement("");
    setActiveChapter("opening");
    fireworksRef.current?.replaceChildren();
    confettiRef.current?.replaceChildren();
    holdStartedAtRef.current = 0;
    updateHoldProgress(0);
    playIntro();
  };

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const originalTitle = document.title;
    const originalLang = html.lang;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const themeColour = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const originalDescription = description?.content ?? "";
    const originalViewport = viewport?.content ?? "";
    const originalThemeColour = themeColour?.content ?? "";
    const robots = document.createElement("meta");

    document.title = "Mission VI - Happy Birthday Dad";
    html.lang = "en-GB";
    html.classList.add("birthday-route-active-root", "birthday-ready");
    body.classList.add("birthday-route-active");
    description?.setAttribute("content", "A private birthday mission and a promise for the launch of Grand Theft Auto VI.");
    viewport?.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover");
    themeColour?.setAttribute("content", "#09071c");
    robots.name = "robots";
    robots.content = "noindex, nofollow, noarchive";
    document.head.appendChild(robots);

    const introFrame = window.requestAnimationFrame(playIntro);

    return () => {
      window.cancelAnimationFrame(introFrame);
      window.cancelAnimationFrame(holdFrameRef.current);
      clearTimers(introTimersRef.current);
      clearTimers(missionTimersRef.current);
      document.title = originalTitle;
      html.lang = originalLang;
      html.classList.remove("birthday-route-active-root", "birthday-ready", "birthday-entered");
      html.style.removeProperty("--birthday-pointer-x");
      html.style.removeProperty("--birthday-pointer-y");
      html.style.removeProperty("--birthday-scroll-depth");
      body.classList.remove("birthday-route-active", "birthday-is-locked", "birthday-is-celebrating");
      description?.setAttribute("content", originalDescription);
      viewport?.setAttribute("content", originalViewport);
      themeColour?.setAttribute("content", originalThemeColour);
      robots.remove();
    };
  }, [playIntro]);

  useEffect(() => {
    document.body.classList.toggle("birthday-is-celebrating", takeoverPhase !== "hidden");
  }, [takeoverPhase]);

  useEffect(() => {
    const timer = window.setInterval(() => setCountdown(getCountdown()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const experience = experienceRef.current;
    if (!experience) {
      return;
    }

    const revealSections = experience.querySelectorAll<HTMLElement>(
      ".birthday-promise, .birthday-countdown, .birthday-finale"
    );
    const chapterSections = experience.querySelectorAll<HTMLElement>("[data-birthday-chapter]");
    const revealObserver = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")),
      { threshold: 0.18 }
    );
    const chapterObserver = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];
        const chapter = (current?.target as HTMLElement | undefined)?.dataset.birthdayChapter as Chapter | undefined;
        if (chapter) {
          setActiveChapter(chapter);
        }
      },
      { rootMargin: "-30% 0px -50%", threshold: [0, 0.15, 0.45] }
    );

    revealSections.forEach((section) => revealObserver.observe(section));
    chapterSections.forEach((section) => chapterObserver.observe(section));

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
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    let pointerFrame = 0;
    let scrollFrame = 0;

    const handlePointerMove = (event: PointerEvent) => {
      if (!finePointer || pointerFrame) {
        return;
      }
      pointerFrame = window.requestAnimationFrame(() => {
        html.style.setProperty("--birthday-pointer-x", ((event.clientX / window.innerWidth) - 0.5).toFixed(3));
        html.style.setProperty("--birthday-pointer-y", ((event.clientY / window.innerHeight) - 0.5).toFixed(3));
        pointerFrame = 0;
      });
    };

    const handleScroll = () => {
      if (scrollFrame) {
        return;
      }
      scrollFrame = window.requestAnimationFrame(() => {
        const depth = Math.min(window.scrollY, window.innerHeight) * 0.055;
        html.style.setProperty("--birthday-scroll-depth", `${depth.toFixed(1)}px`);
        scrollFrame = 0;
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("scroll", handleScroll);
      window.cancelAnimationFrame(pointerFrame);
      window.cancelAnimationFrame(scrollFrame);
    };
  }, [reducedMotion]);

  return (
    <>
      <a className="birthday-skip-link" href="#birthday-main">Skip to your birthday mission</a>

      <div
        className={`birthday-intro${introPhase === "leaving" ? " is-leaving" : ""}`}
        aria-hidden="true"
        hidden={introPhase === "hidden"}
      >
        <div className="birthday-intro__shutter birthday-intro__shutter--top" />
        <div className="birthday-intro__shutter birthday-intro__shutter--bottom" />
        <div className="birthday-intro__signal">
          <span className="birthday-intro__eyebrow">Private transmission</span>
          <strong>MISSION <i>VI</i></strong>
          <span className="birthday-intro__loading"><b /></span>
        </div>
      </div>

      <div
        className={`birthday-unlock-takeover${takeoverPhase === "active" ? " is-active" : ""}${takeoverPhase === "leaving" ? " is-active is-leaving" : ""}`}
        aria-hidden={takeoverPhase === "hidden"}
        hidden={takeoverPhase === "hidden"}
      >
        <div className="birthday-unlock-takeover__rings" aria-hidden="true"><i /><i /><i /></div>
        <div className="birthday-unlock-takeover__content">
          <span>Mission accepted</span>
          <strong>Gift<br /><em>unlocked.</em></strong>
          <p>GTA VI <i /> One copy <i /> For Dad</p>
        </div>
        <div className="birthday-unlock-takeover__ticker" aria-hidden="true">
          <span>IOU verified / No expiry / Launch day / Dad only /</span>
          <span>IOU verified / No expiry / Launch day / Dad only /</span>
        </div>
      </div>

      <main
        id="birthday-main"
        ref={experienceRef}
        className={`birthday-experience${unlocked ? " is-unlocked" : ""}`}
        data-state={unlocked ? "unlocked" : "locked"}
      >
        <nav className="birthday-chapter-rail" aria-label="Birthday mission chapters">
          {([
            ["opening", "birthday-opening", "Opening"],
            ["promise", "birthday-promise", "The promise"],
            ["countdown", "birthday-countdown", "Countdown"],
            ["finale", "birthday-finale", "Birthday message"]
          ] as const).map(([chapter, target, label]) => (
            <a key={chapter} href={`#${target}`} aria-current={activeChapter === chapter ? "true" : undefined}>
              <span>{label}</span>
            </a>
          ))}
        </nav>

        <section id="birthday-opening" className="birthday-hero" data-birthday-chapter="opening" aria-labelledby="birthday-title">
          <div className="birthday-hero__art" aria-hidden="true" />
          <div className="birthday-hero__wash" aria-hidden="true" />
          <div className="birthday-hero__grain" aria-hidden="true" />
          <div className="birthday-hero__aurora" aria-hidden="true" />

          <header className="birthday-masthead">
            <span className="birthday-masthead__mark" aria-hidden="true">VI</span>
            <p>For Dad <span /> Birthday transmission</p>
            <span className="birthday-masthead__status"><i /> Gift secured</span>
          </header>

          <div className="birthday-hero__content">
            <p className="birthday-kicker">Your next big adventure is secured.</p>
            <h1 id="birthday-title"><span>Mission</span><em>VI</em></h1>
            <p className="birthday-hero__lead">
              Happy Birthday, Dad. This is your official IOU for <strong>Grand Theft Auto VI.</strong>
            </p>

            <div className="birthday-unlock">
              <button
                ref={holdButtonRef}
                className="birthday-hold-button"
                type="button"
                aria-describedby="hold-help"
                onPointerDown={handlePointerDown}
                onPointerUp={cancelHold}
                onPointerCancel={cancelHold}
                onLostPointerCapture={cancelHold}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                onBlur={cancelHold}
                onContextMenu={(event) => event.preventDefault()}
              >
                <span className="birthday-hold-button__progress" aria-hidden="true" />
                <span className="birthday-hold-button__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M8 11V8a4 4 0 0 1 8 0v3M6.5 11.5h11v9h-11z" /></svg>
                </span>
                <span className="birthday-hold-button__copy">
                  <strong>{unlocked ? "Mission unlocked" : "Hold to unlock"}</strong>
                  <small>{unlocked ? "Your GTA VI promise is ready" : isHolding ? "Keep holding - almost there" : "Press and hold your birthday mission"}</small>
                </span>
                <span className="birthday-hold-button__chevron" aria-hidden="true" />
              </button>
              <p id="hold-help" className="birthday-unlock__help">Hold the button for a moment. Keyboard: hold Enter or Space.</p>
            </div>
          </div>

          <div className="birthday-hero__release"><span>Current official launch</span><strong>19.11.2026</strong></div>
          <a className="birthday-scroll-cue" href="#birthday-promise" aria-label="Continue to the birthday promise">
            <span>Open the promise</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </a>
        </section>

        <section
          id="birthday-promise"
          ref={promiseRef}
          className="birthday-promise"
          data-birthday-chapter="promise"
          aria-labelledby="promise-title"
        >
          <div className="birthday-promise__glow" aria-hidden="true" />
          <div className="birthday-promise__layout">
            <div className="birthday-promise__ticket-meta" aria-hidden="true"><span>Mission pass / 006</span><span>Non-expiring</span></div>
            <div className="birthday-promise__number" aria-hidden="true"><span>0</span><span>6</span></div>
            <div className="birthday-promise__copy">
              <p className="birthday-kicker birthday-kicker--dark">IOU verified <span aria-hidden="true">✓</span></p>
              <h2 id="promise-title">One copy.<br /><em>All yours.</em></h2>
              <p>When GTA VI releases, we will buy your copy in the best format for you - a download code or a direct purchase, whichever works best.</p>
            </div>
            <dl className="birthday-terms" aria-label="Your birthday gift details">
              <div><dt>The gift</dt><dd>Grand Theft Auto VI</dd></div>
              <div><dt>How you receive it</dt><dd>Code or direct purchase</dd></div>
              <div><dt>When</dt><dd>From launch day</dd></div>
              <div><dt>Fine print</dt><dd>No chores. No expiry. Dad only.</dd></div>
            </dl>
          </div>
        </section>

        <section id="birthday-countdown" className="birthday-countdown" data-birthday-chapter="countdown" aria-labelledby="countdown-title">
          <div className="birthday-countdown__line" aria-hidden="true" />
          <div className="birthday-countdown__intro">
            <p className="birthday-kicker">Until the adventure begins</p>
            <h2 id="countdown-title">The wait is part of the mission.</h2>
          </div>
          <div className="birthday-countdown__clock" aria-live="polite" aria-atomic="true">
            <div><strong>{countdown.days}</strong><span>Days</span></div>
            <div><strong>{pad(countdown.hours)}</strong><span>Hours</span></div>
            <div><strong>{pad(countdown.minutes)}</strong><span>Mins</span></div>
            <div><strong>{pad(countdown.seconds)}</strong><span>Secs</span></div>
          </div>
          <p className="birthday-countdown__note">
            {countdown.launched ? "Launch day has arrived. Time to redeem the mission." : "Based on the current official release date: 19 November 2026."}
          </p>
        </section>

        <section id="birthday-finale" className="birthday-finale" data-birthday-chapter="finale" aria-labelledby="finale-title">
          <div className="birthday-finale__art" aria-hidden="true" />
          <div ref={fireworksRef} className="birthday-finale__fireworks" aria-hidden="true" />
          <div className="birthday-finale__content">
            <p className="birthday-kicker">A message from us</p>
            <h2 id="finale-title">Happy Birthday,<br /><em>Dad.</em></h2>
            <p>We wanted to give you something worth waiting for. Your copy is promised, your mission is active, and the first drive is yours.</p>
            <div className="birthday-finale__actions">
              <button className="birthday-fireworks-button" type="button" onClick={handleFireworks}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v4M4.9 4.9l2.8 2.8M2 12h4m10 0h6M4.9 19.1l2.8-2.8M19.1 4.9l-2.8 2.8M12 12l2.7 8.3L12 18.7l-2.7 1.6z" /></svg>
                Light up the sky
              </button>
              <button className="birthday-replay" type="button" onClick={handleReplay}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6" /></svg>
                Replay
              </button>
            </div>
          </div>
          <footer className="birthday-footer"><span>Mission VI</span><span>Made especially for Dad</span></footer>
        </section>

        <div className="birthday-live-region" aria-live="assertive" aria-atomic="true">{announcement}</div>
        <div ref={confettiRef} className="birthday-confetti" aria-hidden="true" />
      </main>
    </>
  );
}
