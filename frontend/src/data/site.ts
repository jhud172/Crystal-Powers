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

export type ThemeAssets = {
  brandMotionWebp: string;
  brandMotionGif: string;
  brandMark: string;
  homeBackdrop: string;
  portfolioFeatured: string;
};

const sharedBrandAssets = {
  brandMotionWebp: "/animations/cp-logo-crystal-ufo-highres.webp",
  brandMotionGif: "/animations/cp-logo-crystal-ufo-highres.gif",
  brandMark: "/images/cp-logo-crystal-ufo.png"
} satisfies Pick<ThemeAssets, "brandMotionWebp" | "brandMotionGif" | "brandMark">;

export const themeAssets = {
  futuristic: {
    ...sharedBrandAssets,
    homeBackdrop: "/images/themes/futuristic-atmosphere.svg",
    portfolioFeatured: "/images/themes/futuristic-atmosphere.svg"
  },
  classic: {
    ...sharedBrandAssets,
    homeBackdrop: "/images/themes/classic-atmosphere.svg",
    portfolioFeatured: "/images/themes/classic-atmosphere.svg"
  },
  clean: {
    ...sharedBrandAssets,
    homeBackdrop: "/images/themes/clean-atmosphere.svg",
    portfolioFeatured: "/images/themes/clean-atmosphere.svg"
  },
  fresh: {
    ...sharedBrandAssets,
    homeBackdrop: "/images/themes/fresh-atmosphere.svg",
    portfolioFeatured: "/images/themes/fresh-atmosphere.svg"
  },
  "summer-vibes": {
    ...sharedBrandAssets,
    homeBackdrop: "/images/themes/summer-vibes-atmosphere.svg",
    portfolioFeatured: "/images/themes/summer-vibes-atmosphere.svg"
  }
} satisfies Record<ThemeId, ThemeAssets>;

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}

export function getThemeAssets(theme: ThemeId) {
  return themeAssets[theme] ?? themeAssets[defaultTheme];
}
