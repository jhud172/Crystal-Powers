import { ModelStage } from "../features/experience/ModelStage";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { ContactFields, ContactFormState, ErrorText, initialContactForm } from "../features/contact/FormFields";
import { useFormFeedback } from "../features/contact/useFormFeedback";
import { additions, maintenanceOptions, packages } from "../features/services/services";

type ApiResult = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

export function Contact() {
  const [form, setForm] = useState<ContactFormState>(initialContactForm);
  const [status, setStatus] = useState<ApiResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  useFormFeedback(status);

  const selectedPackage = useMemo(() => packages.find((item) => item.value === form.packageSelection), [form.packageSelection]);
  const selectedMaintenance = useMemo(() => maintenanceOptions.find((item) => item.value === form.maintenanceSelection), [form.maintenanceSelection]);
  const selectedAdditions = form.selectedAdditions.split("|").filter(Boolean);

  function updateForm(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));

    try {
      const response = await fetch("/api/contact", { method: "POST", body });
      const result = (await response.json()) as ApiResult;
      setStatus(result);
      if (result.success) {
        setForm(initialContactForm);
      }
    } catch {
      setStatus({ success: false, message: "The request could not be sent right now. Please try again shortly." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="studio-contact studio-interior">
      <header className="studio-page-heading studio-section studio-heading-with-art"><div className="studio-heading-copy"><p className="studio-eyebrow">CONTACT / A GOOD PLACE TO START</p><h1>What do you<br />have in mind?</h1><p className="studio-page-lead">A first idea, a business ready for something new, or an app you’ve been thinking about. Tell me a little about it.</p><div className="studio-actions"><a href="#contact-builder" className="studio-button">Start the conversation ↓</a><a href="/services" className="studio-text-link">Explore services ↗</a></div></div><ModelStage model="phone" title="Explore the mobile display" className="studio-heading-art" /></header>
      <section className="contact-builder" id="contact-builder">
        <aside className="contact-preview-column">
          <div className="contact-preview-intro">
            <span className="studio-eyebrow">YOUR PROJECT</span>
            <h2 className="services-hero-title">Let’s make<br />a beginning.</h2>
            <p className="services-hero-body">You’ll speak directly with James. Not sure where your idea fits? Choose a tailored project scope and we can work through the details together.</p>
          </div>
          <div className="contact-preview-shell">
            <Preview label="Selected package" value={selectedPackage?.title ?? "Nothing selected yet"} meta={selectedPackage ? `${selectedPackage.price} - ${selectedPackage.note}` : "Choose a package from the form."} />
            <div className="services-summary-block contact-preview-card">
              <p className="services-summary-label">Selected additions</p>
              <ul className="services-summary-chip-list">
                {selectedAdditions.length ? selectedAdditions.map((addon) => <li key={addon} className="services-summary-chip">{addon}</li>) : <li className="services-summary-chip services-summary-chip-muted">No additions selected</li>}
              </ul>
            </div>
            <Preview label="Maintenance" value={selectedMaintenance?.title ?? "Nothing selected yet"} meta={selectedMaintenance ? `${selectedMaintenance.price} - ${selectedMaintenance.note}` : "Choose one support level."} />
            <Preview label="Contact preference" value={form.preferredContactPoint || "Not set yet"} meta={[form.firstName, form.lastName].filter(Boolean).join(" ") || "Fill in your details on the right."} />
          </div>
        </aside>
        <div className="services-form-shell contact-form-shell">
          <div className="services-form-intro contact-form-intro">
            <p className="section-tag">LET’S TALK</p>
            <h2 className="mt-3 font-display text-3xl text-white">A little about you.<br />A little about your idea.</h2>
          </div>
          {status ? <div role={status.success ? "status" : "alert"} className={`premium-message form-status ${status.success ? "premium-message-success" : "premium-message-error"}`}>{status.message}</div> : null}
          <form className="contact-builder-form" onSubmit={submit} noValidate>
            <section className="contact-form-section services-form-span-two">
              <div className="contact-form-section-head">
                <div>
                  <p className="section-tag">Contact details</p>
                  <h3 className="contact-form-section-title">How can I reach you?</h3>
                </div>
              </div>
              <div className="contact-form-section-grid">
                <ContactFields form={form} errors={status?.fieldErrors ?? {}} onChange={updateForm} includeScope={false} />
              </div>
            </section>
            <section className="contact-form-section services-form-span-two">
              <div className="contact-form-section-head">
                <div>
                  <p className="section-tag">Build scope</p>
                  <h3 className="contact-form-section-title">What kind of help do you need?</h3>
                </div>
              </div>
              <div className="contact-select-stack">
                <label className="field-label" htmlFor="packageSelection">Package</label>
                <select id="packageSelection" name="packageSelection" className="field-input" value={form.packageSelection} onChange={updateForm} aria-invalid={!!status?.fieldErrors?.packageSelection} aria-describedby="package-error" required>
                  <option value="">Select package</option>
                  {packages.map((item) => <option key={item.value} value={item.value}>{item.title}</option>)}
                </select>
                <ErrorText id="package-error" message={status?.fieldErrors?.packageSelection} />
                <label className="field-label" htmlFor="selectedAdditions">Additions</label>
                <select id="selectedAdditions" name="selectedAdditions" className="field-input" value={form.selectedAdditions} onChange={updateForm}>
                  <option value="">No additions selected</option>
                  {additions.map((item) => <option key={item.value} value={item.value}>{item.title}</option>)}
                </select>
                {form.selectedAdditions === "Other" && <><label htmlFor="otherAdditions" className="field-label">Custom additions</label><textarea id="otherAdditions" name="otherAdditions" className="field-input" value={form.otherAdditions} onChange={updateForm} rows={3} maxLength={1500} /><ErrorText message={status?.fieldErrors?.otherAdditions} /></>}
                <label className="field-label" htmlFor="maintenanceSelection">Maintenance</label>
                <select id="maintenanceSelection" name="maintenanceSelection" className="field-input" value={form.maintenanceSelection} onChange={updateForm} aria-invalid={!!status?.fieldErrors?.maintenanceSelection} aria-describedby="maintenance-error" required>
                  <option value="">Select maintenance</option>
                  {maintenanceOptions.map((item) => <option key={item.value} value={item.value}>{item.title}</option>)}
                </select>
                <ErrorText id="maintenance-error" message={status?.fieldErrors?.maintenanceSelection} />
              </div>
            </section>
            <div className="contact-form-submit services-form-span-two">
              <p className="contact-form-submit-note">Your details are used to respond to your enquiry. Sending this form doesn’t commit you to a project or payment.</p>
              <button type="submit" className="primary-button w-full sm:w-auto" disabled={isSubmitting}>{isSubmitting ? "Sending..." : "Send build request"}</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

function Preview({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className="services-summary-block contact-preview-card">
      <p className="services-summary-label">{label}</p>
      <p className="services-summary-value contact-preview-compact">{value}</p>
      <p className="services-summary-meta">{meta}</p>
    </div>
  );
}
