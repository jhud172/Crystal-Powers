package com.crystalpower.website.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class LegacyRouteController {

    @GetMapping("/home.html")
    public String legacyHome() {
        return "redirect:/";
    }

    @GetMapping("/about.html")
    public String legacyAbout() {
        return "redirect:/about";
    }

    @GetMapping("/services.html")
    public String legacyServices() {
        return "redirect:/services";
    }

    @GetMapping("/portfolio.html")
    public String legacyPortfolio() {
        return "redirect:/portfolio";
    }

    @GetMapping("/support.html")
    public String legacySupport() {
        return "redirect:/support";
    }

    @GetMapping("/contact.html")
    public String legacyContact() {
        return "redirect:/contact";
    }
}
