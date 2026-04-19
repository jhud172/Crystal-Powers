package com.crystalpower.website.controller;

import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.ModelAttribute;

import java.util.Set;

@ControllerAdvice
public class ThemePreferenceAdvice {

    public static final String THEME_COOKIE_NAME = "crystal_theme";

    private static final String DEFAULT_THEME = "futuristic";

    private static final Set<String> ALLOWED_THEMES = Set.of(
            "futuristic",
            "classic",
            "clean",
            "fresh",
            "summer-vibes"
    );

    @ModelAttribute("activeTheme")
    public String activeTheme(
            @CookieValue(name = THEME_COOKIE_NAME, required = false) String themeCookie
    ) {
        if (themeCookie == null || themeCookie.isBlank()) {
            return DEFAULT_THEME;
        }

        return ALLOWED_THEMES.contains(themeCookie) ? themeCookie : DEFAULT_THEME;
    }
}
