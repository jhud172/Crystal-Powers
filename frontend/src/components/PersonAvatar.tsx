/** Local initials only: no avatar service, network request or extra profile data. */
export function PersonAvatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0] || "").join("").toLocaleUpperCase("en-GB") || "?";
  return <span className="workspace-person-avatar" aria-hidden="true">{initials}</span>;
}
