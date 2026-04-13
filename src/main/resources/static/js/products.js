document.addEventListener("DOMContentLoaded", () => {
    const openButtons = document.querySelectorAll("[data-dialog-open]");
    const dialogs = document.querySelectorAll("[data-product-dialog]");

    const closeDialog = (dialog) => {
        if (dialog && typeof dialog.close === "function") {
            dialog.close();
        }
    };

    openButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const dialogName = button.getAttribute("data-dialog-open");
            const dialog = document.querySelector(`[data-product-dialog="${dialogName}"]`);
            if (dialog && typeof dialog.showModal === "function") {
                dialog.showModal();
            }
        });
    });

    dialogs.forEach((dialog) => {
        dialog.addEventListener("click", (event) => {
            const rect = dialog.getBoundingClientRect();
            const clickedBackdrop =
                event.clientY < rect.top ||
                event.clientY > rect.bottom ||
                event.clientX < rect.left ||
                event.clientX > rect.right;

            if (clickedBackdrop) {
                closeDialog(dialog);
            }
        });

        dialog.querySelectorAll("[data-dialog-close]").forEach((button) => {
            button.addEventListener("click", () => closeDialog(dialog));
        });
    });
});
