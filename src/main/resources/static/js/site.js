document.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
    const navToggle = document.querySelector("[data-nav-toggle]");
    const navMenu = document.querySelector("[data-nav-menu]");
    const themePickers = Array.from(document.querySelectorAll("[data-theme-picker]"))
        .filter((picker) => picker instanceof HTMLElement);
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const cookieName = "crystal_theme";
    const availableThemes = new Set([
        "futuristic",
        "classic",
        "clean",
        "fresh",
        "summer-vibes"
    ]);
    const themeLabels = {
        futuristic: "Futuristic",
        classic: "Classic",
        clean: "Clean",
        fresh: "Fresh",
        "summer-vibes": "Summer vibes"
    };
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

    const closeThemePicker = (picker) => {
        picker.dataset.themeOpen = "false";
        const trigger = picker.querySelector("[data-theme-trigger]");
        const menu = picker.querySelector("[data-theme-menu]");

        if (trigger instanceof HTMLButtonElement) {
            trigger.setAttribute("aria-expanded", "false");
        }

        if (menu instanceof HTMLElement) {
            menu.hidden = true;
        }
    };

    const closeAllThemePickers = () => {
        themePickers.forEach((picker) => closeThemePicker(picker));
    };

    const openThemePicker = (picker) => {
        closeAllThemePickers();
        picker.dataset.themeOpen = "true";
        const trigger = picker.querySelector("[data-theme-trigger]");
        const menu = picker.querySelector("[data-theme-menu]");

        if (trigger instanceof HTMLButtonElement) {
            trigger.setAttribute("aria-expanded", "true");
        }

        if (menu instanceof HTMLElement) {
            menu.hidden = false;
        }
    };

    const syncThemePickers = (theme) => {
        themePickers.forEach((picker) => {
            picker.dataset.activeTheme = theme;

            const value = picker.querySelector("[data-theme-value]");
            if (value instanceof HTMLElement) {
                value.textContent = themeLabels[theme];
            }

            picker.querySelectorAll("[data-theme-option]").forEach((option) => {
                if (!(option instanceof HTMLButtonElement)) {
                    return;
                }

                option.dataset.themeActive = String(option.dataset.themeOption === theme);
            });
        });
    };

    const applyTheme = (theme, persistChoice = true) => {
        const normalizedTheme = normalizeTheme(theme);
        body.dataset.theme = normalizedTheme;
        syncThemePickers(normalizedTheme);

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

    themePickers.forEach((picker) => {
        const trigger = picker.querySelector("[data-theme-trigger]");
        const options = Array.from(picker.querySelectorAll("[data-theme-option]"))
            .filter((option) => option instanceof HTMLButtonElement);

        closeThemePicker(picker);
        picker.dataset.themeOpen = "false";

        trigger?.addEventListener("click", () => {
            if (picker.dataset.themeOpen === "true") {
                closeThemePicker(picker);
                return;
            }

            openThemePicker(picker);
        });

        options.forEach((option) => {
            option.addEventListener("click", () => {
                const nextTheme = normalizeTheme(option.dataset.themeOption ?? "");
                applyTheme(nextTheme);
                closeThemePicker(picker);
            });
        });
    });

    document.addEventListener("pointerdown", (event) => {
        const target = event.target;

        if (!(target instanceof Node)) {
            return;
        }

        themePickers.forEach((picker) => {
            if (!picker.contains(target)) {
                closeThemePicker(picker);
            }
        });
    });

    document.addEventListener("focusin", (event) => {
        const target = event.target;

        if (!(target instanceof Node)) {
            return;
        }

        themePickers.forEach((picker) => {
            if (!picker.contains(target)) {
                closeThemePicker(picker);
            }
        });
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeAllThemePickers();
        }
    });

    window.addEventListener("blur", closeAllThemePickers);

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
