/** Announce dirty-state transitions without echoing private field values. */
export function SaveIndicator({ dirty, label }: { dirty: boolean; label: string }) {
  return <p className="workspace-save-state" role="status" data-dirty={dirty}><span aria-hidden="true">{dirty ? "○" : "✓"}</span><span>{label}: {dirty ? "unsaved changes" : "matches saved values"}.</span></p>;
}
