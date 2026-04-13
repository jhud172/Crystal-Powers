# Crystal Production LTD Website

This repository contains a simple Spring Boot web application for **Crystal Production LTD**.  It showcases how a small web development business might present itself online, including service packages, example projects and a basic contact form.  This project was created as a starting point based on previous work and adapted specifically for Crystal Production.

## Features

* **Home Page** – introduces the company with a tagline and navigation links.
* **Services Page** – lists package options with pricing and highlights additional services like hosting and SEO.
* **Portfolio Page** – displays three example projects with images and descriptions.  These images are illustrative placeholders generated at project creation time.
* **Contact Page** – provides a simple contact form (the submit button is disabled by default) and location information.

## Running the Application

The project uses Maven to manage dependencies.  To run the application locally you need Java 17 or later and Maven installed.  Once those prerequisites are available:

```bash
mvn spring-boot:run
```

Then open a browser and navigate to `http://localhost:8080`.  You should see the Crystal Production LTD home page.

## Customization

* Update **src/main/resources/templates/services.html** to adjust packages and pricing.
* Replace the images under **src/main/resources/static/images** with your own project screenshots.  The current images are generic placeholders.
* To enable the contact form, create a POST endpoint in `ContactController` and handle form submissions accordingly.

## License

This project is provided without any specific license.  Feel free to adapt it for your own commercial or personal use.