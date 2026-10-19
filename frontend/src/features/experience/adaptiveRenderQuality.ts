import type { RenderTier } from "./renderQuality";

const tiers: RenderTier[] = ["low", "standard", "high"];

/** Observes active frame cadence, not a GPU benchmark. Idle gaps never count as
 * slow rendering. Separate windows and cooldowns prevent quality oscillation. */
export class AdaptiveRenderQuality {
  private samples: number[] = [];
  private windowStart: number;
  private warmUntil: number;
  private changedAt: number;
  private slow = 0;
  private fast = 0;

  constructor(public tier: RenderTier, now: number) {
    this.windowStart = now;
    this.warmUntil = now + 1500;
    this.changedAt = now - 12000;
  }

  sample(interval: number, now: number): RenderTier | null {
    if (!Number.isFinite(now) || !Number.isFinite(interval)) return null;
    if (interval <= 0 || interval > 250) {
      this.samples = []; this.windowStart = now; this.slow = 0; this.fast = 0;
      return null;
    }
    if (now < this.warmUntil) { this.windowStart = now; return null; }
    this.samples.push(interval);
    if (this.samples.length < 24 || now - this.windowStart < 1000) return null;
    const sorted = this.samples.sort((a, b) => a - b);
    const p90 = sorted[Math.floor((sorted.length - 1) * .9)];
    this.samples = []; this.windowStart = now;
    this.slow = p90 > 28 ? this.slow + 1 : 0;
    this.fast = p90 < 19 ? this.fast + 1 : 0;
    const index = tiers.indexOf(this.tier);
    let next = index;
    if (this.slow >= 2 && now - this.changedAt >= 8000) next = Math.max(0, index - 1);
    else if (this.fast >= 8 && now - this.changedAt >= 12000) next = Math.min(2, index + 1);
    if (next === index) return null;
    this.tier = tiers[next]; this.changedAt = now; this.fast = 0; this.slow = 0;
    this.warmUntil = now + 1500;
    return this.tier;
  }
}
