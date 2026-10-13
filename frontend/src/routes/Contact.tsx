import { useEffect } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { enquiryIntents, isEnquiryIntent, useEnquiry } from "../features/contact/EnquiryContext";
import { EnquiryForm } from "../features/contact/EnquiryForm";

export function Contact() {
  const { form, setForm, sending } = useEnquiry();
  const [search] = useSearchParams();
  const incoming = search.get("intent");
  useEffect(() => { if (isEnquiryIntent(incoming)) setForm(current => ({ ...current, intent: incoming })); }, [incoming, setForm]);
  return <div className="studio-interior enquiry-page liquid-interior">
    <header className="enquiry-heading"><p className="studio-eyebrow">CRYSTAL POWERS / LET’S TALK</p><h1>A conversation.<br /><span>Something new.</span></h1><p>Tell James what you have in mind. Choose your purpose and share only the details that matter.</p></header>
    <div className="enquiry-purpose" role="group" aria-label="Enquiry purpose" id="intent">{enquiryIntents.map(item => <button type="button" disabled={sending} aria-pressed={form.intent === item.value} key={item.value} onClick={() => setForm(current => ({ ...current, intent: item.value }))}>{item.label}</button>)}</div>
    <div className="enquiry-layout"><div><EnquiryForm fromServices={search.get("from") === "services"} /></div><aside className="enquiry-aside"><p className="studio-eyebrow">DIRECTLY WITH JAMES</p><h2>Your idea.<br />A clear next step.</h2><p>One point of contact from the first conversation through design, development and handover.</p><p>Scope, timing and cost are agreed before work begins. You can ask a question without choosing a website package.</p><NavLink to="/services" className="studio-text-link">Explore services ↗</NavLink></aside></div>
  </div>;
}
