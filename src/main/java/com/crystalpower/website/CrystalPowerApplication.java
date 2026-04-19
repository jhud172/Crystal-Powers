package com.crystalpower.website;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the Crystal Power LTD website. This class
 * bootstraps the Spring Boot application and launches the embedded
 * web server. Running this application will serve the site on
 * http://localhost:8080 by default.
 */
@SpringBootApplication
public class CrystalPowerApplication {

    public static void main(String[] args) {
        SpringApplication.run(CrystalPowerApplication.class, args);
    }
}