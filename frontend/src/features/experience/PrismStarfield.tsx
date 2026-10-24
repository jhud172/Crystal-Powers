import { useEffect, useRef } from "react";
import { useExperience } from "./ExperienceContext";

type Star = { depth: number; x: number; y: number; age: number; life: number; size: number; phase: number; heading: number; speed: number; ox: number; oy: number; vx: number; vy: number };
const depthProgress = (progress: number, delay: number) => Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
const smooth = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** A bounded, recycled 2D field; pointer input never updates React state. */
export function PrismStarfield({ departing, light, paused }: { departing: boolean; light: boolean; paused: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const target = useRef(departing ? 1 : 0);
  const wake = useRef<() => void>(() => {});
  const { reducedMotion, pageVisible, lightMotion } = useExperience();
  useEffect(() => { target.current = departing ? 1 : 0; wake.current(); }, [departing]);
  useEffect(() => {
    const node = canvas.current;
    const host = node?.parentElement;
    const context = node?.getContext("2d");
    if (!node || !host || !context || reducedMotion || paused) return;
    let width = 1, height = 1, frame = 0, previous = 0, progress = target.current;
    let visible = true, retired = false;
    const pointer = { x: -10000, y: -10000 };
    const stars: Star[] = [];
    const recycle = (star: Star, initial = false) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = .09 + Math.sqrt(Math.random()) * .65;
      Object.assign(star, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius,
        age: initial ? Math.random() * 8 : 0, life: 10 + Math.random() * 10,
        size: .6 + Math.random() * 1.1, phase: Math.random() * Math.PI * 2,
        heading: Math.random() * Math.PI * 2, speed: 2 + Math.random() * 3,
        ox: 0, oy: 0, vx: 0, vy: 0 });
    };
    const resize = () => {
      const bounds = host.getBoundingClientRect();
      width = bounds.width; height = bounds.height;
      const dpr = Math.min(window.devicePixelRatio || 1, lightMotion ? 1 : 1.5);
      node.width = Math.round(width * dpr); node.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const nearCount = lightMotion || width < 600 ? 48 : 120;
      const count = nearCount * 2;
      while (stars.length < count) {
        // Keep a fixed distant population: travel never spawns random replacements.
        const index = stars.length;
        const star = { depth: index < nearCount ? 0 : .35 + ((index - nearCount) / nearCount) * .55 } as Star;
        recycle(star, true); stars.push(star);
      }
      // Resizing preserves the two depth bands even when the compact budget changes.
      for (let index = 0; index < count; index++) if (stars[index]) stars[index].depth = index < nearCount ? 0 : .35 + ((index - nearCount) / nearCount) * .55;
      stars.length = count;
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const bounds = host.getBoundingClientRect();
      pointer.x = event.clientX - bounds.left; pointer.y = event.clientY - bounds.top;
    };
    const leave = () => { pointer.x = pointer.y = -10000; };
    const draw = (now: number) => {
      frame = 0;
      if (retired || !visible || !pageVisible) { previous = 0; return; }
      const dt = previous ? Math.min((now - previous) / 1000, .05) : 0;
      previous = now;
      const before = progress;
      progress += Math.sign(target.current - progress) * Math.min(Math.abs(target.current - progress), dt / (lightMotion ? 4.5 : 6));
      context.clearRect(0, 0, width, height);
      context.strokeStyle = context.fillStyle = light ? "#285366" : "#c3e9ff";
      let displayed = 0, distantDisplayed = 0, repelled = 0;
      for (const star of stars) {
        // Freeze the population during travel: no new stars flash into an empty jump.
        if (progress === 0 && target.current === 0) {
          star.age += dt;
          if (star.age > star.life) recycle(star);
          // Independent headings wander gently, at CSS-pixel speeds on any screen.
          // Keep ambient drift separate from the pointer spring and freeze it in a jump.
          const heading = star.heading + Math.sin(star.age * .22 + star.phase) * .4;
          const travel = star.speed * (lightMotion ? .55 : 1) * dt;
          star.x += Math.cos(heading) * travel / Math.max(1, width);
          star.y += Math.sin(heading) * travel / Math.max(1, height);
        }
        // Depth delays acceleration along one reversible travel coordinate. Far
        // stars begin near the vanishing point and join the rush after near stars.
        const delay = star.depth * .62;
        const warp = smooth(depthProgress(progress, delay)), lastWarp = smooth(depthProgress(before, delay));
        const perspective = 1 / (1 + star.depth * 3);
        const baseX = width * (.5 + star.x * perspective), baseY = height * (.5 + star.y * perspective);
        const dx = baseX + star.ox - pointer.x, dy = baseY + star.oy - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 150 && distance > .01) {
          repelled++;
          const force = (1 - distance / 150) * 850;
          star.vx += dx / distance * force * dt; star.vy += dy / distance * force * dt;
        }
        star.vx = (star.vx - star.ox * 9 * dt) * Math.exp(-5 * dt);
        star.vy = (star.vy - star.oy * 9 * dt) * Math.exp(-5 * dt);
        star.ox += star.vx * dt; star.oy += star.vy * dt;
        const x = width / 2 + (baseX - width / 2) * (1 + warp * 60) + star.ox;
        const y = height / 2 + (baseY - height / 2) * (1 + warp * 60) + star.oy;
        const fade = Math.min(1, star.age / .8, (star.life - star.age) / 1.2) * (1 - warp);
        if (x < -100 || x > width + 100 || y < -100 || y > height + 100 || fade <= 0) continue;
        displayed++;
        if (star.depth > 0) distantDisplayed++;
        const depthBrightness = 1 - star.depth * .7 * (1 - warp);
        const size = star.size * (1 - star.depth * .55 * (1 - warp));
        context.globalAlpha = Math.max(0, fade) * depthBrightness * (.45 + .25 * Math.sin(now * .0018 + star.phase));
        if (Math.abs(warp - lastWarp) > .00001) {
          const tail = Math.min(.16, Math.abs(warp - lastWarp) * 18);
          const sign = target.current === 1 ? -1 : 1;
          context.lineWidth = size * .8;
          context.beginPath(); context.moveTo(x, y);
          context.lineTo(x + (x - width / 2) * tail * sign, y + (y - height / 2) * tail * sign); context.stroke();
        }
        context.beginPath(); context.arc(x, y, size, 0, Math.PI * 2); context.fill();
        if (size > 1.3) {
          context.lineWidth = .6; context.beginPath();
          context.moveTo(x - size * 3, y); context.lineTo(x + size * 3, y);
          context.moveTo(x, y - size * 3); context.lineTo(x, y + size * 3); context.stroke();
        }
      }
      context.globalAlpha = 1;
      node.dataset.progress = progress.toFixed(3);
      node.dataset.stars = String(stars.length); node.dataset.visibleStars = String(displayed);
      node.dataset.distantStars = String(distantDisplayed);
      node.dataset.repelled = String(repelled);
      if (progress !== 1 || target.current !== 1) frame = requestAnimationFrame(draw);
    };
    const start = () => { if (!frame && visible && pageVisible && !retired) frame = requestAnimationFrame(draw); };
    wake.current = start;
    const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => {
      // Fast scrolling can queue more than one transition before delivery.
      const entry = entries[entries.length - 1];
      if (!entry) return;
      visible = entry.isIntersecting;
      if (!visible) { cancelAnimationFrame(frame); frame = 0; previous = 0; } else start();
    }) : null;
    const sizing = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
    observer?.observe(host); sizing?.observe(host);
    host.addEventListener("pointermove", move, { passive: true });
    host.addEventListener("pointerleave", leave); window.addEventListener("resize", resize);
    resize(); start();
    return () => {
      retired = true; cancelAnimationFrame(frame); observer?.disconnect(); sizing?.disconnect();
      wake.current = () => {};
      host.removeEventListener("pointermove", move); host.removeEventListener("pointerleave", leave);
      window.removeEventListener("resize", resize);
    };
  }, [reducedMotion, pageVisible, lightMotion, light, paused]);
  return reducedMotion || paused ? <div className="prism-stars prism-stars-still" aria-hidden="true" />
    : <canvas ref={canvas} className="prism-stars" aria-hidden="true" />;
}
