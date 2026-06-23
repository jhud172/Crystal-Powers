/**
 * Reusable loading utilities for Three.js assets.
 *
 * Currently minimal — expand as asset loading requirements grow.
 * Do not create speculative loaders; only add utilities when needed.
 */

/** Preload an image by URL and return a promise. */
export function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
