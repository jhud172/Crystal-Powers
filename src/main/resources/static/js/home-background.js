document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.querySelector("[data-home-network]");
    const body = document.body;

    if (!(canvas instanceof HTMLCanvasElement)) {
        return;
    }

    const shell = canvas.closest("[data-home-network-shell]");

    if (!(shell instanceof HTMLElement)) {
        return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
        return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

    const themePresets = {
        futuristic: {
            mode: "network",
            density: 1,
            speed: 0.17,
            cursorDistance: coarsePointer ? 0 : reducedMotion ? 140 : 220,
            cursorForce: 0.016,
            linkDistance: coarsePointer ? 94 : 144,
            radius: [1.4, 3.5],
            outerColor: [2, 6, 23],
            innerColor: [226, 232, 240],
            ringColor: [103, 232, 249],
            lineColor: [103, 232, 249],
            cursorGradient: [
                [0, [103, 232, 249, 0.12]],
                [0.38, [59, 130, 246, 0.08]],
                [1, [2, 6, 23, 0]]
            ],
            motion: "free"
        },
        classic: {
            mode: "constellation",
            density: 1.45,
            speed: 0.1,
            cursorDistance: coarsePointer ? 0 : 110,
            cursorForce: 0.008,
            linkDistance: 118,
            radius: [1.2, 2.7],
            outerColor: [39, 28, 19],
            innerColor: [243, 215, 162],
            ringColor: [232, 192, 125],
            lineColor: [183, 121, 61],
            cursorGradient: [],
            motion: "glide"
        },
        clean: {
            mode: "minimal",
            density: 1.8,
            speed: 0.08,
            cursorDistance: coarsePointer ? 0 : 120,
            cursorForce: -0.008,
            linkDistance: 0,
            radius: [1.1, 2.4],
            outerColor: [255, 255, 255],
            innerColor: [37, 99, 235],
            ringColor: [14, 165, 233],
            lineColor: [37, 99, 235],
            cursorGradient: [
                [0, [37, 99, 235, 0.1]],
                [0.45, [56, 189, 248, 0.05]],
                [1, [255, 255, 255, 0]]
            ],
            motion: "glide"
        },
        fresh: {
            mode: "breeze",
            density: 1.25,
            speed: 0.11,
            cursorDistance: coarsePointer ? 0 : 150,
            cursorForce: 0.012,
            linkDistance: 0,
            radius: [1.6, 3.8],
            outerColor: [220, 252, 231],
            innerColor: [15, 118, 110],
            ringColor: [45, 212, 191],
            lineColor: [45, 212, 191],
            cursorGradient: [
                [0, [45, 212, 191, 0.1]],
                [0.5, [52, 211, 153, 0.06]],
                [1, [255, 255, 255, 0]]
            ],
            motion: "lift"
        },
        "summer-vibes": {
            mode: "sun",
            density: 1.12,
            speed: 0.12,
            cursorDistance: coarsePointer ? 0 : 165,
            cursorForce: 0.022,
            linkDistance: 0,
            radius: [2.2, 5],
            outerColor: [255, 237, 213],
            innerColor: [249, 115, 22],
            ringColor: [34, 211, 238],
            lineColor: [249, 115, 22],
            cursorGradient: [
                [0, [249, 115, 22, 0.12]],
                [0.42, [251, 191, 36, 0.08]],
                [1, [255, 255, 255, 0]]
            ],
            motion: "wave"
        }
    };

    const rgba = (rgb, alpha) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;

    const getActiveTheme = () => {
        const theme = body.dataset.theme;
        return Object.hasOwn(themePresets, theme) ? theme : "futuristic";
    };

    const createParticle = (width, height, preset) => {
        const baseSpeed = reducedMotion ? preset.speed * 0.55 : preset.speed;
        const radius = preset.radius[0] + Math.random() * (preset.radius[1] - preset.radius[0]);
        const particle = {
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * baseSpeed,
            vy: (Math.random() - 0.5) * baseSpeed,
            radius,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.018,
            shimmer: Math.random() * Math.PI * 2,
            phase: Math.random() * Math.PI * 2
        };

        if (preset.motion === "lift") {
            particle.vx = (Math.random() - 0.5) * baseSpeed * 0.8;
            particle.vy = -(0.45 + Math.random()) * baseSpeed;
        }

        if (preset.motion === "wave") {
            particle.vx = (Math.random() - 0.5) * baseSpeed * 0.75;
            particle.vy = (Math.random() - 0.5) * baseSpeed * 0.35;
        }

        return particle;
    };

    const resetParticle = (particle, width, height, preset) => {
        particle.x = Math.random() * width;
        particle.y = preset.motion === "lift" ? height + Math.random() * 40 : Math.random() * height;
        particle.phase = Math.random() * Math.PI * 2;
        particle.shimmer = Math.random() * Math.PI * 2;
        particle.rotation = Math.random() * Math.PI * 2;
    };

    const state = {
        cursor: {
            active: false,
            x: 0,
            y: 0
        },
        frameId: 0,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        particles: [],
        preset: themePresets[getActiveTheme()],
        running: true
    };

    const getParticleCount = (width, height) => {
        const densityModifier = coarsePointer ? 1.25 : reducedMotion ? 1.2 : 1;
        const divisor = 16000 * state.preset.density * densityModifier;
        return Math.max(24, Math.min(132, Math.round((width * height) / divisor)));
    };

    const syncParticles = (width, height) => {
        const targetCount = getParticleCount(width, height);

        while (state.particles.length < targetCount) {
            state.particles.push(createParticle(width, height, state.preset));
        }

        if (state.particles.length > targetCount) {
            state.particles.length = targetCount;
        }
    };

    const resizeCanvas = () => {
        const bounds = shell.getBoundingClientRect();
        const width = Math.max(Math.floor(bounds.width), 1);
        const height = Math.max(Math.floor(bounds.height), 1);
        state.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(width * state.pixelRatio);
        canvas.height = Math.floor(height * state.pixelRatio);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(state.pixelRatio, 0, 0, state.pixelRatio, 0, 0);
        syncParticles(width, height);
    };

    const drawLine = (fromX, fromY, toX, toY, alpha) => {
        context.beginPath();
        context.moveTo(fromX, fromY);
        context.lineTo(toX, toY);
        context.strokeStyle = rgba(state.preset.lineColor, alpha);
        context.lineWidth = 0.9;
        context.stroke();
    };

    const drawNode = (particle, time) => {
        const shimmer = 0.45 + (Math.sin(time * 0.0011 + particle.shimmer) + 1) * 0.16;
        const flap = 0.6 + (Math.sin(time * 0.008 + particle.phase) + 1) * 0.18;

        switch (state.preset.mode) {
            case "minimal":
                context.save();
                context.translate(particle.x, particle.y);
                context.rotate(particle.rotation);
                context.beginPath();
                context.fillStyle = rgba(state.preset.innerColor, 0.26 * shimmer);
                context.roundRect(-particle.radius * 1.5, -particle.radius * 0.72, particle.radius * 3, particle.radius * 1.44, particle.radius * 0.6);
                context.fill();
                context.restore();
                break;
            case "breeze":
                context.save();
                context.translate(particle.x, particle.y);
                context.rotate(particle.rotation + Math.sin(time * 0.001 + particle.phase) * 0.35);
                context.beginPath();
                context.fillStyle = rgba(state.preset.outerColor, 0.26 * shimmer);
                context.ellipse(0, 0, particle.radius * 0.9, particle.radius * 2.3, 0, 0, Math.PI * 2);
                context.fill();
                context.beginPath();
                context.strokeStyle = rgba(state.preset.ringColor, 0.24 * shimmer);
                context.lineWidth = 1;
                context.moveTo(0, -particle.radius * 1.8);
                context.lineTo(0, particle.radius * 1.8);
                context.stroke();
                context.restore();
                break;
            case "sun": {
                context.save();
                context.translate(particle.x, particle.y);
                context.rotate(Math.sin(time * 0.0012 + particle.phase) * 0.18);
                context.fillStyle = rgba(state.preset.innerColor, 0.18 * shimmer);
                context.beginPath();
                context.ellipse(-particle.radius * flap * 0.55, 0, particle.radius * 1.1, particle.radius * 0.72, -0.5, 0, Math.PI * 2);
                context.ellipse(particle.radius * flap * 0.55, 0, particle.radius * 1.1, particle.radius * 0.72, 0.5, 0, Math.PI * 2);
                context.fill();
                context.beginPath();
                context.strokeStyle = rgba(state.preset.ringColor, 0.22 * shimmer);
                context.lineWidth = 1.1;
                context.moveTo(0, -particle.radius * 0.9);
                context.lineTo(0, particle.radius * 0.9);
                context.stroke();
                context.restore();
                break;
            }
            case "constellation":
                context.save();
                context.translate(particle.x, particle.y);
                context.rotate(particle.rotation);
                context.strokeStyle = rgba(state.preset.ringColor, 0.32 * shimmer);
                context.lineWidth = 1;
                context.beginPath();
                context.moveTo(0, -particle.radius * 1.8);
                context.lineTo(0, particle.radius * 1.8);
                context.moveTo(-particle.radius * 1.8, 0);
                context.lineTo(particle.radius * 1.8, 0);
                context.stroke();
                context.restore();
                break;
            case "network":
            default:
                context.beginPath();
                context.fillStyle = rgba(state.preset.outerColor, 0.72 * shimmer);
                context.arc(particle.x, particle.y, particle.radius * 1.9, 0, Math.PI * 2);
                context.fill();

                context.beginPath();
                context.fillStyle = rgba(state.preset.innerColor, 0.42 * shimmer);
                context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                context.fill();

                context.beginPath();
                context.strokeStyle = rgba(state.preset.ringColor, 0.14 * shimmer);
                context.lineWidth = 1;
                context.arc(particle.x, particle.y, particle.radius * 2.4, 0, Math.PI * 2);
                context.stroke();
                break;
        }
    };

    const renderCursorGlow = () => {
        if (!state.cursor.active || state.preset.cursorDistance <= 0 || state.preset.cursorGradient.length === 0) {
            return;
        }

        const gradient = context.createRadialGradient(
            state.cursor.x,
            state.cursor.y,
            0,
            state.cursor.x,
            state.cursor.y,
            state.preset.cursorDistance * 0.75
        );

        state.preset.cursorGradient.forEach(([stop, color]) => {
            gradient.addColorStop(stop, rgba(color.slice(0, 3), color[3]));
        });

        context.beginPath();
        context.fillStyle = gradient;
        context.arc(state.cursor.x, state.cursor.y, state.preset.cursorDistance * 0.75, 0, Math.PI * 2);
        context.fill();
    };

    const render = (time) => {
        if (!state.running) {
            return;
        }

        const width = canvas.width / state.pixelRatio;
        const height = canvas.height / state.pixelRatio;
        context.clearRect(0, 0, width, height);

        state.particles.forEach((particle) => {
            particle.rotation += particle.rotationSpeed;

            if (state.preset.motion === "lift") {
                particle.x += particle.vx + Math.sin(time * 0.001 + particle.phase) * 0.18;
                particle.y += particle.vy;

                if (particle.y < -26) {
                    resetParticle(particle, width, height, state.preset);
                }
            } else if (state.preset.motion === "wave") {
                particle.x += particle.vx + Math.sin(time * 0.0012 + particle.phase) * 0.3;
                particle.y += particle.vy + Math.cos(time * 0.0009 + particle.phase) * 0.12;

                if (particle.x <= -30 || particle.x >= width + 30) {
                    particle.vx *= -1;
                }

                if (particle.y <= -24 || particle.y >= height + 24) {
                    particle.vy *= -1;
                }
            } else {
                particle.x += particle.vx + Math.sin(time * 0.00022 + particle.shimmer) * 0.03;
                particle.y += particle.vy + Math.cos(time * 0.00018 + particle.shimmer) * 0.03;

                if (particle.x <= -18 || particle.x >= width + 18) {
                    particle.vx *= -1;
                }

                if (particle.y <= -18 || particle.y >= height + 18) {
                    particle.vy *= -1;
                }
            }

            if (state.cursor.active && state.preset.cursorDistance > 0) {
                const dx = state.cursor.x - particle.x;
                const dy = state.cursor.y - particle.y;
                const distance = Math.hypot(dx, dy);

                if (distance < state.preset.cursorDistance && distance > 0) {
                    const force = (1 - distance / state.preset.cursorDistance) * state.preset.cursorForce;
                    particle.x -= dx * force;
                    particle.y -= dy * force;
                }
            }
        });

        if (state.preset.linkDistance > 0) {
            for (let index = 0; index < state.particles.length; index += 1) {
                const particle = state.particles[index];

                for (let comparisonIndex = index + 1; comparisonIndex < state.particles.length; comparisonIndex += 1) {
                    const comparison = state.particles[comparisonIndex];
                    const dx = particle.x - comparison.x;
                    const dy = particle.y - comparison.y;
                    const distance = Math.hypot(dx, dy);

                    if (distance < state.preset.linkDistance) {
                        const alpha = (1 - distance / state.preset.linkDistance) * (state.preset.mode === "constellation" ? 0.14 : 0.18);
                        drawLine(particle.x, particle.y, comparison.x, comparison.y, alpha);
                    }
                }

                if (state.cursor.active && state.preset.cursorDistance > 0 && state.preset.mode === "network") {
                    const dx = state.cursor.x - particle.x;
                    const dy = state.cursor.y - particle.y;
                    const distance = Math.hypot(dx, dy);

                    if (distance < state.preset.cursorDistance) {
                        const alpha = (1 - distance / state.preset.cursorDistance) * 0.38;
                        drawLine(particle.x, particle.y, state.cursor.x, state.cursor.y, alpha);
                    }
                }
            }
        }

        state.particles.forEach((particle) => {
            drawNode(particle, time);
        });

        renderCursorGlow();
        state.frameId = window.requestAnimationFrame(render);
    };

    const updateCursor = (event) => {
        const bounds = shell.getBoundingClientRect();
        state.cursor.active = true;
        state.cursor.x = event.clientX - bounds.left;
        state.cursor.y = event.clientY - bounds.top;
    };

    const resetCursor = () => {
        state.cursor.active = false;
    };

    const resizeObserver = new ResizeObserver(() => {
        resizeCanvas();
    });

    const intersectionObserver = new IntersectionObserver((entries) => {
        const [entry] = entries;
        state.running = Boolean(entry?.isIntersecting);

        if (state.running && state.frameId === 0) {
            state.frameId = window.requestAnimationFrame(render);
        }

        if (!state.running && state.frameId !== 0) {
            window.cancelAnimationFrame(state.frameId);
            state.frameId = 0;
        }
    }, {
        threshold: 0.05
    });

    const syncThemePreset = () => {
        state.preset = themePresets[getActiveTheme()];
        resizeCanvas();
    };

    resizeCanvas();
    resizeObserver.observe(shell);
    intersectionObserver.observe(shell);
    shell.addEventListener("pointermove", updateCursor);
    shell.addEventListener("pointerenter", updateCursor);
    shell.addEventListener("pointerleave", resetCursor);
    shell.addEventListener("pointercancel", resetCursor);
    document.addEventListener("themechange", syncThemePreset);
    state.frameId = window.requestAnimationFrame(render);

    window.addEventListener("pagehide", () => {
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        document.removeEventListener("themechange", syncThemePreset);
        window.cancelAnimationFrame(state.frameId);
        state.frameId = 0;
    }, {
        once: true
    });
});
