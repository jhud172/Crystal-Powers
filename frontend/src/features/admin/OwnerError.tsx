import { useEffect, useRef } from "react";

export function OwnerError({ message }: { message: string }) {
  const alert = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (message) alert.current?.focus(); }, [message]);
  return message ? <p ref={alert} className="admin-error" role="alert" tabIndex={-1}>{message}</p> : null;
}
