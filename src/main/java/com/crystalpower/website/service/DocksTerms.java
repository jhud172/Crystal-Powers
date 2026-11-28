package com.crystalpower.website.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class DocksTerms {
    private final String content;

    public DocksTerms(@Value("${app.docks.terms-content:}") String content) {
        this.content = content.strip();
    }

    public boolean ready() {
        return content.length() >= 20 && content.length() <= 16000;
    }

    public String content() {
        return content;
    }
}
