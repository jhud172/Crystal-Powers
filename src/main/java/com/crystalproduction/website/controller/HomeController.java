package com.crystalproduction.website.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Controller for handling requests to the root of the site.  It
 * populates the home page with the company name and tagline.
 */
@Controller
public class HomeController {

    @GetMapping("/")
    public String home(Model model) {
        model.addAttribute("companyName", "Crystal Production LTD");
        model.addAttribute("tagline", "Crafting bespoke websites to grow your business");
        return "home";
    }
}