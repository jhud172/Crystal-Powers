package com.crystalpower.website.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.HtmlUtils;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.regex.Matcher;

/** Supplies share-card metadata in the first HTTP response, including dynamic projects. */
@Service
public class PageMetadataService {
    public record RenderedPage(String html, HttpStatus status, boolean noindex) {}
    private record Meta(String title, String description) {}
    private static final Map<String, Meta> PAGES = Map.of(
        "/", new Meta("Crystal Powers | Websites, apps & digital experiences", "Independent design and development by James. Distinctive websites, apps and bespoke systems, thoughtfully built around your business."),
        "/about", new Meta("Meet James | Crystal Powers", "Meet James, founder of Crystal Powers, and explore his independent design and development studio."),
        "/services", new Meta("Websites, apps & bespoke systems | Crystal Powers", "Explore website packages, application development, custom digital systems and ongoing support from Crystal Powers."),
        "/portfolio", new Meta("Selected projects | Crystal Powers", "Explore published Crystal Powers projects and the decisions behind their design and development."),
        "/support", new Meta("Support & maintenance | Crystal Powers", "Help with website updates, fixes, maintenance and the next chapter after launch."),
        "/contact", new Meta("Start a project | Crystal Powers", "Tell James about your next website, app or digital project. Work directly with the founder of Crystal Powers."),
        "/accessibility", new Meta("Accessibility | Crystal Powers", "Use the Crystal Powers website with appearance choices, reduced effects, keyboard controls and a way to report access problems.")
    );
    private final ProjectService projects;
    private final PublicPrivacyService privacy;
    private final String base;
    public PageMetadataService(ProjectService projects, PublicPrivacyService privacy, @Value("${app.public-url}") String base) { this.projects = projects;this.privacy=privacy; this.base = base.replaceAll("/+$", ""); }
    public RenderedPage render(String path) throws IOException {
        path = path.replaceAll("/+$", "");
        if (path.isEmpty() || path.equals("/home")) path = "/";
        String page = new ClassPathResource("static/index.html").getContentAsString(StandardCharsets.UTF_8);
        Meta meta = PAGES.getOrDefault(path, new Meta("Page not found | Crystal Powers", "This page is unavailable. Explore the studio, published work or contact James."));
        String image = base + "/renders/liquid-light/hero.png";
        boolean ownerPage = path.equals("/admin") || path.startsWith("/admin/");
        boolean teamPage = path.equals("/team") || path.startsWith("/team/");
        boolean clientPage = path.equals("/client") || path.startsWith("/client/");
        boolean specialPage = path.equals("/birthday/mission-vi");
        boolean privatePage = ownerPage || teamPage || clientPage || specialPage;
        boolean missing = !PAGES.containsKey(path) && !privatePage;
        if(path.equals("/privacy") && privacy.ready()){meta=new Meta("Privacy & your data | Crystal Powers","How Crystal Powers handles personal information, contact details and project communications.");missing=false;}
        if (path.startsWith("/portfolio/")) {
            try {
                var project = projects.published(path.substring("/portfolio/".length()));
                meta = new Meta(project.content().title() + " | Crystal Powers", project.content().summary());
                missing = false;
                if (project.content().coverMediaId() != null) image = base + "/api/media/" + project.content().coverMediaId();
            } catch (ResponseStatusException exception) {
                if (exception.getStatusCode() != HttpStatus.NOT_FOUND) throw exception;
                missing = true;
            }
        }
        privatePage = privatePage || missing;
        if (ownerPage) meta = new Meta("Owner studio | Crystal Powers", "Private project management.");
        if (teamPage) meta = new Meta("Team workspace | Crystal Powers", "Private team communication.");
        if (clientPage) meta = new Meta("Client workspace | Crystal Powers", "Private project progress and conversations.");
        if (specialPage) meta = new Meta("Mission VI | Crystal Powers", "A personal experience.");
        page = page.replaceFirst("<title>[^<]*</title>", Matcher.quoteReplacement("<title>" + HtmlUtils.htmlEscape(meta.title()) + "</title>"));
        page = tag(page, "name", "description", meta.description());
        page = tag(page, "property", "og:title", meta.title()); page = tag(page, "property", "og:description", meta.description());
        page = tag(page, "name", "twitter:title", meta.title()); page = tag(page, "name", "twitter:description", meta.description());
        page = tag(page, "property", "og:image", image); page = tag(page, "name", "twitter:image", image); page = tag(page, "property", "og:url", base + path);
        page = tag(page, "name", "robots", privatePage ? "noindex, nofollow" : "index, follow");
        page = page.replaceFirst("<link rel=\"canonical\"[^>]*>", Matcher.quoteReplacement("<link rel=\"canonical\" href=\"" + HtmlUtils.htmlEscape(base + path) + "\" />"));
        return new RenderedPage(page, missing ? HttpStatus.NOT_FOUND : HttpStatus.OK, privatePage);
    }
    private String tag(String html, String attribute, String name, String content) {
        String tag = "<meta " + attribute + "=\"" + name + "\" content=\"" + HtmlUtils.htmlEscape(content) + "\" />";
        return html.replaceFirst("<meta " + attribute + "=\"" + name + "\"[^>]*>", Matcher.quoteReplacement(tag));
    }
}
