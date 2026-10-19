import { keepModalFocus } from "../../lib/dialogFocus";
import { useEffect, useRef, useState } from "react";
import { api, clearCsrf } from "../portfolio/projectApi";
import { OwnerError } from "./OwnerError";
import { OwnerSession, OwnerSignIn } from "./OwnerSignIn";

export function OwnerReauthentication({ hasDraft, onResume, onClose, onLeave }: { hasDraft: boolean; onResume: (session: OwnerSession) => void; onClose: () => void; onLeave: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [session, setSession] = useState<OwnerSession | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => { dialog.current?.showModal(); heading.current?.focus(); return () => { dialog.current?.close(); }; }, []);
  useEffect(() => {
    let live = true;
    clearCsrf(); setSession(null); setError("");
    void api<OwnerSession>("/api/admin/auth/session").then(value => { if (live) setSession({ ...value, setupAvailable: false }); }).catch(failure => { if (live) setError((failure as Error).message); });
    return () => { live = false; };
  }, [attempt]);
  function leave() {
    if (busy || !window.confirm(hasDraft ? "Discard the unsaved edits held in this tab and leave for the public site? Your last saved draft will remain private; the public version stays as it is." : "Leave the owner studio for the public site?")) return;
    dialog.current?.close(); onLeave();
  }
  return <dialog ref={dialog} onKeyDown={keepModalFocus} className="admin-reauth" aria-labelledby="session-heading" aria-describedby="session-explanation" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="admin-session-summary"><p className="studio-eyebrow">OWNER STUDIO / SESSION ENDED</p><h2 id="session-heading" ref={heading} tabIndex={-1}>Sign in to continue.</h2>
      <p id="session-explanation">{hasDraft ? "Your current draft stays in this tab while you sign in, including through a failed attempt. Refreshing or closing the tab will lose unsaved edits." : "Sign in again to make changes in the owner studio."} Nothing has been retried automatically. After signing in, review and retry the action yourself.</p>
      <div className="admin-session-actions"><button className="admin-secondary" disabled={busy} onClick={onClose}>{hasDraft ? "Return to my draft" : "Return to the studio"}</button><button className="admin-text-button" disabled={busy} onClick={leave}>{hasDraft ? "Discard and leave" : "Leave for the public site"}</button></div>
      {!session && !error && <p role="status">Checking your sign-in state…</p>}<OwnerError message={error} />{error && <button className="admin-secondary" onClick={() => setAttempt(value => value + 1)}>Retry session check</button>}
      {session?.authenticated && <button className="studio-button" onClick={() => onResume(session)}>Return to editing ↗</button>}
    </div>
    {session && !session.authenticated && <OwnerSignIn initial={session} onSignedIn={onResume} onBusyChange={setBusy} />}
  </dialog>;
}
