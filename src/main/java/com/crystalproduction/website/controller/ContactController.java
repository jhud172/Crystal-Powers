package com.crystalproduction.website.controller;

import com.crystalproduction.website.dto.ContactForm;
import com.crystalproduction.website.service.InquiryEmailService;
import jakarta.validation.Valid;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class ContactController {

    private final InquiryEmailService inquiryEmailService;

    public ContactController(InquiryEmailService inquiryEmailService) {
        this.inquiryEmailService = inquiryEmailService;
    }

    @GetMapping("/contact")
    public String contact(Model model) {
        if (!model.containsAttribute("contactForm")) {
            model.addAttribute("contactForm", new ContactForm());
        }
        return "contact/index";
    }

    @PostMapping("/contact")
    public String submitContact(
            @Valid @ModelAttribute("contactForm") ContactForm contactForm,
            BindingResult bindingResult,
            Model model,
            RedirectAttributes redirectAttributes) {

        if (bindingResult.hasErrors()) {
            return "contact/index";
        }

        try {
            inquiryEmailService.sendInquiry(contactForm, null, "Contact page");
        } catch (InquiryEmailService.InquiryEmailException exception) {
            model.addAttribute("errorMessage", exception.getMessage());
            return "contact/index";
        }

        redirectAttributes.addFlashAttribute(
                "successMessage",
                "Thanks. Your enquiry has been sent and the build request is now in the inbox."
        );
        return "redirect:/contact";
    }
}
