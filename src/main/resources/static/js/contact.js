document.addEventListener("DOMContentLoaded", () => {
    const builder = document.querySelector("[data-contact-builder]");

    if (!(builder instanceof HTMLElement)) {
        return;
    }

    const hiddenFields = {
        preferredContact: builder.querySelector("[data-contact-hidden-preferred-contact]"),
        package: builder.querySelector("[data-contact-hidden-package]"),
        additions: builder.querySelector("[data-contact-hidden-additions]"),
        maintenance: builder.querySelector("[data-contact-hidden-maintenance]"),
        otherAdditions: builder.querySelector("[data-contact-hidden-other-additions]")
    };

    const groups = {
        preferredContact: builder.querySelector('[data-select-role="preferred-contact"]'),
        package: builder.querySelector('[data-select-role="package"]'),
        additions: builder.querySelector('[data-select-role="additions"]'),
        maintenance: builder.querySelector('[data-select-role="maintenance"]')
    };

    const preview = {
        package: builder.querySelector("[data-contact-preview-package]"),
        packageMeta: builder.querySelector("[data-contact-preview-package-meta]"),
        additions: builder.querySelector("[data-contact-preview-additions]"),
        maintenance: builder.querySelector("[data-contact-preview-maintenance]"),
        maintenanceMeta: builder.querySelector("[data-contact-preview-maintenance-meta]"),
        contact: builder.querySelector("[data-contact-preview-contact]"),
        person: builder.querySelector("[data-contact-preview-person]")
    };

    const otherShell = builder.querySelector("[data-contact-other-shell]");
    const otherList = builder.querySelector("[data-contact-other-list]");
    const otherAddButton = builder.querySelector("[data-contact-other-add]");
    const firstNameInput = builder.querySelector("[data-contact-first-name]");
    const lastNameInput = builder.querySelector("[data-contact-last-name]");

    const getMenu = (group) => group?.querySelector("[data-select-menu]");
    const getTrigger = (group) => group?.querySelector("[data-select-trigger]");
    const getDisplay = (group) => group?.querySelector("[data-select-display]");
    const getOptions = (group) => Array.from(group?.querySelectorAll("[data-select-option]") ?? [])
        .filter((option) => option instanceof HTMLButtonElement);
    const getOptionLabel = (option) => {
        if (!(option instanceof HTMLButtonElement)) {
            return "";
        }

        const explicitLabel = option.dataset.label?.trim();
        if (explicitLabel) {
            return explicitLabel;
        }

        const title = option.querySelector(".contact-select-option-title");
        return title instanceof HTMLElement ? title.textContent?.trim() ?? "" : option.textContent?.trim() ?? "";
    };
    const getDefaultDisplay = (group) => group?.dataset.placeholder?.trim() ?? "Choose one";
    const findOption = (group, value) => getOptions(group).find((option) => option.dataset.value === value) ?? null;
    const getSelectedSingle = (group) => getOptions(group).find((option) => option.classList.contains("is-selected")) ?? null;
    const getSelectedMulti = (group) => getOptions(group).filter((option) => option.classList.contains("is-selected"));

    const closeSelect = (group) => {
        if (!(group instanceof HTMLElement)) {
            return;
        }

        group.classList.remove("is-open");
        const menu = getMenu(group);
        const trigger = getTrigger(group);

        if (menu instanceof HTMLElement) {
            menu.hidden = true;
        }

        if (trigger instanceof HTMLButtonElement) {
            trigger.setAttribute("aria-expanded", "false");
        }
    };

    const openSelect = (group) => {
        if (!(group instanceof HTMLElement)) {
            return;
        }

        Object.values(groups).forEach((candidate) => {
            if (candidate !== group) {
                closeSelect(candidate);
            }
        });

        group.classList.add("is-open");
        const menu = getMenu(group);
        const trigger = getTrigger(group);

        if (menu instanceof HTMLElement) {
            menu.hidden = false;
        }

        if (trigger instanceof HTMLButtonElement) {
            trigger.setAttribute("aria-expanded", "true");
        }
    };

    const setSingleSelection = (group, value) => {
        const option = findOption(group, value);

        getOptions(group).forEach((candidate) => {
            candidate.classList.toggle("is-selected", candidate === option);
        });

        const display = getDisplay(group);
        if (display instanceof HTMLElement) {
            display.textContent = option ? getOptionLabel(option) : getDefaultDisplay(group);
        }

        return option;
    };

    const setMultiSelection = (group, values) => {
        const selectedValues = new Set(values);

        getOptions(group).forEach((option) => {
            option.classList.toggle("is-selected", selectedValues.has(option.dataset.value ?? ""));
        });

        const display = getDisplay(group);
        const selectedOptions = getSelectedMulti(group).filter((option) => option.dataset.value !== "Other");

        if (display instanceof HTMLElement) {
            if (selectedOptions.length === 0 && !selectedValues.has("Other")) {
                display.textContent = getDefaultDisplay(group);
            } else if (selectedOptions.length === 1 && !selectedValues.has("Other")) {
                display.textContent = getOptionLabel(selectedOptions[0]) || "1 addition selected";
            } else {
                const count = selectedOptions.length + (selectedValues.has("Other") ? 1 : 0);
                display.textContent = `${count} additions selected`;
            }
        }
    };

    const createOtherRow = (value = "") => {
        if (!(otherList instanceof HTMLElement)) {
            return;
        }

        const row = document.createElement("div");
        row.className = "contact-other-row";

        const input = document.createElement("input");
        input.type = "text";
        input.className = "field-input";
        input.placeholder = "Type a custom addition";
        input.value = value;
        input.setAttribute("data-contact-other-input", "");

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "secondary-button contact-other-remove";
        removeButton.textContent = "Remove";

        row.append(input, removeButton);
        otherList.appendChild(row);

        removeButton.addEventListener("click", () => {
            row.remove();
            syncOtherAdditions();
            updatePreview();
        });

        input.addEventListener("input", () => {
            syncOtherAdditions();
            updatePreview();
        });
    };
    const getOtherValues = () => {
        if (!(otherList instanceof HTMLElement)) {
            return [];
        }

        return Array.from(otherList.querySelectorAll("[data-contact-other-input]"))
            .filter((input) => input instanceof HTMLInputElement)
            .map((input) => input.value.trim())
            .filter(Boolean);
    };

    const syncOtherAdditions = () => {
        if (hiddenFields.otherAdditions instanceof HTMLInputElement) {
            hiddenFields.otherAdditions.value = getOtherValues().join("\n");
        }
    };

    const syncAdditions = () => {
        if (hiddenFields.additions instanceof HTMLInputElement) {
            hiddenFields.additions.value = getSelectedMulti(groups.additions)
                .map((option) => option.dataset.value ?? "")
                .filter(Boolean)
                .join("|");
        }

        syncOtherAdditions();
    };

    const toggleOtherShell = () => {
        if (!(otherShell instanceof HTMLElement)) {
            return;
        }

        const otherSelected = getSelectedMulti(groups.additions).some((option) => option.dataset.value === "Other");
        const currentOtherValues = getOtherValues();
        const shouldShow = otherSelected || currentOtherValues.length > 0;

        otherShell.hidden = !shouldShow;

        if (shouldShow && otherList instanceof HTMLElement && otherList.children.length === 0) {
            createOtherRow();
        }

        if (!shouldShow && otherList instanceof HTMLElement) {
            otherList.innerHTML = "";
            syncOtherAdditions();
        }
    };

    const updatePreview = () => {
        const selectedPackage = getSelectedSingle(groups.package);
        const selectedMaintenance = getSelectedSingle(groups.maintenance);
        const selectedPreferredContact = getSelectedSingle(groups.preferredContact);
        const selectedAdditions = getSelectedMulti(groups.additions)
            .map((option) => getOptionLabel(option))
            .filter((value) => value && value !== "Other");
        const otherValues = getOtherValues();
        const allAdditions = [...selectedAdditions, ...otherValues];
        const firstName = firstNameInput instanceof HTMLInputElement ? firstNameInput.value.trim() : "";
        const lastName = lastNameInput instanceof HTMLInputElement ? lastNameInput.value.trim() : "";
        const preferredContact = selectedPreferredContact
            ? getOptionLabel(selectedPreferredContact)
            : hiddenFields.preferredContact instanceof HTMLInputElement
                ? hiddenFields.preferredContact.value.trim()
                : "";

        if (preview.package instanceof HTMLElement) {
            preview.package.textContent = selectedPackage ? getOptionLabel(selectedPackage) : "Nothing selected yet";
        }

        if (preview.packageMeta instanceof HTMLElement) {
            preview.packageMeta.textContent = selectedPackage
                ? `${selectedPackage.dataset.value ?? ""} - ${selectedPackage.dataset.meta ?? ""}`
                : "Choose a package from the form.";
        }

        if (preview.maintenance instanceof HTMLElement) {
            preview.maintenance.textContent = selectedMaintenance ? getOptionLabel(selectedMaintenance) : "Nothing selected yet";
        }

        if (preview.maintenanceMeta instanceof HTMLElement) {
            preview.maintenanceMeta.textContent = selectedMaintenance
                ? `${selectedMaintenance.dataset.value ?? ""} - ${selectedMaintenance.dataset.meta ?? ""}`
                : "Choose one support level.";
        }

        if (preview.additions instanceof HTMLElement) {
            preview.additions.innerHTML = allAdditions.length === 0
                ? '<li class="services-summary-chip services-summary-chip-muted">No additions selected</li>'
                : allAdditions.map((value) => `<li class="services-summary-chip">${value}</li>`).join("");
        }

        if (preview.contact instanceof HTMLElement) {
            preview.contact.textContent = preferredContact || "Not set yet";
        }

        if (preview.person instanceof HTMLElement) {
            const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
            preview.person.textContent = fullName
                ? `${fullName}${preferredContact ? ` - prefers ${preferredContact}` : ""}`
                : "Fill in your details on the right.";
        }
    };

    Object.entries(groups).forEach(([role, group]) => {
        if (!(group instanceof HTMLElement)) {
            return;
        }

        const trigger = getTrigger(group);
        const options = getOptions(group);
        const isMulti = group.dataset.selectType === "multi";

        trigger?.addEventListener("click", () => {
            if (group.classList.contains("is-open")) {
                closeSelect(group);
            } else {
                openSelect(group);
            }
        });

        options.forEach((option) => {
            option.addEventListener("click", () => {
                if (isMulti) {
                    option.classList.toggle("is-selected");
                    setMultiSelection(group, getSelectedMulti(group).map((item) => item.dataset.value ?? ""));
                    syncAdditions();
                    toggleOtherShell();
                } else {
                    const value = option.dataset.value ?? "";
                    setSingleSelection(group, value);

                    if (role === "preferredContact" && hiddenFields.preferredContact instanceof HTMLInputElement) {
                        hiddenFields.preferredContact.value = value;
                    }

                    if (role === "package" && hiddenFields.package instanceof HTMLInputElement) {
                        hiddenFields.package.value = value;
                    }

                    if (role === "maintenance" && hiddenFields.maintenance instanceof HTMLInputElement) {
                        hiddenFields.maintenance.value = value;
                    }

                    closeSelect(group);
                }

                updatePreview();
            });
        });
    });

    if (otherAddButton instanceof HTMLButtonElement) {
        otherAddButton.addEventListener("click", () => {
            createOtherRow();
            syncOtherAdditions();
            updatePreview();
        });
    }

    [firstNameInput, lastNameInput].forEach((input) => input?.addEventListener("input", updatePreview));

    document.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Node)) {
            return;
        }

        Object.values(groups).forEach((group) => {
            if (group instanceof HTMLElement && !group.contains(target)) {
                closeSelect(group);
            }
        });
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            Object.values(groups).forEach((group) => closeSelect(group));
        }
    });

    if (hiddenFields.preferredContact instanceof HTMLInputElement && hiddenFields.preferredContact.value) {
        setSingleSelection(groups.preferredContact, hiddenFields.preferredContact.value);
    }

    if (hiddenFields.package instanceof HTMLInputElement && hiddenFields.package.value) {
        setSingleSelection(groups.package, hiddenFields.package.value);
    }

    if (hiddenFields.maintenance instanceof HTMLInputElement && hiddenFields.maintenance.value) {
        setSingleSelection(groups.maintenance, hiddenFields.maintenance.value);
    }

    if (hiddenFields.additions instanceof HTMLInputElement && hiddenFields.additions.value) {
        setMultiSelection(groups.additions, hiddenFields.additions.value.split("|").filter(Boolean));
    } else {
        setMultiSelection(groups.additions, []);
    }

    if (hiddenFields.otherAdditions instanceof HTMLInputElement && hiddenFields.otherAdditions.value.trim()) {
        const otherOption = findOption(groups.additions, "Other");
        if (otherOption instanceof HTMLButtonElement) {
            otherOption.classList.add("is-selected");
        }

        hiddenFields.otherAdditions.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean).forEach((value) => createOtherRow(value));
    }

    toggleOtherShell();
    syncAdditions();
    updatePreview();
});
