package com.crystalpower.website.web;

import com.crystalpower.website.service.ProjectService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.HtmlUtils;
import java.time.Duration;
import java.util.List;

@RestController
public class SiteMetadataController {
    private final ProjectService projects;
    private final String baseUrl;
    public SiteMetadataController(ProjectService projects, @Value("${app.public-url}") String baseUrl) { this.projects = projects; this.baseUrl = baseUrl.replaceAll("/+$", ""); }
    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> sitemap() {
        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");
        for (String path : List.of("/", "/about", "/services", "/portfolio", "/support", "/contact")) append(xml, path);
        projects.published().forEach(project -> append(xml, "/portfolio/" + project.slug()));
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofSeconds(30)).mustRevalidate()).body(xml.append("</urlset>").toString());
    }
    @GetMapping(value = "/robots.txt", produces = MediaType.TEXT_PLAIN_VALUE)
    public String robots() { return "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /birthday/\nSitemap: " + baseUrl + "/sitemap.xml\n"; }
    private void append(StringBuilder xml, String path) { xml.append("<url><loc>").append(HtmlUtils.htmlEscape(baseUrl + path)).append("</loc></url>"); }
}
