package com.crystalproduction.website;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the Crystal Production LTD website.  This class
 * bootstraps the Spring Boot application and launches the embedded
 * web server.  Running this application will serve the site on
 * http://localhost:8080 by default.
 */
@SpringBootApplication
public class CrystalProductionApplication {

    public static void main(String[] args) {
        SpringApplication.run(CrystalProductionApplication.class, args);
    }
}