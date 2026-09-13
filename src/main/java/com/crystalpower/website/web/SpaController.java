package com.crystalpower.website.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.http.CacheControl;
import com.crystalpower.website.service.PageMetadataService;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;

@Controller
public class SpaController {
    private final PageMetadataService metadata;
    public SpaController(PageMetadataService metadata) { this.metadata = metadata; }

    @GetMapping({
            "/",
            "/home",
            "/about",
            "/services",
            "/portfolio",
            "/portfolio/{slug}",
            "/support",
            "/contact"
    })
    @ResponseBody
    public ResponseEntity<String> spa(HttpServletRequest request) throws IOException {
        return page(request);
    }

    @GetMapping({
            "/{path:^(?!api$)[^\\.]*}",
            "/{path:^(?!api$)[^\\.]*}/{path2:[^\\.]*}",
            "/{path:^(?!api$)[^\\.]*}/{path2:[^\\.]*}/{path3:[^\\.]*}",
            "/{path:^(?!api$)[^\\.]*}/{path2:[^\\.]*}/{path3:[^\\.]*}/{path4:[^\\.]*}"
    })
    @ResponseBody
    public ResponseEntity<String> spaFallback(HttpServletRequest request) throws IOException {
        return page(request);
    }
    private ResponseEntity<String> page(HttpServletRequest request) throws IOException {
        var response = ResponseEntity.ok().contentType(MediaType.TEXT_HTML).cacheControl(CacheControl.noStore());
        if (request.getRequestURI().startsWith("/admin")) response.header("X-Robots-Tag", "noindex, nofollow");
        return response.body(metadata.html(request.getRequestURI()));
    }
}
