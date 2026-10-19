import { useFrame } from "@react-three/fiber";

/** Samples only frames the scene already requested: no benchmark loop, timer,
 * extra draw or React state update per frame. Long demand/hidden gaps reset. */
export function RenderPerformanceProbe({ enabled, onSample }: { enabled: boolean; onSample: (interval: number, now: number) => void }) {
  useFrame((_, delta) => {
    onSample(enabled && document.visibilityState === "visible" ? delta * 1000 : 0, performance.now());
  });
  return null;
}
