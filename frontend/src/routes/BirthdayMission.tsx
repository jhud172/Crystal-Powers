import {
  CSSProperties,
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
type TakeoverPhase = "generating" | "holding" | "confirmed" | "leaving" | "hidden";
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
  const [isDragging, setIsDragging] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationLabel, setGenerationLabel] = useState("Connecting to Dad's account");
  const [finaliseSeconds, setFinaliseSeconds] = useState(3);
  const [activeChapter, setActiveChapter] = useState<Chapter>("opening");
  const [countdown, setCountdown] = useState<Countdown>(getCountdown);
  const [announcement, setAnnouncement] = useState("");

  const experienceRef = useRef<HTMLElement>(null);
  const dragControlRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLButtonElement>(null);
  const promiseRef = useRef<HTMLElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);
  const fireworksRef = useRef<HTMLDivElement>(null);
  const dragProgressRef = useRef(0);
  const sequenceActiveRef = useRef(false);
  const unlockedRef = useRef(false);
  const introTimersRef = useRef<number[]>([]);
  const missionTimersRef = useRef<number[]>([]);

  const updateDragProgress = useCallback((progress: number) => {
    const nextProgress = Math.min(1, Math.max(0, progress));
    dragProgressRef.current = nextProgress;
    const control = dragControlRef.current;
    const handle = dragHandleRef.current;
    if (control && handle) {
      const travel = Math.max(0, control.clientWidth - handle.offsetWidth - 12);
      control.style.setProperty("--birthday-drag-progress", nextProgress.toFixed(3));
      control.style.setProperty("--birthday-drag-x", `${(travel * nextProgress).toFixed(1)}px`);
    }
    dragHandleRef.current?.setAttribute("aria-valuenow", String(Math.round(nextProgress * 100)));
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
        dragHandleRef.current?.focus({ preventScroll: true });
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
    updateDragProgress(1);
    setIsDragging(false);
    setGenerationProgress(100);
    setTakeoverPhase("confirmed");
    setAnnouncement("Purchase confirmed. Grand Theft Auto VI has been purchased on your account.");
    navigator.vibrate?.([18, 42, 38]);

    const confirmationTime = reducedMotion ? 420 : 1900;
    const totalTime = reducedMotion ? 620 : 2520;
    addTimer(missionTimersRef.current, () => setTakeoverPhase("leaving"), confirmationTime);
    addTimer(missionTimersRef.current, () => setTakeoverPhase("hidden"), totalTime);
    addTimer(missionTimersRef.current, () => burstConfetti(), Math.max(0, totalTime - 460));
    addTimer(
      missionTimersRef.current,
      () => promiseRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" }),
      totalTime
    );
  }, [burstConfetti, reducedMotion, updateDragProgress]);

  const beginGeneration = useCallback(() => {
    if (unlockedRef.current || sequenceActiveRef.current || takeoverPhase !== "hidden") {
      return;
    }

    sequenceActiveRef.current = true;
    clearTimers(missionTimersRef.current);
    updateDragProgress(1);
    setIsDragging(false);
    setGenerationProgress(8);
    setGenerationLabel("Connecting to Dad's account");
    setFinaliseSeconds(3);
    setTakeoverPhase("generating");
    setAnnouncement("Authorisation accepted. Generating your purchased birthday gift.");
    navigator.vibrate?.([14, 28, 18]);

    const timings = reducedMotion
      ? [80, 190, 310, 430, 540, 700, 860, 1020]
      : [360, 1080, 1840, 2620, 3040, 4040, 5040, 6040];
    const generationStages = [
      [24, "Verifying the purchase"],
      [51, "Securing the digital licence"],
      [78, "Linking it to your account"],
      [100, "Purchase record generated"]
    ] as const;

    generationStages.forEach(([progress, label], index) => {
      addTimer(missionTimersRef.current, () => {
        setGenerationProgress(progress);
        setGenerationLabel(label);
      }, timings[index]);
    });
    addTimer(missionTimersRef.current, () => {
      setTakeoverPhase("holding");
      setFinaliseSeconds(3);
      setAnnouncement("Finalising the purchase on your account. Three seconds remaining.");
    }, timings[4]);
    addTimer(missionTimersRef.current, () => setFinaliseSeconds(2), timings[5]);
    addTimer(missionTimersRef.current, () => setFinaliseSeconds(1), timings[6]);
    addTimer(missionTimersRef.current, completeUnlock, timings[7]);
  }, [completeUnlock, reducedMotion, takeoverPhase, updateDragProgress]);

  const resetDrag = useCallback(() => {
    if (!unlockedRef.current && !sequenceActiveRef.current && takeoverPhase === "hidden") {
      setIsDragging(false);
      updateDragProgress(0);
    }
  }, [takeoverPhase, updateDragProgress]);

  const updateDragFromPointer = useCallback((clientX: number) => {
    const control = dragControlRef.current;
    const handle = dragHandleRef.current;
    if (!control || !handle) {
      return;
    }

    const bounds = control.getBoundingClientRect();
    const travel = Math.max(1, bounds.width - handle.offsetWidth - 12);
    const progress = (clientX - bounds.left - handle.offsetWidth / 2 - 6) / travel;
    updateDragProgress(progress);

    if (progress >= 0.96) {
      beginGeneration();
    }
  }, [beginGeneration, updateDragProgress]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (unlockedRef.current || takeoverPhase !== "hidden") {
      return;
    }
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can be unavailable for synthetic or interrupted events.
    }
    setIsDragging(true);
    navigator.vibrate?.(10);
    updateDragFromPointer(event.clientX);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (isDragging) {
      event.preventDefault();
      updateDragFromPointer(event.clientX);
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      resetDrag();
      return;
    }
    if (event.key === "Enter" || event.key === " " || event.key === "End") {
      event.preventDefault();
      beginGeneration();
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const nextProgress = Math.min(1, dragProgressRef.current + 0.25);
      updateDragProgress(nextProgress);
      if (nextProgress >= 0.96) {
        beginGeneration();
      }
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
    sequenceActiveRef.current = false;
    setUnlocked(false);
    setTakeoverPhase("hidden");
    setIsDragging(false);
    setGenerationProgress(0);
    setGenerationLabel("Connecting to Dad's account");
    setFinaliseSeconds(3);
    setAnnouncement("");
    setActiveChapter("opening");
    fireworksRef.current?.replaceChildren();
    confettiRef.current?.replaceChildren();
    updateDragProgress(0);
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
    description?.setAttribute("content", "A private birthday mission confirming Grand Theft Auto VI has been purchased for Dad.");
    viewport?.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover");
    themeColour?.setAttribute("content", "#09071c");
    robots.name = "robots";
    robots.content = "noindex, nofollow, noarchive";
    document.head.appendChild(robots);

    const introFrame = window.requestAnimationFrame(playIntro);

    return () => {
      window.cancelAnimationFrame(introFrame);
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
    const syncDragPosition = () => updateDragProgress(dragProgressRef.current);
    const resizeFrame = window.requestAnimationFrame(syncDragPosition);
    window.addEventListener("resize", syncDragPosition, { passive: true });
    return () => {
      window.cancelAnimationFrame(resizeFrame);
      window.removeEventListener("resize", syncDragPosition);
    };
  }, [updateDragProgress]);

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
        className={`birthday-unlock-takeover${takeoverPhase !== "hidden" ? " is-active" : ""}${takeoverPhase === "leaving" ? " is-leaving" : ""}`}
        data-phase={takeoverPhase}
        aria-hidden={takeoverPhase === "hidden"}
        aria-live="polite"
        aria-atomic="true"
        hidden={takeoverPhase === "hidden"}
      >
        <div className="birthday-unlock-takeover__rings" aria-hidden="true"><i /><i /><i /></div>
        <div className="birthday-unlock-takeover__content">
          {takeoverPhase === "generating" && (
            <>
              <span>Purchase authorisation accepted</span>
              <strong>Generating<br /><em>your gift.</em></strong>
              <div className="birthday-generation" style={{ "--birthday-generation-progress": `${generationProgress}%` } as CSSProperties}>
                <div className="birthday-generation__meta"><b>{generationLabel}</b><span>{generationProgress}%</span></div>
                <div className="birthday-generation__track" aria-hidden="true"><i /></div>
                <div className="birthday-generation__steps" aria-hidden="true"><i /><i /><i /><i /></div>
              </div>
            </>
          )}
          {takeoverPhase === "holding" && (
            <>
              <span>Creating the final purchase record</span>
              <div className="birthday-finalise-orbit" aria-hidden="true"><i /><b>{finaliseSeconds}</b></div>
              <strong className="birthday-unlock-takeover__finalising">Hold tight.<br /><em>Nearly yours.</em></strong>
              <p>Finalising on your account <i /> {finaliseSeconds} second{finaliseSeconds === 1 ? "" : "s"}</p>
            </>
          )}
          {(takeoverPhase === "confirmed" || takeoverPhase === "leaving") && (
            <>
              <span>Purchase complete</span>
              <strong>Purchased<br /><em>on your account.</em></strong>
              <p>GTA VI <i /> One copy <i /> For Dad</p>
            </>
          )}
        </div>
        <div className="birthday-unlock-takeover__ticker" aria-hidden="true">
          <span>Purchase complete / Account linked / Release ready / Dad only /</span>
          <span>Purchase complete / Account linked / Release ready / Dad only /</span>
        </div>
      </div>

      <main
        id="birthday-main"
        ref={experienceRef}
        className={`birthday-experience${unlocked ? " is-unlocked" : ""}`}
        data-state={unlocked ? "unlocked" : "locked"}
        data-active-chapter={activeChapter}
      >
        <div className="birthday-scroll-progress" aria-hidden="true"><i /></div>
        <nav className="birthday-chapter-rail" aria-label="Birthday mission chapters">
          {([
            ["opening", "birthday-opening", "Opening"],
            ["promise", "birthday-promise", "Purchase"],
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
            <span className="birthday-masthead__status"><i /> Purchase secured</span>
          </header>

          <div className="birthday-hero__content">
            <p className="birthday-kicker">Your next big adventure is secured.</p>
            <h1 id="birthday-title"><span>Mission</span><em>VI</em></h1>
            <p className="birthday-hero__lead">
              Happy Birthday, Dad. <strong>Grand Theft Auto VI has been purchased directly on your account.</strong>
            </p>

            <div className="birthday-unlock">
              <div
                ref={dragControlRef}
                className={`birthday-drag-control${isDragging ? " is-dragging" : ""}${unlocked ? " is-complete" : ""}`}
              >
                <span className="birthday-drag-control__fill" aria-hidden="true" />
                <span className="birthday-drag-control__copy" aria-hidden="true">
                  <strong>{unlocked ? "Purchase confirmed" : "Drag to reveal"}</strong>
                  <small>{unlocked ? "Purchased on your account" : "Slide all the way to the end"}</small>
                </span>
                <span className="birthday-drag-control__finish" aria-hidden="true"><i /><i /><i /></span>
                <button
                  ref={dragHandleRef}
                  className="birthday-drag-control__handle"
                  type="button"
                  role="slider"
                  aria-label="Drag to reveal your purchased birthday gift"
                  aria-describedby="drag-help"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={0}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={resetDrag}
                  onPointerCancel={resetDrag}
                  onLostPointerCapture={resetDrag}
                  onKeyDown={handleKeyDown}
                  onContextMenu={(event) => event.preventDefault()}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 7 7-7 7M14 5l7 7-7 7" /></svg>
                </button>
              </div>
              <p id="drag-help" className="birthday-unlock__help">Drag the arrow to the end. Keyboard: press Enter, Space or End.</p>
            </div>
          </div>

          <div className="birthday-hero__release"><span>Current official launch</span><strong>19.11.2026</strong></div>
          <a className="birthday-scroll-cue" href="#birthday-promise" aria-label="Continue to the purchase confirmation">
            <span>See the purchase</span>
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
            <div className="birthday-promise__ticket-meta" aria-hidden="true"><span>Purchase record / 006</span><span>Account linked</span></div>
            <div className="birthday-promise__number" aria-hidden="true"><span>0</span><span>6</span></div>
            <div className="birthday-promise__copy">
              <p className="birthday-kicker birthday-kicker--dark">Purchase confirmed <span aria-hidden="true">✓</span></p>
              <h2 id="promise-title">Purchased.<br /><em>All yours.</em></h2>
              <p>We have now bought your copy directly on your account. When GTA VI releases, it will be there waiting - already linked and ready for launch.</p>
            </div>
            <dl className="birthday-terms" aria-label="Your birthday gift details">
              <div><dt>The gift</dt><dd>Grand Theft Auto VI</dd></div>
              <div><dt>Delivery</dt><dd>Purchased on your account</dd></div>
              <div><dt>Status</dt><dd>Purchase complete</dd></div>
              <div><dt>Available</dt><dd>Ready to play from launch</dd></div>
            </dl>
          </div>
          <a className="birthday-chapter-transition" href="#birthday-countdown">
            <span><small>Purchase complete</small><strong>Follow it to launch day</strong></span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </a>
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
          <a className="birthday-chapter-transition birthday-chapter-transition--light" href="#birthday-finale">
            <span><small>One final stop</small><strong>Open your birthday message</strong></span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </a>
        </section>

        <section id="birthday-finale" className="birthday-finale" data-birthday-chapter="finale" aria-labelledby="finale-title">
          <div className="birthday-finale__art" aria-hidden="true" />
          <div ref={fireworksRef} className="birthday-finale__fireworks" aria-hidden="true" />
          <div className="birthday-finale__content">
            <p className="birthday-kicker">A message from us</p>
            <h2 id="finale-title">Happy Birthday,<br /><em>Dad.</em></h2>
            <p>We wanted to give you something worth waiting for. Your copy is purchased, your mission is active, and the first drive is yours.</p>
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
