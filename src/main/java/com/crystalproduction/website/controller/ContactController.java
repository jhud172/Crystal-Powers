package com.crystalproduction.website.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Displays a contact page with a form.  Submission handling is
 * intentionally omitted; the button is disabled to indicate that
 * this example site does not process form submissions.
 */
@Controller
public class ContactController {

    @GetMapping("/contact")
    public String contact(Model model) {
        return "contact";
    }
}