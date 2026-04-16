document.addEventListener("DOMContentLoaded", () => {
    const page = document.querySelector("[data-portfolio-page]");

    if (!(page instanceof HTMLElement)) {
        return;
    }

    const searchInput = page.querySelector("[data-portfolio-search]");
    const filterButtons = Array.from(page.querySelectorAll("[data-portfolio-filter]"))
        .filter((button) => button instanceof HTMLButtonElement);
    const items = Array.from(page.querySelectorAll("[data-portfolio-item]"))
        .filter((item) => item instanceof HTMLElement);
    const dialog = page.querySelector("[data-portfolio-dialog]") ?? document.querySelector("[data-portfolio-dialog]");
    const dialogTitle = document.querySelector("[data-portfolio-dialog-title]");
    const dialogCompany = document.querySelector("[data-portfolio-dialog-company]");
    const dialogMeta = document.querySelector("[data-portfolio-dialog-meta]");
    const dialogLink = document.querySelector("[data-portfolio-dialog-link]");
    const panels = {
        about: document.querySelector('[data-portfolio-panel="about"]'),
        creation: document.querySelector('[data-portfolio-panel="creation"]'),
        result: document.querySelector('[data-portfolio-panel="result"]')
    };
    const tabButtons = Array.from(document.querySelectorAll("[data-portfolio-tab]"))
        .filter((button) => button instanceof HTMLButtonElement);
    const tabShell = document.querySelector("[data-portfolio-tabs]");
    const closeButton = document.querySelector("[data-portfolio-close]");

    let activeFilter = "all";
    let activeTab = "about";

    const setTab = (name) => {
        activeTab = name;

        tabButtons.forEach((button, index) => {
            const isActive = button.dataset.portfolioTab === name;
            button.classList.toggle("is-active", isActive);

            if (isActive && tabShell instanceof HTMLElement) {
                tabShell.style.setProperty("--portfolio-tab-index", String(index));
            }
        });

        Object.entries(panels).forEach(([key, panel]) => {
            if (!(panel instanceof HTMLElement)) {
                return;
            }

            const isActive = key === name;
            panel.classList.toggle("is-active", isActive);
            panel.hidden = !isActive;
        });
    };

    const filterItems = () => {
        const term = searchInput instanceof HTMLInputElement ? searchInput.value.trim().toLowerCase() : "";

        items.forEach((item) => {
            const categories = item.dataset.category?.toLowerCase() ?? "";
            const haystack = item.dataset.search?.toLowerCase() ?? "";
            const matchesFilter = activeFilter === "all" || categories.includes(activeFilter);
            const matchesSearch = term.length === 0 || haystack.includes(term);

            item.classList.toggle("is-hidden", !(matchesFilter && matchesSearch));
        });
    };

    const fillPanel = (target, source) => {
        if (!(target instanceof HTMLElement) || !(source instanceof HTMLElement)) {
            return;
        }

        target.innerHTML = source.innerHTML;
    };

    const openDialogForItem = (item) => {
        if (!(dialog instanceof HTMLDialogElement)) {
            return;
        }

        const title = item.querySelector("[data-portfolio-title]")?.textContent?.trim() ?? "";
        const company = item.querySelector("[data-portfolio-company]")?.textContent?.trim() ?? "";
        const meta = item.querySelector("[data-portfolio-meta]")?.textContent?.trim() ?? "";
        const link = item.querySelector("[data-portfolio-link]")?.textContent?.trim() ?? "#";

        if (dialogTitle instanceof HTMLElement) {
            dialogTitle.textContent = title;
        }

        if (dialogCompany instanceof HTMLElement) {
            dialogCompany.textContent = company;
        }

        if (dialogMeta instanceof HTMLElement) {
            dialogMeta.textContent = meta;
        }

        if (dialogLink instanceof HTMLAnchorElement) {
            dialogLink.href = link;
        }

        fillPanel(panels.about, item.querySelector("[data-portfolio-about]"));
        fillPanel(panels.creation, item.querySelector("[data-portfolio-creation]"));
        fillPanel(panels.result, item.querySelector("[data-portfolio-result]"));
        setTab("about");
        dialog.showModal();
    };

    if (searchInput instanceof HTMLInputElement) {
        searchInput.addEventListener("input", filterItems);
    }

    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            activeFilter = button.dataset.portfolioFilter ?? "all";
            filterButtons.forEach((candidate) => {
                candidate.classList.toggle("is-active", candidate === button);
            });
            filterItems();
        });
    });

    items.forEach((item) => {
        item.querySelector("[data-portfolio-open]")?.addEventListener("click", () => {
            openDialogForItem(item);
        });
    });

    tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            setTab(button.dataset.portfolioTab ?? "about");
        });
    });

    closeButton?.addEventListener("click", () => {
        if (dialog instanceof HTMLDialogElement) {
            dialog.close();
        }
    });

    if (dialog instanceof HTMLDialogElement) {
        dialog.addEventListener("cancel", () => {
            dialog.close();
        });
    }

    setTab(activeTab);
    filterItems();
});
