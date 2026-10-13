package com.crystalpower.website.api;

import com.crystalpower.website.dto.ContactForm;
import com.crystalpower.website.service.SupportIntakeService;
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

    private final SupportIntakeService intake;
    private final UploadValidationService uploadValidationService;
    private final com.crystalpower.website.security.AttemptLimiter limiter;

    public ApiInquiryController(
            SupportIntakeService intake,
            UploadValidationService uploadValidationService, com.crystalpower.website.security.AttemptLimiter limiter) {
        this.intake = intake;
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

        java.util.UUID reference;
        try {
            limit(request, contactForm);
            reference = intake.receive(contactForm, null, "Contact page", submissionKey(request));
        } catch (org.springframework.web.server.ResponseStatusException exception) {
            return submissionFailure(exception);
        } catch (org.springframework.dao.DataIntegrityViolationException exception) {
            return errorResponse("This enquiry is already being recorded. Please wait briefly, then retry.", HttpStatus.CONFLICT);
        } catch (org.springframework.dao.DataAccessException exception) {
            return errorResponse("The enquiry store is temporarily unavailable. Your details remain in the form; please try again.", HttpStatus.SERVICE_UNAVAILABLE);
        }

        return ResponseEntity.ok(ApiFormResponse.success("Thanks. Your enquiry is saved and its notification has been sent. The Crystal Powers team will review it and reply using your chosen contact method.", reference));
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

        java.util.UUID reference;
        try {
            limit(request, contactForm);
            reference = intake.receive(contactForm, referenceFiles, "Services page", submissionKey(request));
        } catch (org.springframework.web.server.ResponseStatusException exception) {
            return submissionFailure(exception);
        } catch (org.springframework.dao.DataIntegrityViolationException exception) {
            return errorResponse("This enquiry is already being recorded. Please wait briefly, then retry.", HttpStatus.CONFLICT);
        } catch (org.springframework.dao.DataAccessException exception) {
            return errorResponse("The enquiry store is temporarily unavailable. Your details remain in the form; please try again.", HttpStatus.SERVICE_UNAVAILABLE);
        }

        return ResponseEntity.ok(ApiFormResponse.success("Thanks. Your enquiry and reference files are saved for review, and the team notification has been sent. Crystal Powers will review the details and reply using your chosen contact method.", reference));
    }

    private java.util.UUID submissionKey(jakarta.servlet.http.HttpServletRequest request) {
        String supplied = request.getHeader("Idempotency-Key");
        if (supplied == null || supplied.isBlank()) return java.util.UUID.randomUUID();
        try { var key = java.util.UUID.fromString(supplied); if (!key.toString().equalsIgnoreCase(supplied)) throw new IllegalArgumentException(); return key; }
        catch (IllegalArgumentException invalid) { throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "The submission reference is invalid. Please refresh the form and try again."); }
    }
    private ResponseEntity<ApiFormResponse> submissionFailure(org.springframework.web.server.ResponseStatusException exception) {
        String message = exception.getStatusCode().value() == 429 ? "Too many enquiries. Please wait before trying again." : exception.getReason() == null ? "The enquiry could not be confirmed. Please try again." : exception.getReason();
        java.util.UUID reference = exception instanceof SupportIntakeService.ReceiptException receipt ? receipt.requestId() : null;
        return ResponseEntity.status(exception.getStatusCode()).body(new ApiFormResponse(false, message, Map.of(), reference));
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
            Map<String, String> fieldErrors,
            java.util.UUID requestId
    ) {
        public static ApiFormResponse success(String message) {
            return success(message, null);
        }
        public static ApiFormResponse success(String message, java.util.UUID reference) { return new ApiFormResponse(true, message, Map.of(), reference); }

        public static ApiFormResponse failure(String message, Map<String, String> fieldErrors) {
            return new ApiFormResponse(false, message, fieldErrors, null);
        }
    }
}
