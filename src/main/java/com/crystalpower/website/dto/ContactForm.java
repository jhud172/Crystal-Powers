package com.crystalpower.website.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ContactForm {

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
    @Size(max = 40, message = "Preferred contact point must be 40 characters or fewer.")
    private String preferredContactPoint;

    @NotBlank(message = "Please choose a package.")
    @Size(max = 120, message = "Package selection must be 120 characters or fewer.")
    private String packageSelection;

    @NotBlank(message = "Please choose a maintenance option.")
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
