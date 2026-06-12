package com.crystalpower.website.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaController {

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
    public String spa() {
        return "forward:/index.html";
    }

    @GetMapping({
            "/{path:^(?!api$)[^\\.]*}",
            "/{path:^(?!api$)[^\\.]*}/{path2:[^\\.]*}",
            "/{path:^(?!api$)[^\\.]*}/{path2:[^\\.]*}/{path3:[^\\.]*}",
            "/{path:^(?!api$)[^\\.]*}/{path2:[^\\.]*}/{path3:[^\\.]*}/{path4:[^\\.]*}"
    })
    public String spaFallback() {
        return "forward:/index.html";
    }
}
