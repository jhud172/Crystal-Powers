import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigationType } from "react-router-dom";
import { defaultTheme, getThemeAssets, isThemeId, navItems, ThemeAssets, ThemeId, themes } from "../data/site";
import { initScrollReveal } from "../lib/interactions";
import { ExperienceProvider } from "../features/experience/ExperienceContext";
import { useEffectsPreference } from "../hooks/useEffectsPreference";
import { RouteMetadata } from "./RouteMetadata";

type SiteThemeContextValue = { theme: ThemeId; assets: ThemeAssets };
const SiteThemeContext = createContext<SiteThemeContextValue | null>(null);
export function useSiteTheme() {
  return useContext(SiteThemeContext) ?? { theme: defaultTheme, assets: getThemeAssets(defaultTheme) };
}

function initialTheme(): ThemeId {
  if (typeof document === "undefined") return defaultTheme;
  const value = document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith("crystal_theme="))?.slice(14);
  try { const decoded = decodeURIComponent(value ?? ""); return isThemeId(decoded) ? decoded : defaultTheme; }
  catch { return defaultTheme; }
}

export function CrystalMark() {
  return <svg viewBox="0 0 40 48" fill="none" aria-hidden="true"><path d="M20 2 35 13v22L20 46 5 35V13L20 2Z" stroke="currentColor" strokeWidth="1.4" /><path d="m20 2 7 15-7 29-7-29 7-15ZM5 13l8 4 14 0 8-4M5 35l15-9 15 9" stroke="currentColor" strokeWidth="1" /></svg>;
}

export function Layout({ children }: PropsWithChildren) {
  const location = useLocation();
  const { reduceEffects, setReduceEffects } = useEffectsPreference();
  const navigationType = useNavigationType();
  const [theme, setTheme] = useState<ThemeId>(initialTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const appearanceButton = useRef<HTMLButtonElement>(null);
  const main = useRef<HTMLElement>(null);
  const firstRoute = useRef(true);
  const light = ["clean", "fresh", "summer-vibes"].includes(theme);
  const value = useMemo(() => ({ theme, assets: getThemeAssets(theme) }), [theme]);

  useEffect(() => {
    document.body.dataset.theme = theme;
    document.body.classList.add("theme-ready");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themes.find(item => item.id === theme)!.color);
    document.cookie = `crystal_theme=${encodeURIComponent(theme)}; Max-Age=31536000; Path=/; SameSite=Lax`;
  }, [theme, light]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reveal = initScrollReveal(media.matches || reduceEffects);
    const refreshMotion = () => { reveal.destroy(); reveal = initScrollReveal(media.matches || reduceEffects); };
    media.addEventListener("change", refreshMotion);
    return () => { reveal.destroy(); media.removeEventListener("change", refreshMotion); };
  }, [location.pathname, reduceEffects]);
  useEffect(() => {
    setMenuOpen(false); setAppearanceOpen(false);
    if (firstRoute.current) { firstRoute.current = false; return; }
    if (navigationType !== "POP") window.scrollTo({ top: 0, behavior: "instant" });
    main.current?.focus({ preventScroll: true });
  }, [location.pathname, navigationType]);
  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (menuOpen) { setMenuOpen(false); menuButton.current?.focus(); }
      if (appearanceOpen) { setAppearanceOpen(false); appearanceButton.current?.focus(); }
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [menuOpen, appearanceOpen]);

  return <SiteThemeContext.Provider value={value}><ExperienceProvider reduceEffects={reduceEffects}>
    <RouteMetadata />
    <div className="studio-shell" data-appearance={light ? "light" : "dark"} data-reduced-effects={reduceEffects}>
      <a className="studio-skip" href="#main-content">Skip to content</a>
      <header className="studio-header">
        <NavLink to="/" className="studio-brand" aria-label="Crystal Powers home"><CrystalMark /><span>CRYSTAL<br />POWERS</span></NavLink>
        <nav className="studio-desktop-nav" aria-label="Primary navigation">{navItems.map(item => <NavLink key={item.href} to={item.href}>{item.label}</NavLink>)}</nav>
        <div className="studio-header-actions">
          <div className="studio-appearance">
            <button ref={appearanceButton} type="button" className="studio-icon-button" aria-label="Choose appearance" aria-expanded={appearanceOpen} aria-controls="appearance-panel" onClick={() => { setMenuOpen(false); setAppearanceOpen(open => !open); }}><span aria-hidden="true">{light ? "◐" : "◑"}</span></button>
            {appearanceOpen && <div id="appearance-panel" className="studio-appearance-panel">
              <p>Make yourself at home.</p>
              {([{ id: "futuristic", label: "Dark" }, { id: "clean", label: "Light" }, { id: "classic", label: "Warm dark" }, { id: "fresh", label: "Fresh light" }, { id: "summer-vibes", label: "Warm light" }] as const).map((option) => <button type="button" key={option.id} aria-pressed={theme === option.id} onClick={() => { setTheme(option.id); setAppearanceOpen(false); appearanceButton.current?.focus(); }}>{option.label}<span aria-hidden="true">{theme === option.id ? "●" : "○"}</span></button>)}
              <label className="studio-effects-choice"><input type="checkbox" checked={reduceEffects} onChange={event => setReduceEffects(event.target.checked)} aria-describedby="effects-description" /> Reduce effects</label>
              <p id="effects-description">Use still artwork and turn off decorative motion and 3D.</p>
            </div>}
          </div>
          <NavLink to="/contact" className="studio-header-contact" aria-label="Start a project"><span className="studio-project-label">Start a project</span> <span aria-hidden="true">↗</span></NavLink>
          <button ref={menuButton} type="button" className="studio-menu-button" aria-expanded={menuOpen} aria-controls="studio-mobile-menu" onClick={() => { setAppearanceOpen(false); setMenuOpen(open => !open); }}>{menuOpen ? "Close" : "Menu"} <span aria-hidden="true">{menuOpen ? "×" : "+"}</span></button>
        </div>
        {menuOpen && <nav id="studio-mobile-menu" className="studio-mobile-menu" aria-label="Mobile navigation">{navItems.map((item, index) => <NavLink key={item.href} to={item.href}><span className="studio-index">0{index + 1}</span>{item.label}<span aria-hidden="true">↗</span></NavLink>)}</nav>}
      </header>
      <main ref={main} tabIndex={-1} id="main-content" className="studio-main">{children}</main>
      <footer className="studio-footer">
        <div className="studio-footer-top"><NavLink to="/" className="studio-brand"><CrystalMark /><span>CRYSTAL<br />POWERS</span></NavLink><p>Independent thinking.<br />Exceptional digital experiences.</p><NavLink to="/contact" className="studio-text-link">Start a conversation <span aria-hidden="true">↗</span></NavLink></div>
        <div className="studio-footer-bottom"><p>© {new Date().getFullYear()} Crystal Powers</p><p>Founded and developed by James.</p><nav aria-label="Footer navigation"><NavLink to="/portfolio">Work</NavLink><NavLink to="/about">Studio</NavLink><NavLink to="/contact">Contact</NavLink></nav></div>
      </footer>
    </div>
  </ExperienceProvider></SiteThemeContext.Provider>;
}
