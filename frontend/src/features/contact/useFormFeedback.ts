import { useEffect } from "react";
export function useFormFeedback(status: { success: boolean; fieldErrors?: Record<string, string> } | null) {
  useEffect(() => {
    if (!status) return;
    const firstInvalid = document.querySelector<HTMLElement>('.studio-interior [aria-invalid="true"]');
    const feedback = document.querySelector<HTMLElement>(".studio-interior .form-status");
    if (!status.success && firstInvalid) firstInvalid.focus();
    else { feedback?.setAttribute("tabindex", "-1"); feedback?.focus(); }
  }, [status]);
}
