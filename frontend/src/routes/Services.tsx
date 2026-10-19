import { useEffect, useRef, useState } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { enquiryIntents, isEnquiryIntent, useEnquiry } from "../features/contact/EnquiryContext";
import { ScopeFields } from "../features/contact/ScopeFields";
import { additions, maintenanceOptions, packages } from "../features/services/services";
import { ServiceExample } from "../features/services/ServiceExample";

const steps = ["Starting point", "Additions", "Aftercare", "Review"];
export function Services() {
  const { form, setForm } = useEnquiry();
  const [search, setSearch] = useSearchParams();
  const step = Math.max(0, Math.min(3, Math.trunc(Number(search.get("step"))) || 0));
  const heading = useRef<HTMLHeadingElement>(null);
  const [error, setError] = useState("");
  const [fieldErrors,setFieldErrors]=useState<Record<string,string>>({});
  const incoming = search.get("intent");
  useEffect(() => {
    setForm(current => {
      const requested = isEnquiryIntent(incoming) && ["website", "app", "system"].includes(incoming) ? incoming : null;
      const intent = requested ?? (["website", "app", "system"].includes(current.intent) ? current.intent : "website");
      return intent === current.intent ? current : { ...current, intent };
    });
  }, [incoming, setForm]);
  useEffect(() => {
    const invalidField = Object.keys(fieldErrors)[0];
    if(invalidField)document.getElementById(invalidField)?.focus();
    else if(search.has("step"))heading.current?.focus({preventScroll:true});
  },[step,search,error,fieldErrors]);
  function move(next: number) {
    if(next>step){
      const invalid=!form.packageSelection ? {step:0,field:"packageSelection",message:"Choose a starting point or discuss the scope with James."}
        : next>1 && form.selectedAdditions.split("|").includes("Other") && !form.otherAdditions.trim() ? {step:1,field:"otherAdditions",message:"Describe your custom additions before continuing."}
        : next>2 && !form.maintenanceSelection ? {step:2,field:"maintenanceSelection",message:"Choose aftercare or discuss it later."} : null;
      if(invalid){setError(invalid.message);setFieldErrors({[invalid.field]:invalid.message});if(invalid.step===step)document.getElementById(invalid.field)?.focus();setSearch({intent:form.intent,step:String(invalid.step)});return;}
    }
    setFieldErrors({});
    setError(""); setSearch({ intent: form.intent, step: String(next) });
  }
  const summary = <dl><div><dt>One-time build</dt><dd>{packages.find(item => item.value === form.packageSelection)?.title ?? (form.packageSelection || "Choose a starting point")}<small>{packages.find(item => item.value === form.packageSelection)?.price ?? "To be scoped"}</small></dd></div><div><dt>Optional additions</dt><dd>{form.selectedAdditions.split("|").filter(Boolean).length} selected{form.selectedAdditions && <small>{additions.filter(item => form.selectedAdditions.split("|").includes(item.value)).map(item => `${item.title} (${item.price})`).join(" · ")}</small>}</dd></div><div><dt>Monthly aftercare</dt><dd>{maintenanceOptions.find(item => item.value === form.maintenanceSelection)?.title ?? (form.maintenanceSelection || "Choose a plan or discuss later")}<small>{maintenanceOptions.find(item => item.value === form.maintenanceSelection)?.price ?? "To be discussed"}</small></dd></div></dl>;
  return <div className="studio-interior enquiry-page services-workspace liquid-interior"><header className="enquiry-heading"><p className="studio-eyebrow">CRYSTAL POWERS / SERVICES</p><h1>Your ambition.<br /><span>Made possible.</span></h1><p>Distinctive websites, useful apps and systems that make everyday work simpler.</p></header>
    <div className="enquiry-purpose" role="group" aria-label="Choose a service">{enquiryIntents.slice(0, 3).map(item => <button key={item.value} aria-pressed={form.intent === item.value} onClick={() => { setForm(current => ({ ...current, intent: item.value })); setSearch({ intent: item.value }); setError("");setFieldErrors({}); }}>{item.label}</button>)}</div>
    {form.intent === "website" ? <div className="enquiry-layout"><section className="enquiry-builder"><ol className="enquiry-steps" aria-label="Website brief progress">{steps.map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined}><button type="button" onClick={() => move(index)}>{String(index + 1).padStart(2, "0")}<span>{label}</span></button></li>)}</ol><h2 tabIndex={-1} ref={heading}>{["What does your website need?", "Add only what helps.", "Plan what happens next.", "Your starting brief."][step]}</h2>{error && <p className="field-error" role="alert">{error}</p>}
      {step < 3 ? <ScopeFields errors={fieldErrors} section={(["package", "additions", "aftercare"] as const)[step]} /> : <><div className="enquiry-review">{summary}</div><p className="enquiry-note">This is a starting brief, not a binding quote. The final scope and costs are agreed together.</p></>}
      <div className="enquiry-actions">{step > 0 && <button className="studio-text-link" onClick={() => move(step - 1)}>← Back</button>}{step < 3 ? <button className="studio-button" onClick={() => move(step + 1)}>Continue →</button> : <NavLink className="studio-button" to="/contact?intent=website&from=services">Add your details ↗</NavLink>}</div><NavLink to="/contact?intent=general" className="studio-text-link">Just have a question? ↗</NavLink></section><aside className="enquiry-aside"><details open className="enquiry-summary"><summary>Your brief so far</summary>{summary}<p className="enquiry-note">Selections stay with you while you move between Services and Contact. Refreshing clears this visit's brief.</p></details></aside></div> : <section className="enquiry-bespoke"><p className="studio-eyebrow">{form.intent === "app" ? "APPS & DIGITAL PRODUCTS" : form.intent === "system" ? "BESPOKE SYSTEMS" : "A CONVERSATION FIRST"}</p><h2>{form.intent === "app" ? "A useful idea, ready to take shape." : form.intent === "system" ? "Make the work flow better." : "Tell James what you need."}</h2><p>{form.intent === "app" ? "We’ll discuss the people using your product, the actions they need to take and the right platform for the job." : form.intent === "system" ? "Client portals, integrations and automation built around the way your business operates." : "You can ask a question or request help without choosing a website package."}</p><ol><li>Understand the users and the problem.</li><li>Agree the scope and technical approach.</li><li>Design, build, test and hand over.</li></ol><NavLink to={`/contact?intent=${form.intent}&from=services`} className="studio-button">Discuss your idea ↗</NavLink></section>}
    <ServiceExample kind={form.intent === "app" ? "app" : form.intent === "system" ? "system" : "website"} />
    <section id="maintenance" className="enquiry-aftercare"><p className="studio-eyebrow">AFTER LAUNCH</p><h2>Care for the next chapter.</h2><p>Aftercare is agreed separately. Support covers the scope in your plan; new features and larger changes are scoped before work begins.</p><div>{maintenanceOptions.map(item => <details key={item.value}><summary>{item.title}<span>{item.price} / month</span></summary><p>{item.description}</p><ul>{item.points.map(point => <li key={point}>{point}</li>)}</ul></details>)}</div><NavLink to="/support" className="studio-text-link">Existing project? Get support ↗</NavLink></section>
  </div>;
}
