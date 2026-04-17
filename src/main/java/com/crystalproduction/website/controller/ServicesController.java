package com.crystalproduction.website.controller;

import com.crystalproduction.website.dto.ContactForm;
import com.crystalproduction.website.service.InquiryEmailService;
import jakarta.validation.Valid;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.util.StringUtils;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.Arrays;
import java.util.List;

@Controller
public class ServicesController {

    private static final long MAX_TOTAL_UPLOAD_BYTES = 15L * 1024 * 1024;
    private static final int MAX_UPLOAD_COUNT = 5;

    private final InquiryEmailService inquiryEmailService;

    public ServicesController(InquiryEmailService inquiryEmailService) {
        this.inquiryEmailService = inquiryEmailService;
    }

    @GetMapping("/services")
    public String services(Model model) {
        if (!model.containsAttribute("contactForm")) {
            model.addAttribute("contactForm", new ContactForm());
        }
        return "services/index";
    }

    @PostMapping("/services")
    public String submitServicesQuote(
            @Valid @ModelAttribute("contactForm") ContactForm contactForm,
            BindingResult bindingResult,
            @RequestParam(name = "referenceFiles", required = false) MultipartFile[] referenceFiles,
            Model model,
            RedirectAttributes redirectAttributes) {

        String uploadErrorMessage = validateReferenceFiles(referenceFiles);

        if (StringUtils.hasText(uploadErrorMessage)) {
            model.addAttribute("uploadErrorMessage", uploadErrorMessage);
        }

        if (bindingResult.hasErrors() || StringUtils.hasText(uploadErrorMessage)) {
            return "services/index";
        }

        try {
            inquiryEmailService.sendInquiry(contactForm, referenceFiles, "Services page");
        } catch (InquiryEmailService.InquiryEmailException exception) {
            model.addAttribute("errorMessage", exception.getMessage());
            return "services/index";
        }

        redirectAttributes.addFlashAttribute(
                "successMessage",
                "Thanks. Your build request has been sent and the quote details are now in the inbox."
        );
        return "redirect:/services";
    }

    private String validateReferenceFiles(MultipartFile[] referenceFiles) {
        List<MultipartFile> files = referenceFiles == null
                ? List.of()
                : Arrays.stream(referenceFiles)
                .filter(file -> file != null && !file.isEmpty())
                .toList();

        if (files.size() > MAX_UPLOAD_COUNT) {
            return "Please keep uploads to five files or fewer.";
        }

        long totalSize = files.stream()
                .mapToLong(MultipartFile::getSize)
                .sum();

        if (totalSize > MAX_TOTAL_UPLOAD_BYTES) {
            return "Please keep uploads under 15MB total so the email can be delivered reliably.";
        }

        for (MultipartFile file : files) {
            String contentType = file.getContentType();

            if (StringUtils.hasText(contentType)
                    && !contentType.startsWith("image/")
                    && !contentType.startsWith("video/")) {
                return "Uploads can only include image or video files.";
            }
        }

        return null;
    }
}
