# Crystal Production Website

This repository currently serves a premium multi-page Crystal Production marketing site on Spring Boot and Thymeleaf. The site presents Crystal Production as a digital build studio focused on websites, community systems, automation, creative support, and structured delivery.

## Current Site Structure

- `src/main/resources/templates/base.html`
  Shared Thymeleaf layout shell with the global head, navigation, footer, stylesheet import, and shared script import.
- `src/main/resources/templates/<page>/index.html`
  Page entry templates for `homepage`, `about`, `services`, `products`, `portfolio`, `support`, and `contact`.
- `src/main/resources/templates/<page>/fragments/sections.html`
  Page-specific content fragments and page-specific script imports where needed.
- `src/main/resources/static/js/site.js`
  Shared navigation behaviour.
- `src/main/resources/static/js/products.js`
  Product dialog behaviour for the products page only.
- `src/main/frontend/styles/tailwind.css`
  Tailwind source stylesheet.
- `src/main/resources/static/css/style.css`
  Generated production stylesheet built from Tailwind.

## Routing

The live routes are:

- `/`
- `/about`
- `/services`
- `/products`
- `/portfolio`
- `/support`
- `/contact`

Legacy flat-file routes such as `/home.html`, `/about.html`, and `/products.html` now redirect to the new controller-backed routes.

## Frontend Build

Tailwind is compiled through npm.

Install dependencies:

```powershell
npm install
```

Build the stylesheet:

```powershell
npm run build:css
```

Watch the stylesheet during frontend work:

```powershell
npm run watch:css
```

## Run The Application

The Gradle wrapper is configured and the CSS build is wired into the Spring resource pipeline.

Run tests:

```powershell
.\gradlew.bat test
```

Run the app:

```powershell
.\gradlew.bat bootRun
```

Then open:

- `http://localhost:8080/`

## Contact Flow

The contact page now posts through Spring MVC with validation. Successful submission redirects back to `/contact` with a confirmation message, and invalid input stays on the page with field-level errors.

## Notes

- HTML files contain markup only.
- CSS is kept in dedicated stylesheet sources and generated output.
- JavaScript is kept in dedicated files under `src/main/resources/static/js`.
- The current visual direction is a premium dark editorial style with restrained neon accents and image-led sections.
