package com.crystalproduction.website.controller;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Controller
public class PortfolioController {

    private static final Map<String, PortfolioProject> PROJECTS = Map.of(
            "editorial-service-landing-flow",
            new PortfolioProject(
                    "Editorial service landing flow",
                    "Private client - editorial service brand",
                    "Website build - launch system",
                    "Premium website direction focused on tone, hierarchy, and a cleaner path from first impression to enquiry.",
                    "The build was structured to feel premium immediately: editorial pacing, generous spacing, and a cleaner hierarchy around the service offer.",
                    "I built this around a cleaner page rhythm, bolder typography, and sections that guide the eye instead of competing for attention.",
                    "What makes it work is the way the page feels intentional from top to bottom. The layout does not just look polished; it supports the offer and makes the client feel more established.",
                    List.of(
                            "Strong opening hero with clearer trust signals",
                            "Service sections ordered around decision-making",
                            "Sharper enquiry path without overloading the page"
                    ),
                    "/images/project1.png"
            ),
            "product-detail-conversion-pass",
            new PortfolioProject(
                    "Product detail and conversion pass",
                    "Product brand - storefront system",
                    "E-commerce build - conversion restructure",
                    "Storefront layout shaped to make the product clearer, the offer sharper, and the conversion path easier to trust.",
                    "This project focused on product hierarchy and a stronger buying journey, keeping the design cleaner while making the product value more legible.",
                    "The work was built around simplifying the storefront: tightening component spacing, clarifying section order, and pushing important actions higher in the visual flow.",
                    "The result works because it feels easier to scan and easier to trust. The page stops feeling crowded and starts behaving like a proper conversion surface.",
                    List.of(
                            "Clearer product detail structure",
                            "Reduced friction around the call to action",
                            "More deliberate visual hierarchy across offer blocks"
                    ),
                    "/images/project2.png"
            ),
            "portfolio-booking-surface",
            new PortfolioProject(
                    "Portfolio and booking surface",
                    "Creator brand - independent client",
                    "Creator website - booking flow",
                    "Booking-ready portfolio designed to let the work lead while keeping the presentation clean, sharp, and premium.",
                    "This build balanced personality with restraint, letting the portfolio feel premium without drowning the work in unnecessary decoration.",
                    "I built it around a lighter structure with stronger spacing, clearer image framing, and a simpler route into contact or booking.",
                    "It works because the work stays central. The interface supports the creator instead of stealing attention from what they have actually made.",
                    List.of(
                            "Focused showcase sections for featured work",
                            "Booking route surfaced without overwhelming the page",
                            "Cleaner visual system with stronger image handling"
                    ),
                    "/images/project3.png"
            ),
            "launch-support-surface",
            new PortfolioProject(
                    "Launch support surface",
                    "Campaign client - rollout page",
                    "Launch page - supporting media direction",
                    "Sharper launch-facing page built to frame an offer, hold attention, and keep the rollout visually consistent.",
                    "This build focused on launch presentation, pairing bolder visual treatment with a tighter page structure so the offer felt more elevated.",
                    "The page was shaped around the campaign story first, then tightened into a stronger rhythm with fewer competing elements.",
                    "It works because the visuals support the message instead of overshadowing it. The page feels like part of the launch, not an afterthought around it.",
                    List.of(
                            "Clear launch framing and campaign sections",
                            "Visual support aligned to the core offer",
                            "More focused CTA positioning across the page"
                    ),
                    "/images/WebsiteGFX.png"
            ),
            "operational-structure-showcase",
            new PortfolioProject(
                    "Operational structure showcase",
                    "Ops client - systems project",
                    "System surface - operational architecture",
                    "Project view focused on making systems, structure, and operational clarity feel more visible and professional.",
                    "This project translated a structural service into something easier to understand visually, using cleaner blocks and stronger hierarchy.",
                    "The focus was on simplifying how the structure was presented, so the page felt more confident without losing technical clarity.",
                    "It works because the project feels easier to trust. The page communicates system depth without forcing the user to work to understand it.",
                    List.of(
                            "Clear breakdown of operational flows",
                            "Cleaner visual grouping around services",
                            "Sharper trust-building presentation for complex work"
                    ),
                    "/images/ServerSetup.png"
            ),
            "automation-workflow-preview",
            new PortfolioProject(
                    "Automation workflow preview",
                    "Utility client - automation concept",
                    "Workflow surface - utility direction",
                    "Scoped automation concept framed as part of a wider digital system rather than a disconnected utility page.",
                    "This project focused on presenting a smaller automation system in a way that still felt polished, premium, and integrated into the client offer.",
                    "I approached it by tightening the structure around the workflow story: what it does, how it helps, and why the scope stays intentionally controlled.",
                    "It works because the automation feels purposeful instead of gimmicky. The page explains the value while still fitting a more premium studio style.",
                    List.of(
                            "Scoped feature presentation without feature bloat",
                            "Cleaner breakdown of utility workflows",
                            "Stronger visual framing for a technical service"
                    ),
                    "/images/DiscordBot.png"
            )
    );

    @GetMapping("/portfolio")
    public String portfolio() {
        return "portfolio/index";
    }

    @GetMapping("/portfolio/{slug}")
    public String portfolioProject(@PathVariable String slug, Model model) {
        PortfolioProject project = PROJECTS.get(slug);

        if (project == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }

        model.addAttribute("pageTitle", project.title());
        model.addAttribute("pageDescription", project.summary());
        model.addAttribute("projectTitle", project.title());
        model.addAttribute("projectCompany", project.company());
        model.addAttribute("projectMeta", project.meta());
        model.addAttribute("projectSummary", project.summary());
        model.addAttribute("projectAbout", project.about());
        model.addAttribute("projectCreation", project.creation());
        model.addAttribute("projectWhyItWorks", project.whyItWorks());
        model.addAttribute("projectFeatures", project.features());
        model.addAttribute("projectImage", project.image());
        return "portfolio/project";
    }

    private record PortfolioProject(
            String title,
            String company,
            String meta,
            String summary,
            String about,
            String creation,
            String whyItWorks,
            List<String> features,
            String image
    ) {
    }
}
