# 03 - React And TypeScript

## Purpose

Use for `.tsx` and `.ts` implementation work in `frontend/src/`.

## Rules

- Use strict typing and typed component props.
- Avoid unnecessary `any`; explain any unavoidable use.
- Use discriminated unions where they simplify state or API handling.
- Type API responses, route params, and event handlers.
- Do not store derived state.
- Use `useMemo` and `useCallback` only for clear performance or referential-stability needs.
- Avoid React state for pointer movement or animation-frame data.
- Avoid effects for pure calculations.
- Clean up event listeners, observers, timers, and animation frames.
- Preserve React StrictMode compatibility.
- Prevent state updates after unmount.
- Use semantic elements and accessible controls.
- Use stable keys; avoid array-index keys when order can change.
- Use context only for genuinely stable shared state.

## Explain When Used

Explain any use of context, reducers, memoisation, refs, or imperative DOM access.

## Validation

Run `npm run build` for meaningful TypeScript/React changes. Check browser behaviour for changed interactive flows.

## Failure Conditions

- Leaking listeners or observers.
- Uncontrolled state changes after unmount.
- Untyped API contracts.
- Pointer movement causing React rerenders.

