document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.querySelector("[data-home-network]");

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
    const state = {
        cursor: {
            active: false,
            x: 0,
            y: 0
        },
        frameId: 0,
        running: true,
        particles: [],
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2)
    };

    const createParticle = (width, height) => {
        const speed = reducedMotion ? 0.08 : 0.17;
        return {
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * speed,
            vy: (Math.random() - 0.5) * speed,
            radius: 1.4 + Math.random() * 2.1,
            shimmer: Math.random() * Math.PI * 2
        };
    };

    const getParticleCount = (width, height) => {
        const density = coarsePointer ? 1 : reducedMotion ? 1.35 : 1.9;
        return Math.max(42, Math.min(140, Math.round((width * height) / 16000 / density)));
    };

    const syncParticles = (width, height) => {
        const targetCount = getParticleCount(width, height);

        while (state.particles.length < targetCount) {
            state.particles.push(createParticle(width, height));
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

    const drawNode = (particle, time) => {
        const shimmer = 0.45 + (Math.sin(time * 0.0012 + particle.shimmer) + 1) * 0.16;
        context.beginPath();
        context.fillStyle = `rgba(2, 6, 23, ${0.72 * shimmer})`;
        context.arc(particle.x, particle.y, particle.radius * 1.9, 0, Math.PI * 2);
        context.fill();

        context.beginPath();
        context.fillStyle = `rgba(226, 232, 240, ${0.42 * shimmer})`;
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();

        context.beginPath();
        context.strokeStyle = `rgba(103, 232, 249, ${0.14 * shimmer})`;
        context.lineWidth = 1;
        context.arc(particle.x, particle.y, particle.radius * 2.4, 0, Math.PI * 2);
        context.stroke();
    };

    const drawLine = (fromX, fromY, toX, toY, alpha, width) => {
        context.beginPath();
        context.moveTo(fromX, fromY);
        context.lineTo(toX, toY);
        context.strokeStyle = `rgba(103, 232, 249, ${alpha})`;
        context.lineWidth = width;
        context.stroke();
    };

    const render = (time) => {
        if (!state.running) {
            return;
        }

        const width = canvas.width / state.pixelRatio;
        const height = canvas.height / state.pixelRatio;
        const linkDistance = coarsePointer ? 94 : 144;
        const cursorDistance = coarsePointer ? 0 : reducedMotion ? 140 : 220;
        context.clearRect(0, 0, width, height);

        state.particles.forEach((particle) => {
            particle.x += particle.vx + Math.sin(time * 0.00022 + particle.shimmer) * 0.03;
            particle.y += particle.vy + Math.cos(time * 0.00018 + particle.shimmer) * 0.03;

            if (particle.x <= -18 || particle.x >= width + 18) {
                particle.vx *= -1;
            }

            if (particle.y <= -18 || particle.y >= height + 18) {
                particle.vy *= -1;
            }

            if (state.cursor.active && cursorDistance > 0) {
                const dx = state.cursor.x - particle.x;
                const dy = state.cursor.y - particle.y;
                const distance = Math.hypot(dx, dy);

                if (distance < cursorDistance && distance > 0) {
                    const force = (1 - distance / cursorDistance) * 0.016;
                    particle.x -= dx * force;
                    particle.y -= dy * force;
                }
            }
        });

        for (let index = 0; index < state.particles.length; index += 1) {
            const particle = state.particles[index];

            for (let comparisonIndex = index + 1; comparisonIndex < state.particles.length; comparisonIndex += 1) {
                const comparison = state.particles[comparisonIndex];
                const dx = particle.x - comparison.x;
                const dy = particle.y - comparison.y;
                const distance = Math.hypot(dx, dy);

                if (distance < linkDistance) {
                    const alpha = (1 - distance / linkDistance) * 0.18;
                    drawLine(particle.x, particle.y, comparison.x, comparison.y, alpha, 0.8);
                }
            }

            if (state.cursor.active && cursorDistance > 0) {
                const dx = state.cursor.x - particle.x;
                const dy = state.cursor.y - particle.y;
                const distance = Math.hypot(dx, dy);

                if (distance < cursorDistance) {
                    const alpha = (1 - distance / cursorDistance) * 0.38;
                    drawLine(particle.x, particle.y, state.cursor.x, state.cursor.y, alpha, 1);
                }
            }

            drawNode(particle, time);
        }

        if (state.cursor.active && cursorDistance > 0) {
            const gradient = context.createRadialGradient(
                state.cursor.x,
                state.cursor.y,
                0,
                state.cursor.x,
                state.cursor.y,
                cursorDistance * 0.75
            );
            gradient.addColorStop(0, "rgba(103, 232, 249, 0.12)");
            gradient.addColorStop(0.38, "rgba(59, 130, 246, 0.08)");
            gradient.addColorStop(1, "rgba(2, 6, 23, 0)");
            context.beginPath();
            context.fillStyle = gradient;
            context.arc(state.cursor.x, state.cursor.y, cursorDistance * 0.75, 0, Math.PI * 2);
            context.fill();
        }

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

    resizeCanvas();
    resizeObserver.observe(shell);
    intersectionObserver.observe(shell);
    shell.addEventListener("pointermove", updateCursor);
    shell.addEventListener("pointerenter", updateCursor);
    shell.addEventListener("pointerleave", resetCursor);
    shell.addEventListener("pointercancel", resetCursor);
    state.frameId = window.requestAnimationFrame(render);

    window.addEventListener("pagehide", () => {
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        window.cancelAnimationFrame(state.frameId);
        state.frameId = 0;
    }, {
        once: true
    });
});
