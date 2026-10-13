import type { WebGLRenderer } from "three";

/** Own the polling timer so stage cleanup never queries disposed materials. */
export function waitForScenePrograms(gl: WebGLRenderer, onReady: () => void, onFailure: () => void) {
  let cancelled = false;
  let timer: number | undefined;
  const context = gl.getContext();
  const parallel = context.getExtension("KHR_parallel_shader_compile");
  // Three's public info types native program handles as unknown; validate them.
  const programs = (gl.info.programs || []).map(program => program.program as WebGLProgram)
    .filter(program => context.isProgram(program));
  const deadline = performance.now() + 10_000;
  const check = () => {
    if (cancelled) return;
    try {
      if (context.isContextLost() || performance.now() >= deadline) {
        onFailure();
        return;
      }
      // A quality change can retire unrelated old scene programs while the
      // environment seeds compile. Never query those disposed native handles.
      const livePrograms = programs.filter(program => context.isProgram(program));
      if (parallel && livePrograms.some(program => !context.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR))) {
        timer = window.setTimeout(check, 10);
        return;
      }
      // Finished compilation does not imply successful linkage.
      if (livePrograms.some(program => !context.getProgramParameter(program, context.LINK_STATUS))) {
        onFailure();
        return;
      }
      onReady();
    } catch { onFailure(); }
  };
  // Unsupported drivers yield once, retaining their regular first-use path.
  timer = window.setTimeout(check, 10);
  return () => { cancelled = true; if (timer !== undefined) window.clearTimeout(timer); };
}
