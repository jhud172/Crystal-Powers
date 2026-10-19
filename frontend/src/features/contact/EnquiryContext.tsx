import { createContext, Dispatch, PropsWithChildren, SetStateAction, useContext, useRef, useState, type MutableRefObject } from "react";
import { ContactFormState, initialContactForm } from "./FormFields";

export const enquiryIntents = [
  { value: "website", label: "Website", detail: "A new site or a refresh." },
  { value: "app", label: "App", detail: "A useful digital product." },
  { value: "system", label: "Bespoke system", detail: "A simpler way to work." },
  { value: "general", label: "General question", detail: "A short conversation." },
  { value: "support", label: "Existing-client support", detail: "Help with a live project." }
] as const;
export type EnquiryIntent = typeof enquiryIntents[number]["value"];
export function isEnquiryIntent(value: string | null): value is EnquiryIntent {
  return enquiryIntents.some(intent => intent.value === value);
}

type Brief = {
  form: ContactFormState;
  setForm: Dispatch<SetStateAction<ContactFormState>>;
  files: File[];
  setFiles: Dispatch<SetStateAction<File[]>>;
  sending: boolean;
  setSending: Dispatch<SetStateAction<boolean>>;
  submission: MutableRefObject<{signature:string;key:string;endpoint:string} | null>;
  fileIdentity: (file:File) => string;
  reset: (keepIntent?: boolean) => void;
};
const EnquiryContext = createContext<Brief | null>(null);

/** Visit-level memory only: no personal fields or files in storage, cookies or URLs. */
export function EnquiryProvider({ children }: PropsWithChildren) {
  const [form, setForm] = useState(initialContactForm);
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const submission=useRef<{signature:string;key:string;endpoint:string} | null>(null);
  const fileIds=useRef(new WeakMap<File,string>());
  function fileIdentity(file:File){let id=fileIds.current.get(file);if(!id){id=crypto.randomUUID();fileIds.current.set(file,id);}return id;}
  return <EnquiryContext.Provider value={{ form, setForm, files, setFiles, sending, setSending, submission, fileIdentity, reset: (keepIntent = false) => { submission.current=null;fileIds.current=new WeakMap();setForm(current => ({ ...initialContactForm, ...(keepIntent ? { intent: current.intent } : {}) })); setFiles([]); } }}>{children}</EnquiryContext.Provider>;
}

export function useEnquiry() {
  const value = useContext(EnquiryContext);
  if (!value) throw new Error("Enquiry components need EnquiryProvider.");
  return value;
}
