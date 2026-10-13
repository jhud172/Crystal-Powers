import { PrivacyLink } from "../features/privacy/PrivacyPublication";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigationType } from "react-router-dom";
import { defaultTheme, getThemeAssets, isThemeId, navItems, ThemeAssets, ThemeId, themes } from "../data/site";
import { MotionScope } from "../features/experience/MotionScope";
import { ExperienceProvider } from "../features/experience/ExperienceContext";
import { useEffectsPreference } from "../hooks/useEffectsPreference";
import { isRenderQuality } from "../features/experience/renderQuality";
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

export function Layout({ children, owner = false }: PropsWithChildren<{ owner?: boolean }>) {
  const location = useLocation();
  const { reduceEffects, setReduceEffects, renderQuality, setRenderQuality } = useEffectsPreference();
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

  return <SiteThemeContext.Provider value={value}><ExperienceProvider reduceEffects={reduceEffects} renderQuality={renderQuality}>
    <RouteMetadata />
    <MotionScope animateRoutes={!owner} className={`studio-shell${owner ? " owner-shell" : ""}`} data-appearance={light ? "light" : "dark"} data-reduced-effects={reduceEffects}>
      <a className="studio-skip" href="#main-content">Skip to content</a>
      <header className="studio-header">
        <NavLink to={location.pathname === "/team" || location.pathname.startsWith("/team/") ? "/team" : location.pathname === "/client" || location.pathname.startsWith("/client/") ? "/client" : owner ? "/admin" : "/"} className="studio-brand" aria-label={owner ? "Crystal Powers private workspace" : "Crystal Powers home"}><CrystalMark /><span>CRYSTAL<br />POWERS</span></NavLink>
        {owner ? <p className="owner-workspace-label">Private workspace</p> : <nav className="studio-desktop-nav" aria-label="Primary navigation">{navItems.map(item => <NavLink key={item.href} to={item.href}>{item.label}</NavLink>)}</nav>}
        <div className="studio-header-actions">
          <div className="studio-appearance">
            <button ref={appearanceButton} type="button" className="studio-icon-button" aria-label="Choose appearance" aria-expanded={appearanceOpen} aria-controls="appearance-panel" onClick={() => { setMenuOpen(false); setAppearanceOpen(open => !open); }}><span aria-hidden="true">{light ? "◐" : "◑"}</span></button>
            {appearanceOpen && <div id="appearance-panel" className="studio-appearance-panel">
              <p>Make yourself at home.</p>
              {([{ id: "futuristic", label: "Dark" }, { id: "clean", label: "Light" }, { id: "classic", label: "Warm dark" }, { id: "fresh", label: "Fresh light" }, { id: "summer-vibes", label: "Warm light" }] as const).map((option) => <button type="button" key={option.id} aria-pressed={theme === option.id} onClick={() => { setTheme(option.id); setAppearanceOpen(false); appearanceButton.current?.focus(); }}>{option.label}<span aria-hidden="true">{theme === option.id ? "●" : "○"}</span></button>)}
              <label className="studio-effects-choice"><input type="checkbox" checked={reduceEffects} onChange={event => setReduceEffects(event.target.checked)} aria-describedby="effects-description" /> Reduce effects</label>
              <p id="effects-description">Use still artwork and turn off decorative motion and 3D.</p>
              <label className="studio-quality-choice" htmlFor="render-quality">3D detail</label>
              <select id="render-quality" value={renderQuality} disabled={reduceEffects} aria-describedby="quality-description" onChange={event => { if (isRenderQuality(event.target.value)) setRenderQuality(event.target.value); }}>
                <option value="automatic">Automatic</option><option value="low">Lighter</option><option value="standard">Balanced</option><option value="high">Detailed</option>
              </select>
              <p id="quality-description">Automatic uses lighter reflections in compact views. Lighter also reduces decorative motion. Detailed uses more power. Reduce effects keeps still artwork.</p>
            </div>}
          </div>
          {owner ? <NavLink to="/" className="owner-public-link">Public site <span aria-hidden="true">↗</span></NavLink> : <><NavLink to="/contact" className="studio-header-contact" aria-label="Start a project"><span className="studio-project-label">Start a project</span> <span aria-hidden="true">↗</span></NavLink>
          <button ref={menuButton} type="button" className="studio-menu-button" aria-expanded={menuOpen} aria-controls="studio-mobile-menu" onClick={() => { setAppearanceOpen(false); setMenuOpen(open => !open); }}>{menuOpen ? "Close" : "Menu"} <span aria-hidden="true">{menuOpen ? "×" : "+"}</span></button></>}
        </div>
        {menuOpen && <nav id="studio-mobile-menu" className="studio-mobile-menu" aria-label="Mobile navigation">{navItems.map((item, index) => <NavLink key={item.href} to={item.href}><span className="studio-index">0{index + 1}</span>{item.label}<span aria-hidden="true">↗</span></NavLink>)}</nav>}
      </header>
      <main ref={main} tabIndex={-1} id="main-content" className="studio-main">{children}</main>
      {owner ? <footer className="owner-footer"><p>Crystal Powers / Private workspace</p><p>Your projects and conversations, together.</p></footer> : <footer className="studio-footer">
        <div className="studio-footer-top"><div className="studio-footer-identity"><NavLink to="/" className="studio-brand" aria-label="Crystal Powers home"><CrystalMark /><span>CRYSTAL<br />POWERS</span></NavLink><p>Websites, apps and bespoke systems.<br />Designed and developed by James.</p></div><div className="studio-footer-conversation"><p className="studio-eyebrow">AN IDEA / A NEW CHAPTER</p><h2>Let’s make<br />it work.</h2><NavLink to="/contact" className="studio-text-link">Start a conversation <span aria-hidden="true">↗</span></NavLink></div><nav aria-label="Footer navigation">{navItems.map(item => <NavLink key={item.href} to={item.href}>{item.label}<span aria-hidden="true">↗</span></NavLink>)}<PrivacyLink arrow/><NavLink to="/accessibility">Accessibility<span aria-hidden="true">↗</span></NavLink><NavLink to="/client">Client workspace<span aria-hidden="true">↗</span></NavLink><NavLink to="/team">Team sign-in<span aria-hidden="true">↗</span></NavLink></nav></div>
        <div className="studio-footer-bottom"><p>© {new Date().getFullYear()} Crystal Powers</p><p>Independent studio. Direct collaboration.</p><p className="studio-footer-signature" aria-hidden="true">DESIGN / BUILD / SUPPORT</p></div>
      </footer>}
    </MotionScope>
  </ExperienceProvider></SiteThemeContext.Provider>;
}
