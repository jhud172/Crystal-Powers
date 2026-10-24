/** A usable local preview needs the real application API, not just built assets. */
if (process.env.CRYSTAL_FRONTEND_ONLY === '1') {
  console.warn('Frontend-only preview requested. Portfolio, accounts and forms require the backend.');
} else {
  try {
    const origin = 'http://127.0.0.1:8080';
    const health = await fetch(origin + '/api/health', { signal: AbortSignal.timeout(5000) });
    if (!health.ok || (await health.json()).status !== 'up') throw new Error('Health check failed.');
    const projects = await fetch(origin + '/api/projects', { signal: AbortSignal.timeout(5000) });
    if (!projects.ok || !projects.headers.get('content-type')?.includes('application/json') || !Array.isArray(await projects.json())) throw new Error('The published-project API is not ready.');
    console.log('Crystal Powers backend is ready on 127.0.0.1:8080.');
  } catch {
    console.error('The local backend is not ready. Starting only Vite leaves portfolio, account and form requests unavailable.');
    console.error("From the repository root, set SKIP_FRONTEND_BUILD=1 and run gradlew.bat bootRun --args='--spring.profiles.active=local'. Then retry npm run preview.");
    console.error('For intentional UI-only QA, explicitly set CRYSTAL_FRONTEND_ONLY=1.');
    process.exitCode = 1;
  }
}
