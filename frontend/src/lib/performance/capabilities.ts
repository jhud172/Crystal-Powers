import type {
  DeviceCapabilitySnapshot,
  ExperienceFeatureFlags,
  ExperienceQualityDecision,
  PointerCapability,
  QualityLevel,
  ReducedMotionState,
} from "../../types/experience";

/** Detect whether the user prefers reduced motion. */
export function getReducedMotion(): ReducedMotionState {
  if (typeof window === "undefined") return "no-preference";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduce" : "no-preference";
}

/** Detect pointer capability (fine pointer = mouse/trackpad, coarse = touch). */
export function getPointerCapability(): PointerCapability {
  if (typeof window === "undefined") return "fine";
  if (window.matchMedia("(pointer: fine)").matches) return "fine";
  if (window.matchMedia("(pointer: coarse)").matches) return "coarse";
  return "none";
}

export function supportsHover(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover)").matches;
}

/** Check whether WebGL is supported. */
export function supportsWebGL(): boolean {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
  if (!context) return false;

  const loseContext = context.getExtension("WEBGL_lose_context");
  loseContext?.loseContext();
  return true;
}

export function getDeviceCapabilitySnapshot(): DeviceCapabilitySnapshot {
  const hasWindow = typeof window !== "undefined";
  const hasNavigator = typeof navigator !== "undefined";

  const nav = hasNavigator ? navigator : undefined;

  return {
    reducedMotion: getReducedMotion(),
    pointer: getPointerCapability(),
    hover: supportsHover(),
    webgl: supportsWebGL(),
    memoryGb: (nav as Navigator & { deviceMemory?: number } | undefined)?.deviceMemory,
    hardwareConcurrency: nav?.hardwareConcurrency ?? 4,
    viewportWidth: hasWindow ? window.innerWidth : 0,
    viewportHeight: hasWindow ? window.innerHeight : 0,
    touchPoints: nav?.maxTouchPoints ?? 0,
    saveData: Boolean((nav as Navigator & { connection?: { saveData?: boolean } } | undefined)?.connection?.saveData),
  };
}

export function isConstrainedDevice(capabilities: DeviceCapabilitySnapshot): boolean {
  const smallViewport = capabilities.viewportWidth > 0 && capabilities.viewportWidth < 768;
  const lowMemory = capabilities.memoryGb !== undefined && capabilities.memoryGb <= 4;
  const lowConcurrency = capabilities.hardwareConcurrency <= 2;
  const touchFirst = capabilities.pointer === "coarse" || capabilities.touchPoints > 0;

  return capabilities.saveData || smallViewport || lowMemory || lowConcurrency || touchFirst;
}

export function getExperienceFeatureFlags(level: QualityLevel, capabilities = getDeviceCapabilitySnapshot()): ExperienceFeatureFlags {
  const reduced = level === "reduced" || capabilities.reducedMotion === "reduce";
  const fallback = level === "fallback" || !capabilities.webgl;
  const finePointer = capabilities.pointer === "fine" && capabilities.hover;

  return {
    webgl: !fallback,
    pointerEffects: !reduced && !fallback && finePointer && level !== "mobile",
    scrollReveal: !reduced,
    cursorAura: !reduced && finePointer,
    postProcessing: level === "high" && !fallback,
    idleAnimation: !reduced && !fallback,
  };
}

/** Determine the appropriate quality level based on device capabilities. */
export function detectQualityLevel(capabilities = getDeviceCapabilitySnapshot()): QualityLevel {
  if (capabilities.reducedMotion === "reduce") return "reduced";

  if (!capabilities.webgl) return "fallback";

  if (isConstrainedDevice(capabilities)) {
    return "mobile";
  }

  if (capabilities.hardwareConcurrency >= 8 && (capabilities.memoryGb === undefined || capabilities.memoryGb >= 8)) {
    return "high";
  }

  return "standard";
}

export function getExperienceQualityDecision(): ExperienceQualityDecision {
  const capabilities = getDeviceCapabilitySnapshot();
  const level = detectQualityLevel(capabilities);

  return {
    level,
    capabilities,
    features: getExperienceFeatureFlags(level, capabilities),
  };
}
