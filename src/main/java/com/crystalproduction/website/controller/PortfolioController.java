package com.crystalproduction.website.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Renders a portfolio page with example projects.  In a real
 * application the project data would likely come from a database,
 * but here it is represented statically in the template.
 */
@Controller
public class PortfolioController {

    @GetMapping("/portfolio")
    public String portfolio(Model model) {
        return "portfolio";
    }
}