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
    private final com.crystalpower.website.security.AttemptLimiter limiter;

    public ApiInquiryController(
            InquiryEmailService inquiryEmailService,
            UploadValidationService uploadValidationService, com.crystalpower.website.security.AttemptLimiter limiter) {
        this.inquiryEmailService = inquiryEmailService;
        this.uploadValidationService = uploadValidationService;
        this.limiter = limiter;
    }

    @PostMapping("/api/contact")
    public ResponseEntity<ApiFormResponse> submitContact(
            @Valid @ModelAttribute ContactForm contactForm,
            BindingResult bindingResult, jakarta.servlet.http.HttpServletRequest request) {

        if (bindingResult.hasErrors()) {
            return validationResponse(bindingResult);
        }

        try {
            limit(request, contactForm);
            inquiryEmailService.sendInquiry(contactForm, null, "Contact page");
        } catch (org.springframework.web.server.ResponseStatusException exception) {
            return errorResponse("Too many enquiries. Please wait before trying again.", HttpStatus.TOO_MANY_REQUESTS);
        } catch (InquiryEmailService.InquiryEmailException exception) {
            return errorResponse(exception.getMessage(), HttpStatus.SERVICE_UNAVAILABLE);
        }

        return ResponseEntity.ok(ApiFormResponse.success("Thanks. Your enquiry has been sent and the build request is now in the inbox."));
    }

    @PostMapping("/api/services")
    public ResponseEntity<ApiFormResponse> submitServicesQuote(
            @Valid @ModelAttribute ContactForm contactForm,
            BindingResult bindingResult,
            @RequestParam(name = "referenceFiles", required = false) MultipartFile[] referenceFiles, jakarta.servlet.http.HttpServletRequest request) {

        String uploadErrorMessage = uploadValidationService.validateReferenceFiles(referenceFiles);

        if (bindingResult.hasErrors() || StringUtils.hasText(uploadErrorMessage)) {
            Map<String, String> errors = fieldErrors(bindingResult);

            if (StringUtils.hasText(uploadErrorMessage)) {
                errors.put("referenceFiles", uploadErrorMessage);
            }

            return ResponseEntity.badRequest().body(ApiFormResponse.failure("Please check the highlighted fields and try again.", errors));
        }

        try {
            limit(request, contactForm);
            inquiryEmailService.sendInquiry(contactForm, referenceFiles, "Services page");
        } catch (org.springframework.web.server.ResponseStatusException exception) {
            return errorResponse("Too many enquiries. Please wait before trying again.", HttpStatus.TOO_MANY_REQUESTS);
        } catch (InquiryEmailService.InquiryEmailException exception) {
            return errorResponse(exception.getMessage(), HttpStatus.SERVICE_UNAVAILABLE);
        }

        return ResponseEntity.ok(ApiFormResponse.success("Thanks. Your build request has been sent and the quote details are now in the inbox."));
    }

    private void limit(jakarta.servlet.http.HttpServletRequest request, ContactForm form) {
        limiter.check("inquiry-ip:" + request.getRemoteAddr(), 15, 3600);
        limiter.check("inquiry-email:" + org.apache.commons.codec.digest.DigestUtils.sha256Hex(form.getEmail().trim().toLowerCase(java.util.Locale.ROOT)), 5, 3600);
        limiter.check("inquiry-daily", 60, 86400);
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
