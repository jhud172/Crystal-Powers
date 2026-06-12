import { ChangeEvent } from "react";

export type ContactFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  preferredContactPoint: string;
  packageSelection: string;
  maintenanceSelection: string;
  selectedAdditions: string;
  otherAdditions: string;
  message: string;
  extraInformation: string;
};

export const initialContactForm: ContactFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  preferredContactPoint: "",
  packageSelection: "",
  maintenanceSelection: "",
  selectedAdditions: "",
  otherAdditions: "",
  message: "",
  extraInformation: ""
};

type FieldErrors = Record<string, string>;

type Props = {
  form: ContactFormState;
  errors: FieldErrors;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  includeScope?: boolean;
};

export function ContactFields({ form, errors, onChange, includeScope = true }: Props) {
  return (
    <>
      <div>
        <label htmlFor="firstName" className="field-label">Name</label>
        <input id="firstName" name="firstName" value={form.firstName} onChange={onChange} type="text" className="field-input" placeholder="First name" />
        <ErrorText message={errors.firstName} />
      </div>
      <div>
        <label htmlFor="lastName" className="field-label">Last name</label>
        <input id="lastName" name="lastName" value={form.lastName} onChange={onChange} type="text" className="field-input" placeholder="Last name" />
        <ErrorText message={errors.lastName} />
      </div>
      <div>
        <label htmlFor="email" className="field-label">Email</label>
        <input id="email" name="email" value={form.email} onChange={onChange} type="email" className="field-input" placeholder="you@example.com" />
        <ErrorText message={errors.email} />
      </div>
      <div>
        <label htmlFor="phoneNumber" className="field-label">Phone number</label>
        <input id="phoneNumber" name="phoneNumber" value={form.phoneNumber} onChange={onChange} type="tel" className="field-input" placeholder="+44 7..." />
        <ErrorText message={errors.phoneNumber} />
      </div>
      <div className="services-form-span-two">
        <label htmlFor="preferredContactPoint" className="field-label">Preferred contact point</label>
        <select id="preferredContactPoint" name="preferredContactPoint" value={form.preferredContactPoint} onChange={onChange} className="field-input">
          <option value="">Choose one</option>
          <option value="WhatsApp">WhatsApp</option>
          <option value="Email">Email</option>
        </select>
        <ErrorText message={errors.preferredContactPoint} />
      </div>
      {includeScope ? (
        <>
          <input type="hidden" name="packageSelection" value={form.packageSelection} />
          <input type="hidden" name="maintenanceSelection" value={form.maintenanceSelection} />
          <input type="hidden" name="selectedAdditions" value={form.selectedAdditions} />
          <input type="hidden" name="otherAdditions" value={form.otherAdditions} />
          <ErrorText message={errors.packageSelection || errors.maintenanceSelection || errors.selectedAdditions || errors.otherAdditions} />
        </>
      ) : null}
      <div className="services-form-span-two">
        <label htmlFor="message" className="field-label">Message</label>
        <textarea id="message" name="message" value={form.message} onChange={onChange} rows={6} className="field-input resize-y" placeholder="Project type, timings, priorities, and anything important about the build." />
        <ErrorText message={errors.message} />
      </div>
      <div className="services-form-span-two">
        <label htmlFor="extraInformation" className="field-label">Extra information</label>
        <textarea id="extraInformation" name="extraInformation" value={form.extraInformation} onChange={onChange} rows={4} className="field-input resize-y" placeholder="Anything else that should shape the quote or delivery plan." />
        <ErrorText message={errors.extraInformation} />
      </div>
    </>
  );
}

export function ErrorText({ message }: { message?: string }) {
  return message ? <p className="field-error">{message}</p> : null;
}
