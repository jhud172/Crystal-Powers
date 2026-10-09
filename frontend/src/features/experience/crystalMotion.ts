/** Velocity easing preserves position when an unfolding gesture is reversed. */
export function advanceCrystalMotion(time: number, speed: number, direction: 1 | -1, duration: number, delta: number) {
  const dt = Math.min(Math.max(delta, 0), .1);
  const nextSpeed = speed + (direction - speed) * (1 - Math.exp(-14 * dt));
  const nextTime = Math.max(0, Math.min(duration, time + nextSpeed * dt));
  return { time: nextTime, speed: nextSpeed, finished: direction === 1 ? nextTime === duration : nextTime === 0 };
}
