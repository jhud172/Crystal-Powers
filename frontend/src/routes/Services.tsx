import { ModelStage } from "../features/experience/ModelStage";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { ContactFields, ContactFormState, ErrorText, initialContactForm } from "../features/contact/FormFields";
import { additions, maintenanceOptions, packages, SelectOption } from "../features/services/services";
import { useFormFeedback } from "../features/contact/useFormFeedback";

type ApiResult = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

export function Services() {
  const [form, setForm] = useState<ContactFormState>(initialContactForm);
  const [selectedAdditions, setSelectedAdditions] = useState<string[]>([]);
  const [otherAddition, setOtherAddition] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [status, setStatus] = useState<ApiResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  useFormFeedback(status);

  const selectedPackage = useMemo(() => packages.find((item) => item.value === form.packageSelection), [form.packageSelection]);
  const selectedMaintenance = useMemo(() => maintenanceOptions.find((item) => item.value === form.maintenanceSelection), [form.maintenanceSelection]);
  const selectedAddonItems = additions.filter((item) => selectedAdditions.includes(item.value));

  function updateForm(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function selectPackage(option: SelectOption) {
    setForm((current) => ({ ...current, packageSelection: option.value }));
  }

  function selectMaintenance(option: SelectOption) {
    setForm((current) => ({ ...current, maintenanceSelection: option.value }));
  }

  function toggleAddition(value: string) {
    setSelectedAdditions((current) => {
      const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
      setForm((formState) => ({ ...formState, selectedAdditions: next.join("|") }));
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    const body = new FormData();
    Object.entries({
      ...form,
      selectedAdditions: selectedAdditions.join("|"),
      otherAdditions: otherAddition
    }).forEach(([key, value]) => body.append(key, value));

    Array.from(files ?? []).forEach((file) => body.append("referenceFiles", file));

    try {
      const response = await fetch("/api/services", { method: "POST", body });
      const result = (await response.json()) as ApiResult;
      setStatus(result);
      if (result.success) {
        setForm(initialContactForm);
        setSelectedAdditions([]);
        setOtherAddition("");
        setFiles(null);
        if (fileInput.current) fileInput.current.value = "";
      }
    } catch {
      setStatus({ success: false, message: "The request could not be sent right now. Please try again shortly." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="studio-services-page studio-interior">
      <header className="studio-page-heading studio-section studio-heading-with-art"><div className="studio-heading-copy"><p className="studio-eyebrow">SERVICES / BUILT AROUND YOUR AMBITION</p><h1>Something<br />uniquely yours.</h1><p className="studio-page-lead">Websites that make an impression. Apps that make things possible. Bespoke systems that make work simpler.</p><div className="studio-actions"><a href="#main-packages-heading" className="studio-button">Explore website packages ↓</a><NavLink to="/contact" className="studio-text-link">Discuss an app or bespoke build ↗</NavLink></div></div><ModelStage model="monitor" title="Explore the desktop display" className="studio-heading-art" /></header>

      <section className="pricing-shell" aria-labelledby="main-packages-heading">
        <div className="pricing-header services-section-header">
          <div>
            <p className="section-tag">Main packages</p>
            <h2 id="main-packages-heading" className="mt-3 font-display text-3xl text-white sm:text-4xl">Find your starting point.</h2>
          </div>
          <p className="services-section-copy">Choose a package to shape your enquiry. We’ll confirm the final scope and cost together before work begins.</p>
        </div>
        <div className="pricing-grid services-choice-grid">
          {packages.map((option) => (
            <ChoiceCard key={option.value} option={option} selected={form.packageSelection === option.value} onSelect={() => selectPackage(option)} />
          ))}
        </div>
      </section>

      <div className="section-divider" aria-hidden="true" />

      <section className="pricing-shell" aria-labelledby="additions-heading">
        <div className="pricing-header services-section-header">
          <div>
            <p className="section-tag">Additions</p>
            <h2 id="additions-heading" className="mt-3 font-display text-3xl text-white">Optional additions</h2>
          </div>
          <p className="services-section-copy">Tick only the items that improve the final result.</p>
        </div>
        <div className="addon-grid services-addon-grid">
          {additions.map((option) => (
            <button key={option.value} type="button" aria-pressed={selectedAdditions.includes(option.value)} className={`addon-select-card choice-card-button${selectedAdditions.includes(option.value) ? " is-selected" : ""}`} onClick={() => toggleAddition(option.value)}>
              <span className="addon-select-shell">
                <span className="addon-select-title">{option.title}</span>
                <span className="addon-select-copy">{option.description}</span>
                <span className="addon-select-price">{option.price}</span>
              </span>
            </button>
          ))}
        </div>
        {selectedAdditions.includes("Other") ? (
          <div className="services-form-shell mt-6">
            <label htmlFor="otherAdditions" className="field-label">Other additions</label>
            <textarea id="otherAdditions" value={otherAddition} onChange={(event) => setOtherAddition(event.target.value)} className="field-input resize-y" rows={3} placeholder="Add any custom additions that should be manually scoped." />
          </div>
        ) : null}
      </section>

      <div className="section-divider" aria-hidden="true" />

      <section className="pricing-shell" aria-labelledby="maintenance-heading">
        <div className="pricing-header services-section-header">
          <div>
            <p className="section-tag">Maintenance</p>
            <h2 id="maintenance-heading" className="mt-3 font-display text-3xl text-white">Select one maintenance option</h2>
          </div>
          <p className="services-section-copy">This field is required so the ongoing support expectation is clear from the start.</p>
        </div>
        <div className="maintenance-grid services-choice-grid services-maintenance-grid">
          {maintenanceOptions.map((option) => (
            <ChoiceCard key={option.value} option={option} selected={form.maintenanceSelection === option.value} onSelect={() => selectMaintenance(option)} />
          ))}
        </div>
      </section>

      <section className="services-summary-dock" aria-hidden="false">
        <div className="services-summary-shell">
          <div className="pricing-header services-section-header services-summary-header">
            <div>
              <p className="section-tag">Selection preview</p>
              <h2 className="mt-3 font-display text-3xl text-white">Your next chapter starts here.</h2>
            </div>
          </div>
          <div className="services-summary-grid">
            <aside className="services-summary-compact">
              <SummaryBlock label="Package" value={selectedPackage?.title ?? "Not selected"} meta={selectedPackage ? `${selectedPackage.price} - ${selectedPackage.note}` : "Select one package above."} />
              <SummaryBlock label="Maintenance" value={selectedMaintenance?.title ?? "Not selected"} meta={selectedMaintenance ? `${selectedMaintenance.price} - ${selectedMaintenance.note}` : "Select one maintenance option above."} />
              <div className="services-summary-block services-summary-block-compact">
                <p className="services-summary-label">Additions</p>
                <ul className="services-summary-chip-list">
                  {selectedAddonItems.length ? selectedAddonItems.map((addon) => <li key={addon.value} className="services-summary-chip">{addon.title}</li>) : <li className="services-summary-chip services-summary-chip-muted">No additions selected</li>}
                </ul>
              </div>
            </aside>
            <form className="services-quote-form" onSubmit={submit} encType="multipart/form-data" noValidate>
              {status ? <div role={status.success ? "status" : "alert"} className={`premium-message form-status ${status.success ? "premium-message-success" : "premium-message-error"}`}>{status.message}</div> : null}
              <ContactFields form={form} errors={status?.fieldErrors ?? {}} onChange={updateForm} />
              <div className="services-form-span-two">
                <label htmlFor="referenceFiles" className="field-label">Photos / video upload</label>
                <div className="services-file-picker">
                  <input ref={fileInput} id="referenceFiles" name="referenceFiles" type="file" className="services-file-input" accept="image/*,video/*" multiple onChange={(event) => setFiles(event.target.files)} aria-invalid={!!status?.fieldErrors?.referenceFiles} aria-describedby="uploads-error" />
                  <label htmlFor="referenceFiles" className="services-file-trigger">Choose files</label>
                  <p className="services-file-caption">{files?.length ? `${files.length} file${files.length === 1 ? "" : "s"} chosen` : "No files chosen"}</p>
                </div>
                <p className="services-upload-note">Accepted: images or short videos, up to five files and 15MB total across the whole request.</p>
                <ErrorText id="uploads-error" message={status?.fieldErrors?.referenceFiles} />
              </div>
              <div className="services-form-span-two services-form-submit">
                <p className="services-form-legal">Submitting sends the request with your selections, message, and any attached files that fit the upload limit.</p>
                <button type="submit" className="primary-button w-full sm:w-auto" disabled={isSubmitting}>{isSubmitting ? "Sending..." : "Send build request"}</button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

function ChoiceCard({ option, selected, onSelect }: { option: SelectOption; selected: boolean; onSelect: () => void }) {
  return (
    <article className={`service-choice-card${selected ? " service-choice-card-featured" : ""}`}>
      <button type="button" className="service-choice-shell choice-card-button" onClick={onSelect} aria-pressed={selected}>
        <span className="service-choice-head">
          <span>
            <span className="service-choice-tier">{option.value}</span>
            <span className="service-choice-title">{option.title}</span>
          </span>
          <span className="service-choice-price-group">
            <span className="service-choice-price">{option.price}</span>
            <span className="service-choice-price-note">{option.note}</span>
          </span>
        </span>
        <span className="service-choice-copy">{option.description}</span>
        <ul className="service-choice-list">
          {option.points.map((point) => <li key={point}>{point}</li>)}
        </ul>
      </button>
    </article>
  );
}

function SummaryBlock({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className="services-summary-block services-summary-block-compact">
      <p className="services-summary-label">{label}</p>
      <p className="services-summary-value">{value}</p>
      <p className="services-summary-meta">{meta}</p>
    </div>
  );
}
