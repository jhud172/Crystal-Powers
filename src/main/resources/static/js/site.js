document.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
    const navToggle = document.querySelector("[data-nav-toggle]");
    const navMenu = document.querySelector("[data-nav-menu]");
    const themeSelectors = Array.from(document.querySelectorAll("[data-theme-select]"));
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const cookieName = "crystal_theme";
    const availableThemes = new Set([
        "futuristic",
        "classic",
        "clean",
        "fresh",
        "summer-vibes"
    ]);
    const themeColors = {
        futuristic: "#060816",
        classic: "#11100d",
        clean: "#eef4fa",
        fresh: "#f3fff9",
        "summer-vibes": "#fff7ef"
    };

    const normalizeTheme = (value) => availableThemes.has(value) ? value : "futuristic";

    const getCookieValue = (name) => {
        const cookieEntry = document.cookie
            .split(";")
            .map((entry) => entry.trim())
            .find((entry) => entry.startsWith(`${name}=`));

        if (!cookieEntry) {
            return null;
        }

        return decodeURIComponent(cookieEntry.split("=")[1] ?? "");
    };

    const persistTheme = (theme) => {
        document.cookie = `${cookieName}=${encodeURIComponent(theme)}; Max-Age=31536000; Path=/; SameSite=Lax`;
    };

    const syncThemeSelectors = (theme) => {
        themeSelectors.forEach((selector) => {
            if (selector instanceof HTMLSelectElement) {
                selector.value = theme;
            }
        });
    };

    const applyTheme = (theme, persistChoice = true) => {
        const normalizedTheme = normalizeTheme(theme);
        body.dataset.theme = normalizedTheme;
        syncThemeSelectors(normalizedTheme);

        if (themeColorMeta instanceof HTMLMetaElement) {
            themeColorMeta.content = themeColors[normalizedTheme];
        }

        if (persistChoice) {
            persistTheme(normalizedTheme);
        }

        document.dispatchEvent(new CustomEvent("themechange", {
            detail: {
                theme: normalizedTheme
            }
        }));
    };

    const initialTheme = normalizeTheme(getCookieValue(cookieName) || body.dataset.theme);
    applyTheme(initialTheme, false);
    persistTheme(initialTheme);

    themeSelectors.forEach((selector) => {
        selector.addEventListener("change", (event) => {
            const target = event.currentTarget;

            if (!(target instanceof HTMLSelectElement)) {
                return;
            }

            applyTheme(target.value);
        });
    });

    window.requestAnimationFrame(() => {
        body.classList.add("theme-ready");
    });

    if (!navToggle || !navMenu) {
        return;
    }

    const closeMenu = () => {
        navToggle.setAttribute("aria-expanded", "false");
        navMenu.classList.add("hidden");
    };

    navToggle.addEventListener("click", () => {
        const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
        navToggle.setAttribute("aria-expanded", String(!isExpanded));
        navMenu.classList.toggle("hidden");
    });

    navMenu.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeMenu);
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth >= 768) {
            closeMenu();
        }
    });
});
