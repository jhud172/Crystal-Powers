import { useNavigationProtection } from "../../app/NavigationProtection";

/** One-time codes stay in this page; make refresh and link exits deliberate. */
export function useRecoveryCodeExitGuard(pending: boolean) {
  useNavigationProtection(pending, "Leave without saving your recovery codes? They are shown only once. Save them privately before you leave.");
}
