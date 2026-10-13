package com.crystalpower.website.validation;

import com.crystalpower.website.dto.ContactForm;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.springframework.util.StringUtils;
import java.net.URI;

/** Conditional requirements retain field-linked errors on both enquiry endpoints. */
public class InquiryValidator implements ConstraintValidator<ValidInquiry, ContactForm> {
    @Override
    public boolean isValid(ContactForm form, ConstraintValidatorContext context) {
        if (form == null) return true;
        context.disableDefaultConstraintViolation();
        boolean valid = true;
        if ("website".equals(form.getIntent())) {
            if (!StringUtils.hasText(form.getPackageSelection())) {
                error(context, "packageSelection", "Please choose a package or discuss the scope with James.");
                valid = false;
            }
            if (!StringUtils.hasText(form.getMaintenanceSelection())) {
                error(context, "maintenanceSelection", "Please choose an aftercare plan or discuss it later.");
                valid = false;
            }
            if (StringUtils.hasText(form.getSelectedAdditions())
                    && java.util.Arrays.stream(form.getSelectedAdditions().split("\\|"))
                            .anyMatch(value -> "Other".equals(value.trim()))
                    && !StringUtils.hasText(form.getOtherAdditions())) {
                error(context, "otherAdditions", "Please describe the custom additions you selected.");
                valid = false;
            }
        }
        if ("WhatsApp".equals(form.getPreferredContactPoint()) && !StringUtils.hasText(form.getPhoneNumber())) {
            error(context, "phoneNumber", "Please enter a phone number for a WhatsApp reply.");
            valid = false;
        }
        if ("support".equals(form.getIntent()) && !StringUtils.hasText(form.getWebsiteAddress())) {
            error(context, "websiteAddress", "Please include the website address so James can identify the project.");
            valid = false;
        }
        if (StringUtils.hasText(form.getWebsiteAddress()) && !isWebAddress(form.getWebsiteAddress())) {
            error(context, "websiteAddress", "Enter a complete website address starting with https:// or http://.");
            valid = false;
        }
        return valid;
    }

    private boolean isWebAddress(String value) {
        try {
            URI address = URI.create(value.trim());
            return ("https".equalsIgnoreCase(address.getScheme()) || "http".equalsIgnoreCase(address.getScheme()))
                    && StringUtils.hasText(address.getHost()) && address.getUserInfo() == null;
        } catch (IllegalArgumentException exception) { return false; }
    }

    private void error(ConstraintValidatorContext context, String field, String message) {
        context.buildConstraintViolationWithTemplate(message).addPropertyNode(field).addConstraintViolation();
    }
}
