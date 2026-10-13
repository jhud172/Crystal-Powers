# GPU rendering and startup review — 10 October 2026

## Scope and result

Twenty-four local profiles compare the retained 83872dd jar on 8084 with the birthday-fallback 2.0.0 candidate on 8085. Both use fresh installed Edge contexts on the same RTX 3070 Ti / ANGLE D3D11 desktop, DPR 2, viewport widths 390 and 1440, height 1000, no CPU/network throttle. The opening and laptop use controlled animation traces; monitor and phone use repeated native rotation controls. Case and screen data are labelled read-only local fixtures. No owner account, publication, email or API mutation was created.

`measure-render-cost-browser.cjs` measures actual draw-bearing animation callbacks with WebGL2 TIME_ELAPSED queries, polls completed results and deletes queries. Nanoseconds are converted to milliseconds; disjoint samples are rejected. All 24 profiles have valid positive samples, zero disjoint events, zero WebGL errors, one canvas and no uncaught page errors. This follows the [Khronos timer-query contract](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/). CPU callback measurements include instrumentation overhead. GPU queries exclude browser composition, event handling and full frame latency. Results do not certify a physical phone, sustained heat/battery, INP, assistive technology or production.

The laptop submits seven draws per measured callback versus 104 previously. Its desktop p95 GPU duration falls from 1.071 to 0.057 ms in these traces. Compact Automatic selects Low and submits 52 opening draws versus the legacy 104; desktop High costs more than Standard for device previews. Camera, materials, lights, geometry, quality and canvas size also differ between revisions: these are aggregate revision comparisons, not an isolated geometry speedup or a benchmark guarantee. Twenty-four rotation samples are descriptive, not a confidence interval. Sub-millisecond GPU values should not be treated as precise field forecasts.

## Actual GPU measurements

Before = retained 83872dd. After = current 2.0.0. GPU columns show median / p95 milliseconds; draws show the median; buffer dimensions are actual allocated canvas pixels.

| Revision | Viewport | Requested / actual tier | Scene | Samples | GPU ms | Draws | Buffer |
| --- | ---: | --- | --- | ---: | ---: | ---: | --- |
| before | 390 | automatic / legacy | opening | 160 | 2.007 / 3.687 | 104 | 516 × 435 |
| before | 390 | automatic / legacy | laptop | 160 | 0.034 / 1.054 | 104 | 585 × 585 |
| before | 390 | automatic / legacy | monitor | 24 | 1.625 / 3.823 | 26 | 585 × 585 |
| before | 390 | automatic / legacy | phone | 24 | 1.791 / 3.713 | 28 | 585 × 585 |
| before | 1440 | automatic / legacy | opening | 160 | 1.730 / 3.739 | 104 | 974 × 777 |
| before | 1440 | automatic / legacy | laptop | 160 | 0.066 / 1.071 | 104 | 1944 × 1015 |
| before | 1440 | automatic / legacy | monitor | 24 | 2.470 / 3.731 | 26 | 1944 × 1015 |
| before | 1440 | automatic / legacy | phone | 24 | 1.627 / 3.799 | 28 | 1944 × 1015 |
| after | 390 | automatic / low | opening | 160 | 0.027 / 1.129 | 52 | 344 × 222 |
| after | 390 | automatic / low | laptop | 160 | 0.011 / 0.013 | 7 | 390 × 460 |
| after | 390 | automatic / low | monitor | 24 | 1.004 / 3.187 | 24 | 390 × 460 |
| after | 390 | automatic / low | phone | 24 | 0.950 / 2.602 | 26 | 390 × 460 |
| after | 1440 | automatic / standard | opening | 160 | 1.721 / 3.600 | 104 | 925 × 608 |
| after | 1440 | automatic / standard | laptop | 160 | 0.050 / 0.057 | 7 | 1944 × 1015 |
| after | 1440 | automatic / standard | monitor | 24 | 1.650 / 3.029 | 26 | 1944 × 1015 |
| after | 1440 | automatic / standard | phone | 24 | 1.592 / 3.258 | 28 | 1944 × 1015 |
| after | 1440 | low / low | opening | 160 | 0.074 / 1.374 | 52 | 617 × 405 |
| after | 1440 | low / low | laptop | 160 | 0.025 / 0.028 | 7 | 1296 × 676 |
| after | 1440 | low / low | monitor | 24 | 0.992 / 3.304 | 24 | 1296 × 676 |
| after | 1440 | low / low | phone | 24 | 1.166 / 2.492 | 26 | 1296 × 676 |
| after | 1440 | high / high | opening | 160 | 1.858 / 3.828 | 104 | 1234 × 811 |
| after | 1440 | high / high | laptop | 160 | 0.084 / 0.096 | 7 | 2592 × 1353 |
| after | 1440 | high / high | monitor | 24 | 3.943 / 5.391 | 28 | 2592 × 1353 |
| after | 1440 | high / high | phone | 24 | 4.397 / 5.559 | 30 | 2592 × 1353 |

## Cold loading remains a separate failure to resolve

After GPU profiling finished, a fresh 28-profile cold run covered seven public routes × 390/1440 × live/Reduce effects. It recorded no unresolved resource failures, uncaught page errors, overflow or unexpected canvas. Home live transferred 902,974 resource bytes, excluding HTML; still Home transferred 191,054 bytes. Still Home used no canvas and reported no long task in either sample. Live Home reported 970/125 ms long tasks at 390 and 1,055 ms at 1440. Short, unthrottled desktop timings are diagnostic; these startup stalls prevent claiming complete performance acceptance despite favourable warm rendering costs.

A separate startup GL/CPU trace reproduces the issue in both revisions: legacy 1,028 ms, candidate 1,048/124 ms long tasks. Initial compile/link/draw instrumentation showed no individual slow call; this was insufficient attribution. CPU sampling instead identified Three's `WebGLProgram.onFirstUse` (minified `O`) as the hot frame. An expanded trace measures synchronous `getProgramInfoLog` waits of 401.9, 227.3, 215.9, 119.2, 87 and 76.5 ms in a repeat, overlapping 1,049/127 ms long tasks. These observations support shader-status synchronisation as the startup bottleneck in this environment. They do not establish every device's driver behaviour.

The installed Three source explains that `compileAsync` polls `KHR_parallel_shader_compile` completion and recommends asynchronous preparation. The current Drei environment also renders a cube map during setup; priming an empty main scene alone would miss that work. Disabling debug logs alone could move the wait to another first-use call and weaken error detection. No such speculative workaround was applied. The next fix must prepare environment and object shaders before first live draw, preserve still artwork/readable controls until ready, cancel safely on route/quality changes, and verify opening/reverse, all models/themes, failure/retry and reduced motion. PERF-01 stays open until the loading fix and representative interaction checks pass; PERF-03 still needs physical sustained testing.

## Reproduction and retained evidence

Use existing Playwright and Edge through `CRYSTAL_PLAYWRIGHT_MODULE` and `CRYSTAL_BROWSER_EXECUTABLE`; no dependency installation is required. `measure-render-cost-browser.cjs` uses distinct local before/after URLs; `measure-performance-browser.cjs` and `trace-scene-startup-browser.cjs` accept local `CRYSTAL_QA_URL`. Run profiling serially to avoid concurrent GPU workloads. The cold run began after the GPU run completed; its observed startup failure is not attributed to overlapping benchmark processes.

Ignored `.codex-runtime/qa/render-cost-pc/baseline-to-2-0.json` retains raw queries, renderer, dimensions and summaries. `performance-pc/after-render-cost.json` retains 28 cold profiles. `render-cost-pc/startup-gl-trace.json`, `startup-cpu-profile.json`, `startup-shader-calls.json`, `startup-trace.json` and `startup-trace.cpuprofile` retain diagnostic attribution. Reports contain local anonymous/labelled fixtures, not credentials. These 24/28 measurements do not increase the accumulated functional browser-check count.

No application code or generated assets changed in this checkpoint. Script execution and syntax checks are relevant verification; the preceding birthday candidate's frontend 664 / bootJar / static 51 / birthday 76 and dated backend 43 H2 evidence remain unchanged. The original vendor warning, eight dependency advisories and broader release gates remain open. No production deployment or client publication occurred.

Rendering-cost runtime cleanup: owned baseline session 71970/PID 58568 and candidate session 18751/PID 53852 stopped through their original sessions; PID absence verified. Original source/Vite/SMTP/private QA services remain running. Preserve the ignored retained-source node_modules junction and original credentials/data.
