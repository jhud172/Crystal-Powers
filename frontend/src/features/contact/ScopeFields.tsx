import { additions, maintenanceOptions, packages } from "../services/services";
import { ErrorText } from "./FormFields";
import { useEnquiry } from "./EnquiryContext";

const additionGroups = [
  { title: "Identity & print", items: additions.slice(0, 4) },
  { title: "Words & content", items: additions.slice(4, 6) },
  { title: "Website features", items: additions.slice(6, 10) },
  { title: "Something else", items: additions.slice(10) },
];

export function ScopeFields({ errors = {}, section = "all" }: { errors?: Record<string, string>; section?: "all" | "package" | "additions" | "aftercare" }) {
  const { form, setForm } = useEnquiry();
  const selected = form.selectedAdditions.split("|").filter(Boolean);
  function choose(name: string, value: string) { setForm(current => ({ ...current, [name]: value })); }
  return <div className="enquiry-scope">
    {(section === "all" || section === "package") && <div>
      <label className="field-label" htmlFor="packageSelection">Website starting point</label>
      <select className="field-input" id="packageSelection" value={form.packageSelection} onChange={event => choose("packageSelection", event.target.value)} required aria-invalid={!!errors.packageSelection} aria-describedby={errors.packageSelection ? "packageSelection-error" : "scope-guidance"}>
        <option value="">Choose a starting point</option><option value="Discuss scope">Not sure yet — discuss the scope</option>
        {packages.map(item => <option value={item.value} key={item.value}>{item.title} · {item.price}</option>)}
      </select><ErrorText id="packageSelection-error" message={errors.packageSelection} />
      <p id="scope-guidance" className="enquiry-note">These are starting points. James will confirm the scope and cost before work begins.</p>
      {section === "package" && <div className="enquiry-package-list">{packages.map(item => <details key={item.value}><summary>{item.title}<span>{item.price}</span></summary><p>{item.description}</p><ul>{item.points.map(point => <li key={point}>{point}</li>)}</ul><button className="studio-text-link" type="button" onClick={() => choose("packageSelection", item.value)}>Choose this starting point ↗</button></details>)}</div>}
    </div>}
    {(section === "all" || section === "additions") && <fieldset><legend>Optional additions · {selected.length} selected</legend>
      {additionGroups.map(group => <div className="enquiry-addition-group" key={group.title}><h3>{group.title}</h3><div className="enquiry-additions">{group.items.map(item => <label key={item.value}><input type="checkbox" checked={selected.includes(item.value)} onChange={() => choose("selectedAdditions", (selected.includes(item.value) ? selected.filter(value => value !== item.value) : [...selected, item.value]).join("|"))} /><span>{item.title}<small>{item.price}</small></span></label>)}</div></div>)}
      {selected.includes("Other") && <><label className="field-label" htmlFor="otherAdditions">Describe your custom additions</label><textarea className="field-input" id="otherAdditions" required rows={3} maxLength={1500} value={form.otherAdditions} onChange={event => choose("otherAdditions", event.target.value)} aria-invalid={!!errors.otherAdditions} aria-describedby={errors.otherAdditions ? "otherAdditions-error" : undefined} /><ErrorText id="otherAdditions-error" message={errors.otherAdditions} /></>}
    </fieldset>}
    {(section === "all" || section === "aftercare") && <div>
      <label className="field-label" htmlFor="maintenanceSelection">Aftercare</label>
      <select className="field-input" id="maintenanceSelection" value={form.maintenanceSelection} onChange={event => choose("maintenanceSelection", event.target.value)} required aria-invalid={!!errors.maintenanceSelection} aria-describedby={errors.maintenanceSelection ? "maintenanceSelection-error" : "aftercare-guidance"}>
        <option value="">Choose a plan or discuss it later</option><option value="Discuss aftercare">Discuss aftercare later</option>
        {maintenanceOptions.map(item => <option key={item.value} value={item.value}>{item.title} · {item.price} per month</option>)}
      </select><ErrorText id="maintenanceSelection-error" message={errors.maintenanceSelection} />
      <p id="aftercare-guidance" className="enquiry-note">Monthly aftercare is separate from the one-time build. Choosing “Discuss later” does not subscribe you to a plan.</p>
      {section === "aftercare" && maintenanceOptions.map(item => <details key={item.value}><summary>{item.title}<span>{item.price}/month</span></summary><p>{item.description}</p><ul>{item.points.map(point => <li key={point}>{point}</li>)}</ul></details>)}
    </div>}
  </div>;
}
