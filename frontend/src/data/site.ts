export const navItems = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Support", href: "/support" },
  { label: "Contact", href: "/contact" }
] as const;

export const themes = [
  { id: "futuristic", label: "Futuristic", color: "#060816" },
  { id: "classic", label: "Classic", color: "#11100d" },
  { id: "clean", label: "Clean", color: "#eef4fa" },
  { id: "fresh", label: "Fresh", color: "#f3fff9" },
  { id: "summer-vibes", label: "Summer vibes", color: "#fff7ef" }
] as const;

export type ThemeId = (typeof themes)[number]["id"];

export const defaultTheme: ThemeId = "futuristic";

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}
