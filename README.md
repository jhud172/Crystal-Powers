# Crystal Production Website

This repository currently serves a premium multi-page Crystal Production marketing site on Spring Boot and Thymeleaf. The site presents Crystal Production as a digital build studio focused on websites, community systems, automation, creative support, and structured delivery.

## Current Site Structure

- `src/main/resources/templates/base.html`
  Thin Thymeleaf layout entry point that delegates shared page chrome to dedicated fragments.
- `src/main/resources/templates/shared/fragments/`
  Shared document head, page shell, header, footer, and shared script fragments.
- `src/main/resources/templates/<page>/index.html`
  Page entry templates for `homepage`, `about`, `services`, `portfolio`, `support`, and `contact`.
- `src/main/resources/templates/<page>/fragments/sections.html`
  Page-specific content fragments and page-specific script imports where needed.
- `src/main/java/com/crystalproduction/website/controller/ThemePreferenceAdvice.java`
  Shared cookie-backed theme preference model for all pages.
- `src/main/frontend/styles/global/global.css`
  Tailwind source for shared layout, utilities, and theme-aware component rules.
- `src/main/resources/static/css/themes/<theme>/theme.css`
  Theme-specific design tokens and overrides for `futuristic`, `classic`, `clean`, `fresh`, and `summer-vibes`.
- `src/main/resources/static/css/global/global.css`
  Generated global stylesheet built from Tailwind.
- `src/main/resources/static/js/site.js`
  Shared navigation and theme-switching behaviour with cookie persistence.
- `src/main/resources/static/js/home-background.js`
  Theme-aware animated homepage background renderer.
- `src/main/resources/static/favicon.svg`
  Shared favicon served across every page through the shared head fragment.
- `src/main/resources/static/site.webmanifest`
  Shared manifest metadata for icon and theme setup.

## Routing

The live routes are:

- `/`
- `/about`
- `/services`
- `/portfolio`
- `/support`
- `/contact`

Legacy flat-file routes such as `/home.html`, `/about.html`, and `/portfolio.html` now redirect to the new controller-backed routes.

## Frontend Build

Tailwind is compiled through npm.

Install dependencies:

```powershell
npm install
```

Build the global stylesheet:

```powershell
npm run build:css
```

Watch the global stylesheet during frontend work:

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
- CSS is split into global layout styles plus dedicated theme folders.
- JavaScript is kept in dedicated files under `src/main/resources/static/js`.
- Theme selection is cookie-backed so the chosen design follows the user across pages.
