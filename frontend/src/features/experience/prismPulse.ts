export const PRISM_PULSE_DURATION = 2.4;
const RISE = 0.9;

const ease = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/** A soft rise and longer fade; a repeated click starts at the current brightness. */
export function prismPulseEnergy(elapsed: number, initial = 0): number {
  if (elapsed >= PRISM_PULSE_DURATION) return 0;
  const start = Math.max(0, Math.min(1, initial));
  if (elapsed <= RISE) return start + (1 - start) * ease(elapsed / RISE);
  return 1 - ease((elapsed - RISE) / (PRISM_PULSE_DURATION - RISE));
}
