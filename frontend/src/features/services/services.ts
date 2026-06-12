export type SelectOption = {
  value: string;
  title: string;
  price: string;
  note: string;
  description: string;
  points: string[];
};

export const packages: SelectOption[] = [
  { value: "Basic", title: "Starter site foundation", price: "£349.99", note: "one-time build", description: "A simple starter website for businesses that need a clean first version without overbuilding the scope.", points: ["Up to 3 core pages", "Responsive layout across mobile, tablet, and desktop", "Contact form setup"] },
  { value: "Starter", title: "Stronger business presence", price: "£499.99", note: "one-time build", description: "A more structured business website with improved service presentation and a cleaner content layout.", points: ["Up to 5 pages", "Improved content structure and service sections", "Responsive design with enquiry form"] },
  { value: "Standard", title: "Balanced premium build", price: "£749.99", note: "one-time build", description: "A polished multi-page package for businesses that want stronger visual consistency and a more complete service-led site.", points: ["Up to 7 pages with stronger visual consistency", "Custom section styling and service-led layout", "Contact and lead capture forms"] },
  { value: "Experienced", title: "Advanced business structure", price: "£999.99", note: "one-time build", description: "A deeper package for businesses that need more custom layout planning, stronger presentation, and higher-fidelity refinement.", points: ["Up to 10 pages with deeper custom layout planning", "Advanced forms or stronger conversion sections", "Integration support for core business tools"] },
  { value: "Multi Grade", title: "Larger custom scope", price: "£1,499.99", note: "highest tier", description: "The highest-effort website build for larger structures, heavier custom planning, and more involved delivery coordination.", points: ["12+ pages or multiple service and content sections", "Advanced structure mapping and bespoke page planning", "Multiple forms, flows, or business integrations"] },
  { value: "Custom Quote", title: "Tailored project scope", price: "Custom", note: "scoped to brief", description: "Choose this when the project sits between fixed tiers or needs a more tailored structure from the start.", points: ["Flexible page count and layout planning", "Quoted around the real scope and features", "Ideal for bespoke or in-between builds"] }
];

export const additions: SelectOption[] = [
  { value: "Basic logo creation", title: "Basic logo creation", price: "£24.99", note: "identity starter", description: "A clean concept logo for projects that still need a starting identity.", points: [] },
  { value: "Refined logo design", title: "Refined logo design", price: "£49.99", note: "polished identity", description: "A sharper pass for a more polished logo direction and better shape balance.", points: [] },
  { value: "Full branding pack", title: "Full branding pack", price: "£89.99", note: "brand system", description: "Colour direction, supporting identity assets, and a stronger visual system around the site.", points: [] },
  { value: "Business card design", title: "Business card design", price: "£19.99", note: "print handoff", description: "A clean card layout aligned to the website style and ready for print handoff.", points: [] },
  { value: "Content polishing / copy refinement", title: "Content polishing / copy refinement", price: "£39.99", note: "copy pass", description: "Tighten existing wording so the offer reads more clearly and professionally.", points: [] },
  { value: "Full copywriting support", title: "Full copywriting support", price: "£119.99", note: "copy build", description: "Stronger written content support for service pages, calls to action, and page structure.", points: [] },
  { value: "Advanced booking form", title: "Advanced booking form", price: "£69.99", note: "lead capture", description: "A more capable enquiry or booking flow for better lead capture and clearer intake.", points: [] },
  { value: "Blog setup and styling", title: "Blog setup and styling", price: "£44.99", note: "content area", description: "A styled content area ready for updates, news, or ongoing publishing.", points: [] },
  { value: "Testimonials / reviews section", title: "Testimonials / reviews section", price: "£29.99", note: "trust block", description: "Trust-focused review blocks that strengthen credibility around the offer.", points: [] },
  { value: "Additional page", title: "Additional page", price: "£59.99", note: "scope extra", description: "Extend the structure with another page where the package scope needs more room.", points: [] },
  { value: "Other", title: "Other", price: "Custom", note: "manual scope", description: "Add a custom addition manually if the requirement does not fit the fixed list.", points: [] }
];

export const maintenanceOptions: SelectOption[] = [
  { value: "Basic Maintenance", title: "Essential coverage", price: "£9.99", note: "per month", description: "Essential support for keeping the site online, connected, and stable.", points: ["Hosting support and connection checks", "Domain and uptime guidance", "Core support for a smaller live site"] },
  { value: "Standard Maintenance", title: "Ongoing updates", price: "£19.99", note: "per month", description: "The balanced support plan for edits, routine updates, and a business site that stays actively used.", points: ["Everything in Basic", "Small text and image edits", "Routine support and update handling"] },
  { value: "Premium Maintenance", title: "Priority support", price: "£29.99", note: "per month", description: "Priority help for sites that need faster turnarounds and more regular refinement.", points: ["Everything in Standard", "Priority changes and faster response", "Better suited to evolving live sites"] }
];
