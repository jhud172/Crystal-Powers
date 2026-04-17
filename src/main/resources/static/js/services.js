document.addEventListener("DOMContentLoaded", () => {
    const builder = document.querySelector("[data-services-builder]");
    const quoteForm = document.querySelector("[data-quote-form]");

    if (!(builder instanceof HTMLElement)) {
        return;
    }

    const packageOptions = Array.from(builder.querySelectorAll("[data-package-option]"))
        .filter((input) => input instanceof HTMLInputElement);
    const maintenanceOptions = Array.from(document.querySelectorAll("[data-maintenance-option]"))
        .filter((input) => input instanceof HTMLInputElement);
    const addonOptions = Array.from(document.querySelectorAll("[data-addon-option]"))
        .filter((input) => input instanceof HTMLInputElement);
    const expandButtons = Array.from(builder.querySelectorAll("[data-expand-toggle]"))
        .filter((button) => button instanceof HTMLButtonElement);
    const summarySection = document.querySelector("[data-services-summary]");

    const hiddenFields = {
        package: quoteForm?.querySelector("[data-quote-hidden-package]"),
        additions: quoteForm?.querySelector("[data-quote-hidden-additions]"),
        maintenance: quoteForm?.querySelector("[data-quote-hidden-maintenance]")
    };

    const fileInput = quoteForm?.querySelector("[data-file-input]");
    const fileCaption = quoteForm?.querySelector("[data-file-caption]");
    const filePicker = fileInput?.closest(".services-file-picker");

    const summaryTargets = {
        packageShort: document.querySelector("[data-summary-package-short]"),
        packageMeta: document.querySelector("[data-summary-package-meta]"),
        maintenanceShort: document.querySelector("[data-summary-maintenance-short]"),
        maintenanceMeta: document.querySelector("[data-summary-maintenance-meta]"),
        additionsShort: document.querySelector("[data-summary-additions-short]"),
        packageTitle: document.querySelector("[data-summary-package-title]"),
        packagePrice: document.querySelector("[data-summary-package-price]"),
        packageCopy: document.querySelector("[data-summary-package-copy]"),
        packageList: document.querySelector("[data-summary-package-list]"),
        maintenanceTitle: document.querySelector("[data-summary-maintenance-title]"),
        maintenancePrice: document.querySelector("[data-summary-maintenance-price]"),
        maintenanceCopy: document.querySelector("[data-summary-maintenance-copy]"),
        maintenanceList: document.querySelector("[data-summary-maintenance-list]"),
        additionsFull: document.querySelector("[data-summary-additions-full]")
    };

    const getSelectedOption = (inputs) => inputs.find((input) => input.checked) ?? null;

    const getCard = (input) => input.closest("article");

    const getPackageValue = (input) => getCard(input)?.querySelector(".service-choice-tier")?.textContent?.trim() ?? "";

    const getAddonValue = (input) => getCard(input)?.querySelector(".addon-name")?.textContent?.trim() ?? "";

    const collectCardContent = (input) => {
        const card = getCard(input);

        if (!(card instanceof HTMLElement)) {
            return null;
        }

        const title = card.querySelector(".service-choice-title")?.textContent?.trim() ?? "";
        const tier = card.querySelector(".service-choice-tier")?.textContent?.trim() ?? "";
        const price = card.querySelector(".service-choice-price")?.textContent?.trim() ?? "";
        const priceNote = card.querySelector(".service-choice-price-note")?.textContent?.trim() ?? "";
        const copy = card.querySelector(".service-choice-copy")?.textContent?.trim() ?? "";
        const features = Array.from(card.querySelectorAll(".service-choice-list li"))
            .map((item) => item.textContent?.trim() ?? "")
            .filter(Boolean);

        return {
            title,
            tier,
            price,
            priceNote,
            copy,
            features
        };
    };

    const collectAddonContent = (input) => {
        const card = getCard(input);

        if (!(card instanceof HTMLElement)) {
            return null;
        }

        return {
            name: card.querySelector(".addon-name")?.textContent?.trim() ?? "",
            price: card.querySelector(".addon-price")?.textContent?.trim() ?? "",
            copy: card.querySelector(".addon-copy")?.textContent?.trim() ?? ""
        };
    };

    const renderList = (target, values) => {
        if (!(target instanceof HTMLElement)) {
            return;
        }

        target.innerHTML = values
            .map((value) => `<li>${value}</li>`)
            .join("");
    };

    const syncHiddenFields = () => {
        if (hiddenFields.package instanceof HTMLInputElement) {
            const selectedPackage = getSelectedOption(packageOptions);
            hiddenFields.package.value = selectedPackage ? getPackageValue(selectedPackage) : "";
        }

        if (hiddenFields.maintenance instanceof HTMLInputElement) {
            const selectedMaintenance = getSelectedOption(maintenanceOptions);
            hiddenFields.maintenance.value = selectedMaintenance ? getPackageValue(selectedMaintenance) : "";
        }

        if (hiddenFields.additions instanceof HTMLInputElement) {
            hiddenFields.additions.value = addonOptions
                .filter((input) => input.checked)
                .map((input) => getAddonValue(input))
                .filter(Boolean)
                .join("|");
        }
    };

    const renderSummary = () => {
        const selectedPackage = getSelectedOption(packageOptions);
        const selectedMaintenance = getSelectedOption(maintenanceOptions);
        const selectedAddons = addonOptions
            .filter((input) => input.checked)
            .map(collectAddonContent)
            .filter(Boolean);

        syncHiddenFields();

        const isReady = Boolean(selectedPackage && selectedMaintenance);

        if (summarySection instanceof HTMLElement) {
            summarySection.classList.toggle("is-active", isReady);
            summarySection.setAttribute("aria-hidden", String(!isReady));
        }

        if (!isReady) {
            return;
        }

        const packageData = collectCardContent(selectedPackage);
        const maintenanceData = collectCardContent(selectedMaintenance);

        if (packageData) {
            if (summaryTargets.packageShort instanceof HTMLElement) {
                summaryTargets.packageShort.textContent = packageData.tier;
            }
            if (summaryTargets.packageMeta instanceof HTMLElement) {
                summaryTargets.packageMeta.textContent = `${packageData.price} | ${packageData.priceNote}`;
            }
            if (summaryTargets.packageTitle instanceof HTMLElement) {
                summaryTargets.packageTitle.textContent = packageData.title;
            }
            if (summaryTargets.packagePrice instanceof HTMLElement) {
                summaryTargets.packagePrice.textContent = `${packageData.price} | ${packageData.priceNote}`;
            }
            if (summaryTargets.packageCopy instanceof HTMLElement) {
                summaryTargets.packageCopy.textContent = packageData.copy;
            }
            renderList(summaryTargets.packageList, packageData.features);
        }

        if (maintenanceData) {
            if (summaryTargets.maintenanceShort instanceof HTMLElement) {
                summaryTargets.maintenanceShort.textContent = maintenanceData.tier;
            }
            if (summaryTargets.maintenanceMeta instanceof HTMLElement) {
                summaryTargets.maintenanceMeta.textContent = `${maintenanceData.price} | ${maintenanceData.priceNote}`;
            }
            if (summaryTargets.maintenanceTitle instanceof HTMLElement) {
                summaryTargets.maintenanceTitle.textContent = maintenanceData.title;
            }
            if (summaryTargets.maintenancePrice instanceof HTMLElement) {
                summaryTargets.maintenancePrice.textContent = `${maintenanceData.price} | ${maintenanceData.priceNote}`;
            }
            if (summaryTargets.maintenanceCopy instanceof HTMLElement) {
                summaryTargets.maintenanceCopy.textContent = maintenanceData.copy;
            }
            renderList(summaryTargets.maintenanceList, maintenanceData.features);
        }

        if (summaryTargets.additionsShort instanceof HTMLElement) {
            if (selectedAddons.length === 0) {
                summaryTargets.additionsShort.innerHTML = '<li class="services-summary-chip services-summary-chip-muted">No additions selected</li>';
            } else {
                summaryTargets.additionsShort.innerHTML = selectedAddons
                    .map((addon) => `<li class="services-summary-chip">${addon.name}</li>`)
                    .join("");
            }
        }

        if (summaryTargets.additionsFull instanceof HTMLElement) {
            if (selectedAddons.length === 0) {
                summaryTargets.additionsFull.innerHTML = '<li class="services-preview-empty">No additions selected yet.</li>';
            } else {
                summaryTargets.additionsFull.innerHTML = selectedAddons
                    .map((addon) => `<li><strong>${addon.name}</strong> | ${addon.price}<br>${addon.copy}</li>`)
                    .join("");
            }
        }
    };

    const toggleExpandable = (button) => {
        const card = button.closest(".service-choice-card");
        const panel = card?.querySelector("[data-expandable]");

        if (!(panel instanceof HTMLElement)) {
            return;
        }

        const isExpanded = panel.classList.contains("is-expanded");

        if (isExpanded) {
            panel.style.maxHeight = `${panel.scrollHeight}px`;
            window.requestAnimationFrame(() => {
                panel.classList.remove("is-expanded");
                panel.style.maxHeight = "0px";
            });
            button.setAttribute("aria-expanded", "false");
            button.textContent = "Read more";
            return;
        }

        panel.classList.add("is-expanded");
        panel.style.maxHeight = `${panel.scrollHeight}px`;
        button.setAttribute("aria-expanded", "true");
        button.textContent = "Read less";
    };

    const syncFilePreview = () => {
        if (!(fileInput instanceof HTMLInputElement) || !(fileCaption instanceof HTMLElement)) {
            return;
        }

        const fileCount = fileInput.files?.length ?? 0;

        if (filePicker instanceof HTMLElement) {
            filePicker.classList.toggle("is-populated", fileCount > 0);
        }

        if (fileCount === 0) {
            fileCaption.textContent = "No files chosen";
            return;
        }

        if (fileCount === 1) {
            fileCaption.textContent = fileInput.files[0]?.name ?? "1 file selected";
            return;
        }

        const firstName = fileInput.files[0]?.name ?? `${fileCount} files selected`;
        fileCaption.textContent = `${firstName} + ${fileCount - 1} more`;
    };

    const restoreSelectionsFromHiddenFields = () => {
        if (hiddenFields.package instanceof HTMLInputElement && hiddenFields.package.value) {
            const match = packageOptions.find((input) => getPackageValue(input) === hiddenFields.package.value);

            if (match instanceof HTMLInputElement) {
                match.checked = true;
            }
        }

        if (hiddenFields.maintenance instanceof HTMLInputElement && hiddenFields.maintenance.value) {
            const match = maintenanceOptions.find((input) => getPackageValue(input) === hiddenFields.maintenance.value);

            if (match instanceof HTMLInputElement) {
                match.checked = true;
            }
        }

        if (hiddenFields.additions instanceof HTMLInputElement && hiddenFields.additions.value) {
            const selectedAdditions = new Set(hiddenFields.additions.value
                .split("|")
                .map((value) => value.trim())
                .filter(Boolean));

            addonOptions.forEach((input) => {
                input.checked = selectedAdditions.has(getAddonValue(input));
            });
        }
    };

    restoreSelectionsFromHiddenFields();

    expandButtons.forEach((button) => {
        const card = button.closest(".service-choice-card");
        const panel = card?.querySelector("[data-expandable]");

        if (panel instanceof HTMLElement) {
            panel.style.maxHeight = "0px";
        }

        button.addEventListener("click", () => {
            toggleExpandable(button);
        });
    });

    [...packageOptions, ...maintenanceOptions, ...addonOptions].forEach((input) => {
        input.addEventListener("change", renderSummary);
    });

    if (fileInput instanceof HTMLInputElement) {
        fileInput.addEventListener("change", syncFilePreview);
    }

    quoteForm?.addEventListener("submit", () => {
        syncHiddenFields();
    });

    syncFilePreview();
    renderSummary();
});
