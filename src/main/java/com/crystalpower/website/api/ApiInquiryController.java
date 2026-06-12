package com.crystalpower.website.api;

import com.crystalpower.website.dto.ContactForm;
import com.crystalpower.website.service.InquiryEmailService;
import com.crystalpower.website.service.UploadValidationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class ApiInquiryController {

    private final InquiryEmailService inquiryEmailService;
    private final UploadValidationService uploadValidationService;

    public ApiInquiryController(
            InquiryEmailService inquiryEmailService,
            UploadValidationService uploadValidationService) {
        this.inquiryEmailService = inquiryEmailService;
        this.uploadValidationService = uploadValidationService;
    }

    @PostMapping("/api/contact")
    public ResponseEntity<ApiFormResponse> submitContact(
            @Valid @ModelAttribute ContactForm contactForm,
            BindingResult bindingResult) {

        if (bindingResult.hasErrors()) {
            return validationResponse(bindingResult);
        }

        try {
            inquiryEmailService.sendInquiry(contactForm, null, "Contact page");
        } catch (InquiryEmailService.InquiryEmailException exception) {
            return errorResponse(exception.getMessage(), HttpStatus.SERVICE_UNAVAILABLE);
        }

        return ResponseEntity.ok(ApiFormResponse.success("Thanks. Your enquiry has been sent and the build request is now in the inbox."));
    }

    @PostMapping("/api/services")
    public ResponseEntity<ApiFormResponse> submitServicesQuote(
            @Valid @ModelAttribute ContactForm contactForm,
            BindingResult bindingResult,
            @RequestParam(name = "referenceFiles", required = false) MultipartFile[] referenceFiles) {

        String uploadErrorMessage = uploadValidationService.validateReferenceFiles(referenceFiles);

        if (bindingResult.hasErrors() || StringUtils.hasText(uploadErrorMessage)) {
            Map<String, String> errors = fieldErrors(bindingResult);

            if (StringUtils.hasText(uploadErrorMessage)) {
                errors.put("referenceFiles", uploadErrorMessage);
            }

            return ResponseEntity.badRequest().body(ApiFormResponse.failure("Please check the highlighted fields and try again.", errors));
        }

        try {
            inquiryEmailService.sendInquiry(contactForm, referenceFiles, "Services page");
        } catch (InquiryEmailService.InquiryEmailException exception) {
            return errorResponse(exception.getMessage(), HttpStatus.SERVICE_UNAVAILABLE);
        }

        return ResponseEntity.ok(ApiFormResponse.success("Thanks. Your build request has been sent and the quote details are now in the inbox."));
    }

    private ResponseEntity<ApiFormResponse> validationResponse(BindingResult bindingResult) {
        return ResponseEntity.badRequest().body(ApiFormResponse.failure("Please check the highlighted fields and try again.", fieldErrors(bindingResult)));
    }

    private ResponseEntity<ApiFormResponse> errorResponse(String message, HttpStatus status) {
        return ResponseEntity.status(status).body(ApiFormResponse.failure(message, Map.of()));
    }

    private Map<String, String> fieldErrors(BindingResult bindingResult) {
        Map<String, String> errors = new LinkedHashMap<>();

        for (FieldError error : bindingResult.getFieldErrors()) {
            errors.putIfAbsent(error.getField(), error.getDefaultMessage());
        }

        return errors;
    }

    public record ApiFormResponse(
            boolean success,
            String message,
            Map<String, String> fieldErrors
    ) {
        public static ApiFormResponse success(String message) {
            return new ApiFormResponse(true, message, Map.of());
        }

        public static ApiFormResponse failure(String message, Map<String, String> fieldErrors) {
            return new ApiFormResponse(false, message, fieldErrors);
        }
    }
}
