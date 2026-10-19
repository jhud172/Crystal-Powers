import type { KeyboardEvent } from "react";

/** Keep sequential focus in an open native modal; browser shortcuts stay native. */
export function keepModalFocus(event: KeyboardEvent<HTMLDialogElement>) {
  const dialog = event.currentTarget;
  if (event.key !== "Tab" || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented || !dialog.matches(":modal")) return;
  const controls = [...dialog.querySelectorAll<HTMLElement>('a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]')]
    .filter(element => element.tabIndex >= 0 && !element.matches(":disabled") && !element.closest("[inert]") && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden");
  if (!controls.length) { event.preventDefault(); dialog.focus(); return; }
  const index = controls.indexOf(document.activeElement as HTMLElement);
  if (event.shiftKey ? index <= 0 : index < 0 || index === controls.length - 1) {
    event.preventDefault();
    controls[event.shiftKey ? controls.length - 1 : 0].focus();
  }
}
