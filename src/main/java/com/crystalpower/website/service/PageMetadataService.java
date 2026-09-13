package com.crystalpower.website.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.HtmlUtils;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.regex.Matcher;

/** Supplies share-card metadata in the first HTTP response, including dynamic projects. */
@Service
public class PageMetadataService {
    private record Meta(String title, String description) {}
    private static final Map<String, Meta> PAGES = Map.of(
        "/", new Meta("Crystal Powers | Websites, apps & digital experiences", "Independent design and development by James. Distinctive websites, apps and bespoke systems, thoughtfully built around your business."),
        "/about", new Meta("Meet James | Crystal Powers", "Meet James, Founder & CEO of Crystal Powers, an independent design and development studio."),
        "/services", new Meta("Websites, apps & bespoke systems | Crystal Powers", "Explore website packages, app development, custom digital systems and ongoing support."),
        "/portfolio", new Meta("Selected projects | Crystal Powers", "Explore websites, apps and systems designed and developed by Crystal Powers."),
        "/support", new Meta("Support & maintenance | Crystal Powers", "Help with website updates, fixes, maintenance and the next chapter after launch."),
        "/contact", new Meta("Start a project | Crystal Powers", "Tell James about your next website, app or digital project.")
    );
    private final ProjectService projects;
    private final String base;
    public PageMetadataService(ProjectService projects, @Value("${app.public-url}") String base) { this.projects = projects; this.base = base.replaceAll("/+$", ""); }
    public String html(String path) throws IOException {
        String page = new ClassPathResource("static/index.html").getContentAsString(StandardCharsets.UTF_8);
        Meta meta = PAGES.getOrDefault(path, new Meta("Crystal Powers", "Independent websites, apps and digital experiences."));
        String image = base + "/renders/crystal-dark.png";
        boolean privatePage = path.startsWith("/admin") || path.startsWith("/birthday");
        if (path.startsWith("/portfolio/")) {
            try {
                var project = projects.published(path.substring("/portfolio/".length()));
                meta = new Meta(project.content().title() + " | Crystal Powers", project.content().summary());
                if (project.content().coverMediaId() != null) image = base + "/api/media/" + project.content().coverMediaId();
            } catch (ResponseStatusException exception) { privatePage = true; }
        } else if (!PAGES.containsKey(path)) privatePage = true;
        if (path.startsWith("/admin")) meta = new Meta("Owner studio | Crystal Powers", "Private project management.");
        page = page.replaceFirst("<title>[^<]*</title>", Matcher.quoteReplacement("<title>" + HtmlUtils.htmlEscape(meta.title()) + "</title>"));
        page = tag(page, "name", "description", meta.description());
        page = tag(page, "property", "og:title", meta.title()); page = tag(page, "property", "og:description", meta.description());
        page = tag(page, "name", "twitter:title", meta.title()); page = tag(page, "name", "twitter:description", meta.description());
        page = tag(page, "property", "og:image", image); page = tag(page, "property", "og:url", base + path);
        page = tag(page, "name", "robots", privatePage ? "noindex, nofollow" : "index, follow");
        return page.replaceFirst("<link rel=\"canonical\"[^>]*>", Matcher.quoteReplacement("<link rel=\"canonical\" href=\"" + HtmlUtils.htmlEscape(base + path) + "\" />"));
    }
    private String tag(String html, String attribute, String name, String content) {
        String tag = "<meta " + attribute + "=\"" + name + "\" content=\"" + HtmlUtils.htmlEscape(content) + "\" />";
        return html.replaceFirst("<meta " + attribute + "=\"" + name + "\"[^>]*>", Matcher.quoteReplacement(tag));
    }
}
