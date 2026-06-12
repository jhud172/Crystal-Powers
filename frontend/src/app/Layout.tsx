import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { defaultTheme, isThemeId, navItems, ThemeId, themes } from "../data/site";

const themeCookieName = "crystal_theme";

function getCookieValue(name: string) {
  return document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split("=")[1];
}

function persistTheme(theme: ThemeId) {
  document.cookie = `${themeCookieName}=${encodeURIComponent(theme)}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

export function Layout({ children }: PropsWithChildren) {
  const location = useLocation();
  const [theme, setTheme] = useState<ThemeId>(() => {
    if (typeof document === "undefined") {
      return defaultTheme;
    }

    const cookieTheme = decodeURIComponent(getCookieValue(themeCookieName) ?? "");
    return isThemeId(cookieTheme) ? cookieTheme : defaultTheme;
  });
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const activeTheme = useMemo(() => themes.find((item) => item.id === theme) ?? themes[0], [theme]);

  useEffect(() => {
    document.body.dataset.theme = theme;
    document.body.classList.add("theme-ready");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", activeTheme.color);
    persistTheme(theme);
  }, [activeTheme.color, theme]);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsThemeOpen(false);
  }, [location.pathname]);

  return (
    <>
      <div className="pointer-events-none absolute inset-0 -z-30 bg-ink" />
      <div className="site-grid-overlay" aria-hidden="true" />
      <div className="site-noise-overlay" aria-hidden="true" />
      <div className="site-cursor-aura" aria-hidden="true" />
      <div className="site-glow site-glow-top" />
      <div className="site-glow site-glow-side" />
      <div className="site-glow site-glow-bottom" />

      <header className="site-header" data-header-ready="true">
        <div className="site-header-inner">
          <span className="site-header-orbit site-header-orbit-left" aria-hidden="true" />
          <span className="site-header-orbit site-header-orbit-right" aria-hidden="true" />
          <div className="site-header-ufo" aria-hidden="true">
            <span className="site-header-ufo-ring" />
            <span className="site-header-ufo-ring" />
            <span className="site-header-ufo-ring" />
            <span className="site-header-ufo-ring" />
            <span className="site-header-ufo-ring" />
            <span className="site-header-ufo-pool" />
          </div>

          <NavLink to="/" className="brand-link">
            <span className="brand-mark-shell" aria-hidden="true">
              <span className="brand-badge">
                <picture className="brand-badge-motion">
                  <source srcSet="/animations/cp-logo-crystal-ufo-highres.webp" type="image/webp" />
                  <img src="/animations/cp-logo-crystal-ufo-highres.gif" alt="" className="brand-badge-image" />
                </picture>
                <img src="/images/cp-logo-crystal-ufo.png" alt="" className="brand-badge-image brand-badge-static" />
              </span>
            </span>
            <span className="brand-copy">
              <span className="brand-title-row">
                <span className="brand-title">Crystal Powers</span>
              </span>
            </span>
          </NavLink>

          <div className="site-header-theme-shell hidden md:flex">
            <ThemePicker
              activeTheme={activeTheme}
              isOpen={isThemeOpen}
              onOpenChange={setIsThemeOpen}
              onThemeChange={setTheme}
            />
          </div>

          <nav className="site-nav hidden md:flex">
            {navItems.map((item) => (
              <NavLink key={item.href} to={item.href} className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="site-header-utility hidden md:flex">
            <NavLink to="/contact" className="primary-button site-cta">
              <span className="site-cta-label">Start a build</span>
              <span className="site-cta-meta">Book intro</span>
            </NavLink>
          </div>

          <div className="site-header-mobile-utility md:hidden">
            <div className="site-header-mobile-actions">
              <ThemePicker
                activeTheme={activeTheme}
                isOpen={isThemeOpen}
                onOpenChange={setIsThemeOpen}
                onThemeChange={setTheme}
              />
              <button
                type="button"
                data-nav-toggle
                aria-controls="mobile-nav-panel"
                aria-expanded={isMenuOpen}
                className="nav-toggle mobile-menu-button"
                onClick={() => setIsMenuOpen((value) => !value)}
              >
                <span className="nav-toggle-label">Menu</span>
                <span className="nav-toggle-icon" aria-hidden="true">
                  <span />
                  <span />
                </span>
              </button>
            </div>
          </div>
        </div>

        <nav
          id="mobile-nav-panel"
          className="mobile-nav-panel md:hidden"
          data-open={isMenuOpen}
          aria-hidden={!isMenuOpen}
          aria-label="Mobile navigation"
        >
          <div className="mobile-nav-panel-inner">
            {navItems.map((item) => (
              <NavLink key={item.href} to={item.href} className={({ isActive }) => `nav-link mobile-nav-link${isActive ? " nav-link-active" : ""}`}>
                {item.label}
              </NavLink>
            ))}
            <div className="mobile-nav-cta-shell">
              <NavLink to="/contact" className="primary-button site-cta site-cta-mobile">
                <span className="site-cta-label">Start a build</span>
                <span className="site-cta-meta">Book intro</span>
              </NavLink>
            </div>
          </div>
        </nav>
      </header>

      <main className="react-page-main">{children}</main>

      <footer className="site-footer">
        <div className="site-footer-transition" aria-hidden="true">
          <span className="site-footer-transition-line" />
          <span className="site-footer-transition-orbit site-footer-transition-orbit-left" />
          <span className="site-footer-transition-orbit site-footer-transition-orbit-right" />
          <span className="site-footer-transition-core" />
        </div>
        <div className="site-footer-panel">
          <div className="site-footer-grid">
            <div className="footer-brand">
              <span className="eyebrow">Studio profile</span>
              <h2 className="footer-title">Customer-facing digital builds with a cinematic first impression and a cleaner route to action.</h2>
              <p className="footer-copy">
                Crystal Powers focuses on premium websites, launch systems, app-facing experiences, and the supporting surfaces that make the business feel more established from the first screen.
              </p>
            </div>
            <div className="footer-column">
              <p className="footer-heading">Explore</p>
              <div className="footer-links">
                {navItems.map((item) => (
                  <NavLink key={item.href} to={item.href} className="footer-link">
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
            <div className="footer-column">
              <p className="footer-heading">Build focus</p>
              <ul className="footer-list">
                <li>Premium websites and launch surfaces</li>
                <li>Product-style presentation for real services</li>
                <li>Interactive marketing and portfolio experiences</li>
                <li>Clearer conversion paths without feature bloat</li>
              </ul>
            </div>
          </div>
          <div className="site-footer-meta">
            <p>&copy; 2026 Crystal Powers. Built for polished launches, cleaner product presentation, and better first impressions.</p>
            <div className="site-footer-meta-links">
              <NavLink to="/about" className="footer-link">About</NavLink>
              <NavLink to="/contact" className="footer-link">Contact</NavLink>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

type ThemePickerProps = {
  activeTheme: { id: ThemeId; label: string };
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onThemeChange: (theme: ThemeId) => void;
};

function ThemePicker({ activeTheme, isOpen, onOpenChange, onThemeChange }: ThemePickerProps) {
  return (
    <div className="theme-picker" data-theme-picker="true" data-theme-open={isOpen} data-theme-state={isOpen ? "open" : "closed"} data-active-theme={activeTheme.id}>
      <button
        type="button"
        className="theme-picker-trigger"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Choose a site theme"
        onClick={() => onOpenChange(!isOpen)}
      >
        <span className="theme-picker-copy">
          <span className="theme-picker-label">Theme</span>
          <span className="theme-picker-value">{activeTheme.label}</span>
        </span>
        <span className="theme-picker-chevron" aria-hidden="true" />
      </button>
      <div className="theme-picker-menu" hidden={!isOpen}>
        {themes.map((theme) => (
          <button
            key={theme.id}
            type="button"
            className="theme-picker-option"
            data-theme-active={String(theme.id === activeTheme.id)}
            onClick={() => {
              onThemeChange(theme.id);
              onOpenChange(false);
            }}
          >
            {theme.label}
          </button>
        ))}
      </div>
    </div>
  );
}
