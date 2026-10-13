package com.crystalpower.website.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record ProjectContent(
        @NotNull @Size(max = 160) String title,
        @NotNull Category category,
        @NotNull @Size(max = 600) String summary,
        @NotNull @Size(max = 8000) String overview,
        @NotNull @Size(max = 8000) String approach,
        @NotNull @Size(max = 8000) String outcome,
        @NotNull @Size(max = 2048) String liveUrl,
        @NotNull @Size(max = 20) List<@NotNull @Size(max = 60) String> technologies,
        @NotNull Device displayDevice,
        UUID coverMediaId,
        @NotNull @Size(max = 300) String coverAlt,
        @NotNull @Size(max = 16) List<@NotNull @Valid GalleryImage> gallery,
        @Valid Screens screens) {
    /** Keeps source callers and historical revisions compatible with optional screen slots. */
    public ProjectContent(String title, Category category, String summary, String overview, String approach,
                          String outcome, String liveUrl, List<String> technologies, Device displayDevice,
                          UUID coverMediaId, String coverAlt, List<GalleryImage> gallery) {
        this(title, category, summary, overview, approach, outcome, liveUrl, technologies, displayDevice,
                coverMediaId, coverAlt, gallery, null);
    }
    public enum Category { WEBSITE, APP, SYSTEM }
    public enum Device { laptop, monitor, phone }
    public record GalleryImage(@NotNull UUID mediaId, @NotNull @Size(max = 300) String alt) {}
    public record Screens(@Valid GalleryImage desktop, @Valid GalleryImage mobile) {}
}
