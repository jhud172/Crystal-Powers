import type { ThemeId } from "../../data/site";

type ThemeImageMap = Partial<Record<ThemeId, string>>;

export type PortfolioProject = {
  slug: string;
  title: string;
  company: string;
  meta: string;
  summary: string;
  about: string;
  creation: string;
  whyItWorks: string;
  features: string[];
  image: string;
  themeImages?: ThemeImageMap;
};

export const portfolioProjects: PortfolioProject[] = [
  {
    slug: "editorial-service-landing-flow",
    title: "Editorial service landing flow",
    company: "Private client - editorial service brand",
    meta: "Website build - launch system",
    summary: "Premium website direction focused on tone, hierarchy, and a cleaner path from first impression to enquiry.",
    about: "The build was structured to feel premium immediately: editorial pacing, generous spacing, and a cleaner hierarchy around the service offer.",
    creation: "I built this around a cleaner page rhythm, bolder typography, and sections that guide the eye instead of competing for attention.",
    whyItWorks: "What makes it work is the way the page feels intentional from top to bottom. The layout does not just look polished; it supports the offer and makes the client feel more established.",
    features: ["Strong opening hero with clearer trust signals", "Service sections ordered around decision-making", "Sharper enquiry path without overloading the page"],
    image: "/images/project1.png"
  },
  {
    slug: "product-detail-conversion-pass",
    title: "Product detail and conversion pass",
    company: "Product brand - storefront system",
    meta: "E-commerce build - conversion restructure",
    summary: "Storefront layout shaped to make the product clearer, the offer sharper, and the conversion path easier to trust.",
    about: "This project focused on product hierarchy and a stronger buying journey, keeping the design cleaner while making the product value more legible.",
    creation: "The work was built around simplifying the storefront: tightening component spacing, clarifying section order, and pushing important actions higher in the visual flow.",
    whyItWorks: "The result works because it feels easier to scan and easier to trust. The page stops feeling crowded and starts behaving like a proper conversion surface.",
    features: ["Clearer product detail structure", "Reduced friction around the call to action", "More deliberate visual hierarchy across offer blocks"],
    image: "/images/project2.png"
  },
  {
    slug: "portfolio-booking-surface",
    title: "Portfolio and booking surface",
    company: "Creator brand - independent client",
    meta: "Creator website - booking flow",
    summary: "Booking-ready portfolio designed to let the work lead while keeping the presentation clean, sharp, and premium.",
    about: "This build balanced personality with restraint, letting the portfolio feel premium without drowning the work in unnecessary decoration.",
    creation: "I built it around a lighter structure with stronger spacing, clearer image framing, and a simpler route into contact or booking.",
    whyItWorks: "It works because the work stays central. The interface supports the creator instead of stealing attention from what they have actually made.",
    features: ["Focused showcase sections for featured work", "Booking route surfaced without overwhelming the page", "Cleaner visual system with stronger image handling"],
    image: "/images/project3.png"
  },
  {
    slug: "launch-support-surface",
    title: "Launch support surface",
    company: "Campaign client - rollout page",
    meta: "Launch page - supporting media direction",
    summary: "Sharper launch-facing page built to frame an offer, hold attention, and keep the rollout visually consistent.",
    about: "This build focused on launch presentation, pairing bolder visual treatment with a tighter page structure so the offer felt more elevated.",
    creation: "The page was shaped around the campaign story first, then tightened into a stronger rhythm with fewer competing elements.",
    whyItWorks: "It works because the visuals support the message instead of overshadowing it. The page feels like part of the launch, not an afterthought around it.",
    features: ["Clear launch framing and campaign sections", "Visual support aligned to the core offer", "More focused CTA positioning across the page"],
    image: "/images/WebsiteGFX.png"
  },
  {
    slug: "operational-structure-showcase",
    title: "Operational structure showcase",
    company: "Ops client - systems project",
    meta: "System surface - operational architecture",
    summary: "Project view focused on making systems, structure, and operational clarity feel more visible and professional.",
    about: "This project translated a structural service into something easier to understand visually, using cleaner blocks and stronger hierarchy.",
    creation: "The focus was on simplifying how the structure was presented, so the page felt more confident without losing technical clarity.",
    whyItWorks: "It works because the project feels easier to trust. The page communicates system depth without forcing the user to work to understand it.",
    features: ["Clear breakdown of operational flows", "Cleaner visual grouping around services", "Sharper trust-building presentation for complex work"],
    image: "/images/ServerSetup.png"
  },
  {
    slug: "automation-workflow-preview",
    title: "Automation workflow preview",
    company: "Utility client - automation concept",
    meta: "Workflow surface - utility direction",
    summary: "Scoped automation concept framed as part of a wider digital system rather than a disconnected utility page.",
    about: "This project focused on presenting a smaller automation system in a way that still felt polished, premium, and integrated into the client offer.",
    creation: "I approached it by tightening the structure around the workflow story: what it does, how it helps, and why the scope stays intentionally controlled.",
    whyItWorks: "It works because the automation feels purposeful instead of gimmicky. The page explains the value while still fitting a more premium studio style.",
    features: ["Scoped feature presentation without feature bloat", "Cleaner breakdown of utility workflows", "Stronger visual framing for a technical service"],
    image: "/images/DiscordBot.png"
  }
];

export function getProject(slug: string | undefined) {
  return portfolioProjects.find((project) => project.slug === slug);
}

export function getPortfolioProjectImage(project: PortfolioProject, theme: ThemeId) {
  return project.themeImages?.[theme] ?? project.image;
}
