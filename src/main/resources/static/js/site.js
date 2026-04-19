document.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
    const siteHeader = document.querySelector(".site-header");
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
    const themePickerTransitionMs = 220;
    const mobileMenuTransitionMs = 260;
    const themePickerTimers = new WeakMap();

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

    const clearThemePickerTimer = (picker) => {
        const timer = themePickerTimers.get(picker);

        if (timer) {
            window.clearTimeout(timer);
            themePickerTimers.delete(picker);
        }
    };

    const closeThemePicker = (picker, immediate = false) => {
        clearThemePickerTimer(picker);
        picker.dataset.themeOpen = "false";
        picker.dataset.themeState = immediate ? "closed" : "closing";
        const trigger = picker.querySelector("[data-theme-trigger]");
        const menu = picker.querySelector("[data-theme-menu]");

        if (trigger instanceof HTMLButtonElement) {
            trigger.setAttribute("aria-expanded", "false");
        }

        if (menu instanceof HTMLElement) {
            if (menu.hidden) {
                picker.dataset.themeState = "closed";
                return;
            }

            if (immediate) {
                menu.hidden = true;
                picker.dataset.themeState = "closed";
                return;
            }

            const timer = window.setTimeout(() => {
                menu.hidden = true;
                picker.dataset.themeState = "closed";
                themePickerTimers.delete(picker);
            }, themePickerTransitionMs);

            themePickerTimers.set(picker, timer);
        }
    };

    const closeAllThemePickers = (excludePicker = null) => {
        themePickers.forEach((picker) => {
            if (picker !== excludePicker) {
                closeThemePicker(picker);
            }
        });
    };

    const openThemePicker = (picker) => {
        clearThemePickerTimer(picker);
        closeAllThemePickers(picker);
        picker.dataset.themeOpen = "true";
        picker.dataset.themeState = "open";
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

        closeThemePicker(picker, true);
        picker.dataset.themeOpen = "false";
        picker.dataset.themeState = "closed";

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

        if (siteHeader instanceof HTMLElement) {
            window.requestAnimationFrame(() => {
                siteHeader.dataset.headerReady = "true";
            });
        }
    });

    if (siteHeader instanceof HTMLElement) {
        let lastScrollY = window.scrollY;
        let lastDirection = 0;
        let travelDistance = 0;
        let ticking = false;
        const hideThreshold = 12;
        const showThreshold = 8;

        const syncHeaderVisibility = () => {
            const currentScrollY = window.scrollY;
            const delta = currentScrollY - lastScrollY;
            const direction = delta === 0 ? 0 : delta > 0 ? 1 : -1;

            siteHeader.classList.toggle("is-scrolled", currentScrollY > 12);

            if (currentScrollY <= 24) {
                siteHeader.classList.remove("is-hidden");
                travelDistance = 0;
                lastDirection = 0;
                lastScrollY = currentScrollY;
                ticking = false;
                return;
            }

            if (direction !== 0) {
                if (direction !== lastDirection) {
                    travelDistance = Math.abs(delta);
                    lastDirection = direction;
                } else {
                    travelDistance += Math.abs(delta);
                }

                if (direction > 0 && travelDistance >= hideThreshold) {
                    siteHeader.classList.add("is-hidden");
                    travelDistance = 0;
                }

                if (direction < 0 && travelDistance >= showThreshold) {
                    siteHeader.classList.remove("is-hidden");
                    travelDistance = 0;
                }
            }

            lastScrollY = currentScrollY;
            ticking = false;
        };

        syncHeaderVisibility();
        window.addEventListener("scroll", () => {
            if (ticking) {
                return;
            }

            ticking = true;
            window.requestAnimationFrame(syncHeaderVisibility);
        }, { passive: true });
    }

    if (!(navToggle instanceof HTMLButtonElement) || !(navMenu instanceof HTMLElement)) {
        return;
    }

    let mobileMenuTimer = 0;

    const setMobileMenuAvailability = (isOpen) => {
        navMenu.setAttribute("aria-hidden", String(!isOpen));

        if ("inert" in navMenu) {
            navMenu.inert = !isOpen;
        }
    };

    const openMenu = () => {
        window.clearTimeout(mobileMenuTimer);
        navMenu.classList.remove("hidden");
        navMenu.dataset.open = "false";
        setMobileMenuAvailability(true);

        window.requestAnimationFrame(() => {
            navToggle.setAttribute("aria-expanded", "true");
            navMenu.dataset.open = "true";
        });
    };

    const closeMenu = (immediate = false) => {
        window.clearTimeout(mobileMenuTimer);
        navToggle.setAttribute("aria-expanded", "false");
        navMenu.dataset.open = "false";
        setMobileMenuAvailability(false);

        if (immediate) {
            navMenu.classList.add("hidden");
            return;
        }

        mobileMenuTimer = window.setTimeout(() => {
            navMenu.classList.add("hidden");
        }, mobileMenuTransitionMs);
    };

    closeMenu(true);

    navToggle.addEventListener("click", () => {
        const isExpanded = navToggle.getAttribute("aria-expanded") === "true";

        if (isExpanded) {
            closeMenu();
            return;
        }

        openMenu();
    });

    navMenu.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") {
            closeMenu();
            navToggle.focus();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth >= 768) {
            closeMenu(true);
        }
    });
});
