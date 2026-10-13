import { PrivacyLink } from "../privacy/PrivacyPublication";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { ContactFields, ErrorText } from "./FormFields";
import { enquiryIntents, useEnquiry } from "./EnquiryContext";
import { ScopeFields } from "./ScopeFields";
import { useFormFeedback } from "./useFormFeedback";
import { maintenanceOptions, packages } from "../services/services";

type Feedback = { success: boolean; message: string; fieldErrors?: Record<string, string>; requestId?: string | null };
const referenceTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm", "video/quicktime"];
const labels: Record<string, string> = { projectInterest: "Project reference", firstName: "Name", lastName: "Last name", email: "Email", phoneNumber: "Phone number", preferredContactPoint: "Contact method", message: "Message", intent: "Enquiry purpose", packageSelection: "Website starting point", maintenanceSelection: "Aftercare", otherAdditions: "Custom additions", websiteAddress: "Website address", expectedResult: "Expected result", reproductionSteps: "Steps to reproduce", referenceFiles: "Reference files" };

export function EnquiryForm({ fromServices = false }: { fromServices?: boolean }) {
  const { form, setForm, files, setFiles, sending, setSending, reset } = useEnquiry();
  const [status, setStatus] = useState<Feedback | null>(null);
  const [review, setReview] = useState(false);
  const [fileError, setFileError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reviewRef = useRef<HTMLElement>(null);
  const busy = useRef(false);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const submission = useRef<{ signature: string; key: string } | null>(null);
  const errors = status?.fieldErrors ?? {};
  useFormFeedback(status);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; request.current?.abort(); setSending(false); }; }, [setSending]);
  useEffect(() => { if (review) reviewRef.current?.focus(); }, [review]);
  useEffect(() => { setReview(false); if (!status?.success) setStatus(null); }, [form.intent]);

  function update(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
  }
  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const next = [...files, ...Array.from(event.target.files ?? [])];
    const error = next.length > 5 ? "Choose up to five files." : next.reduce((sum, file) => sum + file.size, 0) > 15 * 1024 * 1024 ? "The total upload limit is 15 MB." : next.some(file => !referenceTypes.includes(file.type)) ? "Choose JPEG, PNG, GIF, WebP, MP4, WebM or MOV files." : "";
    setFileError(error);
    if (!error) setFiles(next);
    event.target.value = "";
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    if (!review) {
      if (formRef.current?.reportValidity()) { setReview(true); setStatus(null); }
      return;
    }
    busy.current = true; setSending(true); setStatus(null);
    const controller = new AbortController(); request.current = controller;
    const body = new FormData();
    // Keep inactive purpose fields out of the submitted brief, while retaining choices for edits.
    const payload = { ...form, ...(form.intent !== "website" ? { packageSelection: "", maintenanceSelection: "", selectedAdditions: "", otherAdditions: "" } : {}), ...(form.intent !== "support" ? { websiteAddress: "", expectedResult: "", reproductionSteps: "" } : {}) };
    Object.entries(payload).forEach(([name, value]) => body.append(name, value));
    files.forEach(file => body.append("referenceFiles", file));
    try {
      const endpoint = fromServices || files.length ? "/api/services" : "/api/contact";
      const signature = JSON.stringify([endpoint, payload, files.map(file => [file.name, file.type, file.size, file.lastModified])]);
      if (!submission.current || submission.current.signature !== signature) submission.current = { signature, key: crypto.randomUUID() };
      const response = await fetch(endpoint, { method: "POST", body, headers: { "Idempotency-Key": submission.current.key }, signal: controller.signal });
      const result = await response.json() as Feedback;
      if (!mounted.current) return;
      if (!response.ok || !result.success) setReview(false);
      setStatus(result);
      if (response.ok && result.success) { submission.current = null; reset(true); setReview(false); }
    } catch {
      if (mounted.current && !controller.signal.aborted) { setReview(false); setStatus({ success: false, message: "We could not confirm that your enquiry was sent. Your details are retained; please try again shortly." }); }
    } finally { busy.current = false; if (mounted.current) setSending(false); }
  }

  if (status?.success) return <section className="enquiry-complete form-status" role="status" tabIndex={-1}><p className="studio-eyebrow">ENQUIRY SENT</p><h2>A good beginning.</h2><p>{status.message}</p>{status.requestId && <p className="enquiry-request-reference">Request reference: <code>{status.requestId}</code></p>}<p>No project or payment is agreed by sending this form.</p><button type="button" className="studio-button" onClick={() => { setStatus(null); requestAnimationFrame(() => { if (mounted.current) document.getElementById("firstName")?.focus(); }); }}>Start another enquiry ↗</button></section>;

  return <form ref={formRef} className="enquiry-form" onSubmit={submit} noValidate>
    {status && <div className="form-status enquiry-feedback" role="alert" tabIndex={-1}><h2>{status.requestId ? "Your request is saved." : "Please check your enquiry."}</h2><p>{status.message}</p>{status.requestId && <p className="enquiry-request-reference">Saved request reference: <code>{status.requestId}</code></p>}{Object.keys(errors).length > 0 && <ul>{Object.entries(errors).map(([name, message]) => <li key={name}><a href={`#${name}`} onClick={event => { event.preventDefault(); document.getElementById(name)?.focus(); }}>{labels[name] ?? name}: {message}</a></li>)}</ul>}</div>}
    <fieldset disabled={sending}>
      {form.projectInterest && <div className="enquiry-project-interest"><p>Inspired by <strong>{form.projectInterest}</strong></p><p className="enquiry-note">A reference for the conversation, not an agreed specification or quote.</p><button type="button" className="studio-text-link" onClick={() => setForm(current => ({ ...current, projectInterest: "" }))}>Remove project reference</button></div>}
      {!review ? <>
        <div className="enquiry-field-grid"><ContactFields form={form} errors={errors} onChange={update} includeScope={false} /></div>
        {form.intent === "website" && <section className="enquiry-detail"><h2>Your website brief</h2><ScopeFields errors={errors} /></section>}
        {form.intent === "support" && <section className="enquiry-detail"><h2>Help James identify the issue</h2>
          <label htmlFor="websiteAddress" className="field-label">Website address</label><input id="websiteAddress" name="websiteAddress" className="field-input" type="url" value={form.websiteAddress} onChange={update} placeholder="https://your-website.com" maxLength={2048} required aria-invalid={!!errors.websiteAddress} aria-describedby={errors.websiteAddress ? "websiteAddress-error" : undefined} /><ErrorText id="websiteAddress-error" message={errors.websiteAddress} />
          <label htmlFor="expectedResult" className="field-label">What did you expect? (optional)</label><textarea id="expectedResult" name="expectedResult" className="field-input" rows={3} maxLength={1500} value={form.expectedResult} onChange={update} aria-invalid={!!errors.expectedResult} aria-describedby={errors.expectedResult ? "expectedResult-error" : undefined} /><ErrorText id="expectedResult-error" message={errors.expectedResult} />
          <label htmlFor="reproductionSteps" className="field-label">Steps to reproduce (optional)</label><textarea id="reproductionSteps" name="reproductionSteps" className="field-input" rows={3} maxLength={2500} value={form.reproductionSteps} onChange={update} aria-invalid={!!errors.reproductionSteps} aria-describedby={errors.reproductionSteps ? "reproductionSteps-error" : undefined} /><ErrorText id="reproductionSteps-error" message={errors.reproductionSteps} />
        </section>}
        <details className="enquiry-attachments"><summary>Reference files (optional) · {files.length} selected</summary><label className="field-label" htmlFor="referenceFiles">Images or short videos</label><input id="referenceFiles" type="file" accept={referenceTypes.join(",")} multiple onChange={addFiles} aria-invalid={!!(fileError || errors.referenceFiles)} aria-describedby={fileError || errors.referenceFiles ? "upload-guidance referenceFiles-error" : "upload-guidance"} /><p id="upload-guidance" className="enquiry-note">Up to five files, 15 MB total. JPEG, PNG, GIF or WebP images; MP4, WebM or MOV videos. Images can be up to 12,000 pixels per side and 80 megapixels. Export other formats first. Files stay in this tab until you send or clear them. Do not include passwords or private account details.</p><ul>{files.map((file, index) => <li key={`${file.name}-${index}`}><span>{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</span><button type="button" onClick={() => { setFiles(current => current.filter((_, position) => position !== index)); setFileError(""); }} aria-label={`Remove ${file.name}`}>Remove</button></li>)}</ul><ErrorText id="referenceFiles-error" message={fileError || errors.referenceFiles} /></details>
      </> : <section ref={reviewRef} tabIndex={-1} className="enquiry-review"><p className="studio-eyebrow">REVIEW BEFORE SENDING</p><h2>Does this look right?</h2><dl>{Object.entries(payloadForReview(form)).filter(([, value]) => !!value).map(([name, value]) => <div key={name}><dt>{labels[name] ?? name}</dt><dd>{value}</dd></div>)}</dl><p>{files.length} reference {files.length === 1 ? "file" : "files"} attached.</p><button type="button" className="studio-text-link" onClick={() => setReview(false)}>← Edit your enquiry</button></section>}
      <p className="enquiry-note">Your details are used to respond to your enquiry. Sending does not commit you to a project, payment or aftercare plan. <PrivacyLink className="studio-text-link"/></p>
      <div className="enquiry-actions"><button className="studio-button" type="submit">{sending ? "Sending…" : review ? "Send enquiry ↗" : "Review enquiry →"}</button><button className="studio-text-link" type="button" onClick={() => setConfirmReset(true)}>Clear this enquiry</button></div>
      {confirmReset && <div className="enquiry-reset" role="group" aria-label="Confirm clearing enquiry"><p>This clears your details, choices and reference files from this tab.</p><button type="button" onClick={() => { reset(); setStatus(null); setReview(false); setFileError(""); setConfirmReset(false); }}>Clear everything</button><button type="button" onClick={() => setConfirmReset(false)}>Keep my enquiry</button></div>}
      <p className="enquiry-note">You can move between Services and Contact without losing this brief. Refreshing or closing the tab clears it.</p>
    </fieldset>
  </form>;
}

function payloadForReview(form: ReturnType<typeof useEnquiry>["form"]): Record<string, string> {
  return { intent: enquiryIntents.find(item => item.value === form.intent)?.label ?? form.intent, projectInterest: form.projectInterest, firstName: `${form.firstName} ${form.lastName}`.trim(), email: form.email, preferredContactPoint: form.preferredContactPoint, phoneNumber: form.phoneNumber, message: form.message, extraInformation: form.extraInformation,
    ...(form.intent === "website" ? { packageSelection: packages.find(item => item.value === form.packageSelection)?.title ?? form.packageSelection, maintenanceSelection: maintenanceOptions.find(item => item.value === form.maintenanceSelection)?.title ?? form.maintenanceSelection, selectedAdditions: form.selectedAdditions.split("|").join(", "), otherAdditions: form.otherAdditions } : {}),
    ...(form.intent === "support" ? { websiteAddress: form.websiteAddress, expectedResult: form.expectedResult, reproductionSteps: form.reproductionSteps } : {}) };
}
