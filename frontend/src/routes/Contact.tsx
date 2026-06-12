import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { ContactFields, ContactFormState, initialContactForm } from "../features/contact/FormFields";
import { PageHero } from "../components/PageHero";
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
    <div className="page-stack">
      <PageHero
        eyebrow="Contact"
        signal="Structured build intake"
        title="A premium contact flow that behaves more like a guided build intake than a generic enquiry form."
        body="Shape the package, additions, maintenance, and contact routing before sending a clearer first request."
        actions={<><a href="#contact-builder" className="primary-button">Jump to the form</a><a href="/services" className="secondary-button">Review services first</a></>}
        className="contact-scene"
        visual={<div className="floating-cluster"><article className="floating-panel floating-panel-glass"><p className="floating-panel-kicker">Form logic</p><ul className="floating-list"><li>Live summary updates</li><li>Structured quote handoff</li><li>Clear scope selectors</li></ul></article></div>}
      />
      <section className="contact-builder" id="contact-builder">
        <aside className="contact-preview-column">
          <div className="contact-preview-intro">
            <span className="eyebrow">Start a build</span>
            <h1 className="services-hero-title">Shape the package, additions, and support level before the project brief is sent.</h1>
            <p className="services-hero-body">Select the build direction, add the extras you actually need, then complete the contact details.</p>
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
            <p className="section-tag">Quote request</p>
            <h2 className="mt-3 font-display text-3xl text-white">Build the request with the same structure used on the services page.</h2>
          </div>
          {status ? <div className={`premium-message form-status ${status.success ? "premium-message-success" : "premium-message-error"}`}>{status.message}</div> : null}
          <form className="contact-builder-form" onSubmit={submit} noValidate>
            <section className="contact-form-section services-form-span-two">
              <div className="contact-form-section-head">
                <div>
                  <p className="section-tag">Contact details</p>
                  <h3 className="contact-form-section-title">Add the person and reply route for the final handoff.</h3>
                </div>
              </div>
              <div className="contact-form-section-grid">
                <ContactFields form={form} errors={status?.fieldErrors ?? {}} onChange={updateForm} />
              </div>
            </section>
            <section className="contact-form-section services-form-span-two">
              <div className="contact-form-section-head">
                <div>
                  <p className="section-tag">Build scope</p>
                  <h3 className="contact-form-section-title">Select the package, additions, and maintenance path.</h3>
                </div>
              </div>
              <div className="contact-select-stack">
                <label className="field-label" htmlFor="packageSelection">Package</label>
                <select id="packageSelection" name="packageSelection" className="field-input" value={form.packageSelection} onChange={updateForm}>
                  <option value="">Select package</option>
                  {packages.map((item) => <option key={item.value} value={item.value}>{item.title}</option>)}
                </select>
                <label className="field-label" htmlFor="selectedAdditions">Additions</label>
                <select id="selectedAdditions" name="selectedAdditions" className="field-input" value={form.selectedAdditions} onChange={updateForm}>
                  <option value="">No additions selected</option>
                  {additions.map((item) => <option key={item.value} value={item.value}>{item.title}</option>)}
                </select>
                <label className="field-label" htmlFor="maintenanceSelection">Maintenance</label>
                <select id="maintenanceSelection" name="maintenanceSelection" className="field-input" value={form.maintenanceSelection} onChange={updateForm}>
                  <option value="">Select maintenance</option>
                  {maintenanceOptions.map((item) => <option key={item.value} value={item.value}>{item.title}</option>)}
                </select>
              </div>
            </section>
            <div className="contact-form-submit services-form-span-two">
              <p className="contact-form-submit-note">The completed request is sent through the same structured flow as the services builder so the quote starts with the chosen scope.</p>
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
