import { useId, useState } from "react";

export function PasswordField({ label, name, fresh = false, confirm }: { label: string; name?: string; fresh?: boolean; confirm?: string }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return <div className="admin-password-field">
    <label htmlFor={id}>{label}</label>
    <div className="admin-password-control">
      <input id={id} name={name} type={visible ? "text" : "password"} autoComplete={fresh || confirm ? "new-password" : "current-password"} required minLength={fresh ? 12 : undefined} maxLength={256} data-new-password={fresh || undefined} data-confirm-password={confirm} aria-describedby={fresh ? `${id}-hint` : undefined} onInput={event => { event.currentTarget.setCustomValidity(""); event.currentTarget.form?.querySelectorAll<HTMLInputElement>("[data-confirm-password]").forEach(input => input.setCustomValidity("")); }} />
      <button type="button" className="admin-password-toggle" aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible} aria-controls={id} onClick={() => setVisible(value => !value)}>{visible ? "Hide" : "Show"}</button>
    </div>
    {fresh && <small id={`${id}-hint`}>At least 12 characters; no more than 72 UTF-8 bytes. A long, unique passphrase works well.</small>}
  </div>;
}

// Confirmation fields have no name and never enter an API payload.
export function validateOwnerPasswords(form: HTMLFormElement) {
  for (const input of form.querySelectorAll<HTMLInputElement>("[data-new-password], [data-confirm-password]")) {
    input.setCustomValidity("");
    if (input.dataset.newPassword && new TextEncoder().encode(input.value).length > 72) input.setCustomValidity("Use no more than 72 UTF-8 bytes. Accented characters and emoji can use several bytes each.");
    const original = input.dataset.confirmPassword && form.elements.namedItem(input.dataset.confirmPassword);
    if (original instanceof HTMLInputElement && original.value !== input.value) input.setCustomValidity("Enter the same new password in both fields.");
    if (!input.reportValidity()) return false;
  }
  return true;
}
