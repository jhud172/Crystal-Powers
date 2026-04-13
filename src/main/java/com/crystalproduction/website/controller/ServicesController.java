package com.crystalproduction.website.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Presents the list of services offered by Crystal Production LTD.  The
 * associated view describes packages and pricing information.
 */
@Controller
public class ServicesController {

    @GetMapping("/services")
    public String services(Model model) {
        return "services";
    }
}