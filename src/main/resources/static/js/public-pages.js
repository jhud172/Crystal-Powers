document.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealCandidates = Array.from(new Set([
        ...document.querySelectorAll("[data-reveal]"),
        ...document.querySelectorAll(".story-panel"),
        ...document.querySelectorAll(".showcase-card"),
        ...document.querySelectorAll(".project-band-card"),
        ...document.querySelectorAll(".portfolio-card"),
        ...document.querySelectorAll(".contact-preview-intro"),
        ...document.querySelectorAll(".contact-preview-card"),
        ...document.querySelectorAll(".contact-form-section"),
        ...document.querySelectorAll(".final-callout")
    ])).filter((element) => element instanceof HTMLElement);
    const motionTargets = Array.from(new Set([
        ...document.querySelectorAll("[data-tilt]"),
        ...document.querySelectorAll(".portfolio-card-trigger"),
        ...document.querySelectorAll(".site-secret-node")
    ])).filter((element) => element instanceof HTMLElement);
    const depthTargets = motionTargets.filter((element) => element.hasAttribute("data-depth"));
    const soundSelector = [
        "[data-sound-trigger]",
        ".primary-button",
        ".secondary-button",
        ".nav-link",
        ".portfolio-filter-chip",
        ".portfolio-tab",
        ".contact-select-trigger",
        ".theme-picker-trigger",
        ".site-secret-node"
    ].join(", ");
    const secretTriggers = Array.from(document.querySelectorAll("[data-secret-trigger]"))
        .filter((element) => element instanceof HTMLElement);
    const secretStatusNodes = Array.from(document.querySelectorAll("[data-secret-status]"))
        .filter((element) => element instanceof HTMLElement);
    const motionStates = new WeakMap();
    const activeMotionTargets = new Set();

    let audioContext = null;
    let overdriveTimeout = 0;
    let motionFrame = 0;

    const setSecretStatus = (message) => {
        secretStatusNodes.forEach((node) => {
            node.textContent = message;
        });
    };

    const getAudioContext = () => {
        if (audioContext || reducedMotion) {
            return audioContext;
        }

        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

        if (!AudioContextCtor) {
            return null;
        }

        audioContext = new AudioContextCtor();
        return audioContext;
    };

    const playTone = (frequency, duration, type, gainValue, delay = 0) => {
        const context = getAudioContext();

        if (!context) {
            return;
        }

        if (context.state === "suspended") {
            context.resume().catch(() => {
                return null;
            });
        }

        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const startTime = context.currentTime + delay;

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, startTime);
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration + 0.02);
    };

    const playInterfaceSound = (kind) => {
        if (kind === "secret") {
            playTone(240, 0.18, "triangle", 0.015);
            playTone(480, 0.22, "sine", 0.012, 0.05);
            playTone(720, 0.28, "triangle", 0.01, 0.1);
            return;
        }

        if (kind === "soft") {
            playTone(420, 0.08, "triangle", 0.008);
            playTone(560, 0.12, "sine", 0.006, 0.025);
            return;
        }

        playTone(320, 0.08, "triangle", 0.009);
        playTone(640, 0.1, "sine", 0.006, 0.03);
    };

    const activateOverdrive = () => {
        window.clearTimeout(overdriveTimeout);
        body.classList.add("is-overdrive");
        setSecretStatus("Overdrive mode active.");
        playInterfaceSound("secret");

        overdriveTimeout = window.setTimeout(() => {
            body.classList.remove("is-overdrive");
            setSecretStatus("Double-click the pulse core in the header.");
        }, 18000);
    };

    const getMotionState = (target) => {
        let state = motionStates.get(target);

        if (!state) {
            state = {
                currentRotateX: 0,
                currentRotateY: 0,
                currentDepth: Number(target.dataset.motionDepthShift || 0),
                currentLift: 0,
                currentScale: 1,
                targetRotateX: 0,
                targetRotateY: 0,
                targetDepth: Number(target.dataset.motionDepthShift || 0),
                targetLift: 0,
                targetScale: 1,
                hover: false
            };

            motionStates.set(target, state);
        }

        return state;
    };

    const renderMotion = (target, state) => {
        target.style.transform = `perspective(1400px) translate3d(0, ${state.currentDepth + state.currentLift}px, 0) rotateX(${state.currentRotateX}deg) rotateY(${state.currentRotateY}deg) scale(${state.currentScale})`;
    };

    const queueMotion = (target) => {
        activeMotionTargets.add(target);

        if (motionFrame !== 0) {
            return;
        }

        const tick = () => {
            motionFrame = 0;
            let hasActiveTargets = false;

            activeMotionTargets.forEach((element) => {
                const state = getMotionState(element);

                state.currentRotateX += (state.targetRotateX - state.currentRotateX) * 0.18;
                state.currentRotateY += (state.targetRotateY - state.currentRotateY) * 0.18;
                state.currentDepth += (state.targetDepth - state.currentDepth) * 0.16;
                state.currentLift += (state.targetLift - state.currentLift) * 0.18;
                state.currentScale += (state.targetScale - state.currentScale) * 0.16;

                renderMotion(element, state);

                const settled = Math.abs(state.currentRotateX - state.targetRotateX) < 0.02
                    && Math.abs(state.currentRotateY - state.targetRotateY) < 0.02
                    && Math.abs(state.currentDepth - state.targetDepth) < 0.02
                    && Math.abs(state.currentLift - state.targetLift) < 0.02
                    && Math.abs(state.currentScale - state.targetScale) < 0.002;

                if (settled && !state.hover) {
                    activeMotionTargets.delete(element);
                    return;
                }

                hasActiveTargets = true;
            });

            if (hasActiveTargets) {
                motionFrame = window.requestAnimationFrame(tick);
            }
        };

        motionFrame = window.requestAnimationFrame(tick);
    };

    const syncDepth = () => {
        if (reducedMotion) {
            return;
        }

        const viewportCenter = window.innerHeight * 0.5;

        depthTargets.forEach((target) => {
            const rect = target.getBoundingClientRect();
            const depth = Number(target.dataset.depth || 0);
            const center = rect.top + (rect.height * 0.5);
            const delta = (center - viewportCenter) / Math.max(window.innerHeight, 1);
            const shift = Math.max(Math.min(delta * depth * -0.45, depth), -depth);
            const state = getMotionState(target);

            target.dataset.motionDepthShift = String(Number(shift.toFixed(2)));
            state.targetDepth = Number(shift.toFixed(2));
            queueMotion(target);
        });
    };

    if (revealCandidates.length > 0) {
        if (reducedMotion || !("IntersectionObserver" in window)) {
            revealCandidates.forEach((element) => {
                element.classList.add("is-visible");
            });
        } else {
            const revealObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    entry.target.classList.add("is-visible");
                    revealObserver.unobserve(entry.target);
                });
            }, {
                threshold: 0.16,
                rootMargin: "0px 0px -6% 0px"
            });

            revealCandidates.forEach((element) => {
                revealObserver.observe(element);
            });
        }
    }

    if (!reducedMotion) {
        motionTargets.forEach((target) => {
            const state = getMotionState(target);

            renderMotion(target, state);

            target.addEventListener("pointerenter", () => {
                state.hover = true;
                state.targetLift = target.classList.contains("site-secret-node") ? -4 : -6;
                state.targetScale = target.classList.contains("portfolio-card-trigger") ? 1.008 : 1;
                queueMotion(target);
            });

            target.addEventListener("pointermove", (event) => {
                const rect = target.getBoundingClientRect();
                const x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) - 0.5;
                const y = ((event.clientY - rect.top) / Math.max(rect.height, 1)) - 0.5;

                state.targetRotateX = Number((-y * 6.8).toFixed(2));
                state.targetRotateY = Number((x * 8.2).toFixed(2));
                queueMotion(target);
            });

            target.addEventListener("pointerleave", () => {
                state.hover = false;
                state.targetRotateX = 0;
                state.targetRotateY = 0;
                state.targetLift = 0;
                state.targetScale = 1;
                queueMotion(target);
            });
        });
    } else {
        revealCandidates.forEach((element) => {
            element.classList.add("is-visible");
        });
    }

    document.addEventListener("pointermove", (event) => {
        body.style.setProperty("--cursor-x", `${event.clientX}px`);
        body.style.setProperty("--cursor-y", `${event.clientY}px`);
    }, { passive: true });

    document.addEventListener("click", (event) => {
        const target = event.target;

        if (!(target instanceof Element)) {
            return;
        }

        const soundTarget = target.closest(soundSelector);

        if (soundTarget) {
            playInterfaceSound("soft");
        }
    });

    secretTriggers.forEach((trigger) => {
        trigger.addEventListener("dblclick", (event) => {
            event.preventDefault();
            activateOverdrive();
        });
    });

    window.addEventListener("scroll", syncDepth, { passive: true });
    window.addEventListener("resize", syncDepth);
    syncDepth();
    setSecretStatus("Double-click the pulse core in the header.");
});
