package com.crystalpower.website.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = InquiryValidator.class)
public @interface ValidInquiry {
    String message() default "Please check the enquiry details.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
