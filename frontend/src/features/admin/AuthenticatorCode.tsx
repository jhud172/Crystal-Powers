import { useId } from "react";

function normalise(field: HTMLInputElement) {
  const value = field.value.trim();
  const digits = value.replace(/\s+/g, "");
  field.value = /^[0-9]{6}$/.test(digits) ? digits : value;
}

export function AuthenticatorCode({ label = "Authenticator or recovery code", newAuthenticator = false, autoFocus = false }: { label?: string; newAuthenticator?: boolean; autoFocus?: boolean }) {
  const id = useId();
  return <div className="admin-code-field"><label htmlFor={id}>{label}</label><input id={id} name="code" autoComplete="one-time-code" autoCapitalize="off" spellCheck={false} inputMode={newAuthenticator ? "numeric" : "text"} pattern={newAuthenticator ? "[0-9]{6}" : undefined} required maxLength={64} autoFocus={autoFocus || newAuthenticator} aria-describedby={`${id}-hint`} onInput={event => normalise(event.currentTarget)} onBlur={event => normalise(event.currentTarget)} /><small id={`${id}-hint`}>{newAuthenticator ? "Enter the six digits from the new authenticator. You can paste a grouped code; spaces are removed." : "Enter six authenticator digits or your complete unused recovery code. Letters are supported; keep the recovery code exactly as saved."}</small></div>;
}
