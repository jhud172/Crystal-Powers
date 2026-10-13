package com.crystalpower.website.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import com.crystalpower.website.validation.ValidInquiry;

@ValidInquiry
public class ContactForm {

    // Missing intent preserves the original website-enquiry contract.
    @Pattern(regexp = "website|app|system|general|support", message = "Please choose a valid enquiry purpose.")
    @NotBlank(message = "Please choose an enquiry purpose.")
    private String intent = "website";

    @Size(max = 160, message = "Project interest must be 160 characters or fewer.")
    private String projectInterest;

    public String getProjectInterest() { return projectInterest; }
    public void setProjectInterest(String projectInterest) { this.projectInterest = projectInterest; }

    @Size(max = 2048, message = "Website address must be 2048 characters or fewer.")
    private String websiteAddress;

    @Size(max = 1500, message = "Expected result must be 1500 characters or fewer.")
    private String expectedResult;

    @Size(max = 2500, message = "Steps must be 2500 characters or fewer.")
    private String reproductionSteps;

    @NotBlank(message = "Please enter your first name.")
    @Size(max = 80, message = "First name must be 80 characters or fewer.")
    private String firstName;

    @Size(max = 80, message = "Last name must be 80 characters or fewer.")
    private String lastName;

    @NotBlank(message = "Please enter your email address.")
    @Email(message = "Please enter a valid email address.")
    @Size(max = 150, message = "Email must be 150 characters or fewer.")
    private String email;

    @Size(max = 40, message = "Phone number must be 40 characters or fewer.")
    private String phoneNumber;

    @NotBlank(message = "Please choose your preferred contact point.")
    @Pattern(regexp = "Email|WhatsApp", message = "Please choose Email or WhatsApp for your reply.")
    @Size(max = 40, message = "Preferred contact point must be 40 characters or fewer.")
    private String preferredContactPoint;

    @Size(max = 120, message = "Package selection must be 120 characters or fewer.")
    private String packageSelection;

    @Size(max = 120, message = "Maintenance selection must be 120 characters or fewer.")
    private String maintenanceSelection;

    @Size(max = 1500, message = "Selected additions must be 1500 characters or fewer.")
    private String selectedAdditions;

    @Size(max = 1500, message = "Other additions must be 1500 characters or fewer.")
    private String otherAdditions;

    @NotBlank(message = "Please tell us what you need help with.")
    @Size(max = 2500, message = "Message must be 2500 characters or fewer.")
    private String message;

    @Size(max = 2500, message = "Extra information must be 2500 characters or fewer.")
    private String extraInformation;

    public String getIntent() { return intent; }
    public void setIntent(String intent) { this.intent = intent; }
    public String getWebsiteAddress() { return websiteAddress; }
    public void setWebsiteAddress(String websiteAddress) { this.websiteAddress = websiteAddress; }
    public String getExpectedResult() { return expectedResult; }
    public void setExpectedResult(String expectedResult) { this.expectedResult = expectedResult; }
    public String getReproductionSteps() { return reproductionSteps; }
    public void setReproductionSteps(String reproductionSteps) { this.reproductionSteps = reproductionSteps; }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getPreferredContactPoint() {
        return preferredContactPoint;
    }

    public void setPreferredContactPoint(String preferredContactPoint) {
        this.preferredContactPoint = preferredContactPoint;
    }

    public String getPackageSelection() {
        return packageSelection;
    }

    public void setPackageSelection(String packageSelection) {
        this.packageSelection = packageSelection;
    }

    public String getMaintenanceSelection() {
        return maintenanceSelection;
    }

    public void setMaintenanceSelection(String maintenanceSelection) {
        this.maintenanceSelection = maintenanceSelection;
    }

    public String getSelectedAdditions() {
        return selectedAdditions;
    }

    public void setSelectedAdditions(String selectedAdditions) {
        this.selectedAdditions = selectedAdditions;
    }

    public String getOtherAdditions() {
        return otherAdditions;
    }

    public void setOtherAdditions(String otherAdditions) {
        this.otherAdditions = otherAdditions;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getExtraInformation() {
        return extraInformation;
    }

    public void setExtraInformation(String extraInformation) {
        this.extraInformation = extraInformation;
    }
}
