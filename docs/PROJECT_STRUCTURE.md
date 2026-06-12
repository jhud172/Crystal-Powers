# Crystal Powers Project Structure

This document explains how the repository is organised, how the frontend and backend connect, and which files control the main parts of the website.

## High-Level Architecture

Crystal Powers is now split into two clear parts:

```text
frontend/  React, Vite, TypeScript, Tailwind, public website UI
src/       Spring Boot backend, API endpoints, email handling, SPA hosting
docs/      Project documentation and notes
```

React controls the public website experience. Spring Boot controls backend behaviour, form handling, upload validation, email delivery, and production hosting.

In local development, Vite runs the frontend on `http://localhost:5173` and proxies `/api` calls to Spring on `http://localhost:8080`.

In production, Gradle builds the React app, copies `frontend/dist` into Spring Boot static resources, and Spring serves the built React app.

## Top-Level Files And Folders

```text
Crystal-Production/
├── frontend/              React frontend source and Vite build config
├── src/                   Spring Boot backend source
├── docs/                  Project documentation and planning notes
├── gradle/                Gradle wrapper files
├── build.gradle           Spring Boot build and frontend build integration
├── build.ps1              One-command local build script
├── Dockerfile             Production container build
├── render.yaml            Render deployment configuration
├── README.md              Main developer setup guide
├── .env.example           Safe example environment variables
├── .gitignore             Ignored generated/local files
└── settings.gradle        Gradle project settings
```

Generated folders such as `build/`, `target/`, `.gradle/`, `frontend/dist/`, and `frontend/node_modules/` are build output or installed dependencies. They should not be treated as source code.

## Frontend Structure

```text
frontend/
├── public/
│   ├── images/            Public image assets used by React
│   ├── favicon.svg
│   └── site.webmanifest
├── src/
│   ├── app/               App shell, layout, shared page frame
│   ├── components/        Reusable visual components
│   ├── data/              Shared site data such as nav items and themes
│   ├── features/          Feature-specific data, helpers, and UI pieces
│   ├── routes/            Page components mapped to URLs
│   ├── styles/            Global, component, page, and theme CSS
│   └── main.tsx           React entry point
├── index.html             Vite HTML shell
├── package.json           Frontend scripts and dependencies
├── tailwind.config.ts     Tailwind configuration
├── vite.config.ts         Vite config and API proxy
└── tsconfig*.json         TypeScript configuration
```

## Frontend Control Flow

The frontend starts here:

```text
frontend/src/main.tsx
```

`main.tsx` mounts React into `frontend/index.html`, wraps the app in `BrowserRouter`, and imports the main CSS bundle.

The app routes are controlled here:

```text
frontend/src/app/App.tsx
```

`App.tsx` maps public URLs to route components:

```text
/                   routes/Home.tsx
/about              routes/About.tsx
/services           routes/Services.tsx
/portfolio          routes/Portfolio.tsx
/portfolio/:slug    routes/PortfolioProject.tsx
/support            routes/Support.tsx
/contact            routes/Contact.tsx
*                   routes/NotFound.tsx
```

The shared page shell is controlled here:

```text
frontend/src/app/Layout.tsx
```

`Layout.tsx` owns:

- the global background layers
- the premium UFO navbar
- the theme picker
- mobile menu state
- the footer
- the main content slot where route pages render

If the navbar, footer, theme picker, or shared page frame needs to change, start with `Layout.tsx` and the matching component CSS.

## Frontend Data Ownership

Shared site data lives here:

```text
frontend/src/data/site.ts
```

This controls:

- navbar links
- footer navigation links
- available theme names
- default theme
- theme ID validation

Portfolio content lives here:

```text
frontend/src/features/portfolio/portfolio.ts
```

This controls:

- portfolio listing cards
- project detail page data
- project slugs
- project images

Services package data lives here:

```text
frontend/src/features/services/services.ts
```

This controls:

- service package options
- add-on options
- maintenance options
- prices and package descriptions

Reusable form field helpers live here:

```text
frontend/src/features/contact/FormFields.tsx
```

## Styling And Design Ownership

The main CSS import file is:

```text
frontend/src/styles/index.css
```

It imports the base CSS and all theme CSS files.

The global base design system is here:

```text
frontend/src/styles/base/global.css
```

This controls broad site foundations such as:

- CSS variables
- body styling
- background layers
- shared buttons
- shared form controls
- broad layout utilities

Component-specific CSS lives here:

```text
frontend/src/styles/components/
```

Current key files:

```text
navbar.css    Navbar, UFO glass panel, mobile menu, theme picker
footer.css    Footer styling and footer transitions
```

Page-specific CSS lives here:

```text
frontend/src/styles/pages/
```

Each file controls one public page area:

```text
about.css
contact.css
home.css
portfolio.css
public-scenes.css
services.css
support.css
```

Theme-specific CSS lives here:

```text
frontend/src/styles/themes/
```

Each folder contains a `theme.css` file:

```text
futuristic/theme.css
classic/theme.css
clean/theme.css
fresh/theme.css
summer-vibes/theme.css
```

The selected theme is stored in the `crystal_theme` cookie. `Layout.tsx` reads and writes that cookie, then applies the active theme through `document.body.dataset.theme`.

## What Designs What

Use this map when changing visuals:

```text
Navbar and mobile menu
  frontend/src/app/Layout.tsx
  frontend/src/styles/components/navbar.css

Footer
  frontend/src/app/Layout.tsx
  frontend/src/styles/components/footer.css

Homepage
  frontend/src/routes/Home.tsx
  frontend/src/styles/pages/home.css

About page
  frontend/src/routes/About.tsx
  frontend/src/styles/pages/about.css

Services page
  frontend/src/routes/Services.tsx
  frontend/src/features/services/services.ts
  frontend/src/styles/pages/services.css

Portfolio listing
  frontend/src/routes/Portfolio.tsx
  frontend/src/features/portfolio/portfolio.ts
  frontend/src/styles/pages/portfolio.css

Portfolio project detail
  frontend/src/routes/PortfolioProject.tsx
  frontend/src/features/portfolio/portfolio.ts
  frontend/src/styles/pages/portfolio.css

Support page
  frontend/src/routes/Support.tsx
  frontend/src/styles/pages/support.css

Contact page
  frontend/src/routes/Contact.tsx
  frontend/src/features/contact/FormFields.tsx
  frontend/src/styles/pages/contact.css

Global buttons, backgrounds, forms, typography foundations
  frontend/src/styles/base/global.css

Theme colours and theme personality
  frontend/src/styles/themes/*/theme.css
```

## Backend Structure

```text
src/main/java/com/crystalpower/website/
├── CrystalPowerApplication.java      Spring Boot entry point
├── api/
│   └── ApiInquiryController.java     JSON API endpoints for forms
├── dto/
│   └── ContactForm.java              Form validation model
├── service/
│   ├── InquiryEmailService.java      Email creation and delivery
│   └── UploadValidationService.java  Services upload validation
└── web/
    ├── SpaController.java            Public route forwarding to React
    └── LegacyRouteController.java    Old .html route redirects
```

Backend resources live here:

```text
src/main/resources/
├── application.properties
└── META-INF/
```

Tests live here:

```text
src/test/
```

## Backend Control Flow

Spring starts from:

```text
src/main/java/com/crystalpower/website/CrystalPowerApplication.java
```

Public page requests are handled by:

```text
src/main/java/com/crystalpower/website/web/SpaController.java
```

This forwards public routes to `index.html` so React Router can render the correct page.

Legacy `.html` URLs are handled by:

```text
src/main/java/com/crystalpower/website/web/LegacyRouteController.java
```

This redirects old routes such as `/about.html` to the new React route `/about`.

Form API requests are handled by:

```text
src/main/java/com/crystalpower/website/api/ApiInquiryController.java
```

Current API endpoints:

```text
POST /api/contact
POST /api/services
```

Form validation rules are defined in:

```text
src/main/java/com/crystalpower/website/dto/ContactForm.java
```

Services reference file validation is controlled by:

```text
src/main/java/com/crystalpower/website/service/UploadValidationService.java
```

Email sending is controlled by:

```text
src/main/java/com/crystalpower/website/service/InquiryEmailService.java
```

## Frontend To Backend Connection

In development:

```text
React/Vite:  http://localhost:5173
Spring API:  http://localhost:8080
```

The Vite proxy is configured here:

```text
frontend/vite.config.ts
```

Requests from React to `/api/contact` and `/api/services` are forwarded to Spring.

In production:

```text
Browser -> Spring Boot -> built React app from frontend/dist
Browser -> Spring Boot -> /api endpoints
```

Spring serves the React app and also handles API requests from the same origin.

## Form Flow

Contact form:

```text
Contact.tsx
  -> fetch POST /api/contact
  -> ApiInquiryController.submitContact()
  -> ContactForm validation
  -> InquiryEmailService
  -> JSON response
  -> React success/error state
```

Services quote form:

```text
Services.tsx
  -> fetch POST /api/services using multipart/form-data
  -> ApiInquiryController.submitServicesQuote()
  -> ContactForm validation
  -> UploadValidationService
  -> InquiryEmailService
  -> JSON response
  -> React success/error state
```

The services upload rules are backend-owned:

- maximum 5 files
- maximum 15MB total
- image/video files only

## Build And Deployment Flow

Frontend-only build:

```powershell
cd frontend
npm run build
```

Backend tests:

```powershell
.\gradlew.bat test
```

Full production package:

```powershell
.\gradlew.bat bootJar
```

One-command project build:

```powershell
powershell -ExecutionPolicy Bypass -File .\build.ps1
```

Gradle frontend integration is controlled by:

```text
build.gradle
```

The important flow is:

```text
installFrontend
  -> npm ci inside frontend/

buildFrontend
  -> npm run build inside frontend/

processResources
  -> copies frontend/dist into Spring Boot static resources

bootJar
  -> packages Spring Boot app with built React frontend
```

Docker production build is controlled by:

```text
Dockerfile
```

Render deployment settings are controlled by:

```text
render.yaml
```

## Environment Configuration

Safe example environment variables live in:

```text
.env.example
```

Local private values should live in `.env`, which is ignored by Git.

Mail-related values are used by Spring Boot and `InquiryEmailService`.

Do not hardcode secrets in Java, React, CSS, documentation, or deployment files.

## Common Edit Guide

To add a new public page:

1. Add a route component in `frontend/src/routes/`.
2. Add the route in `frontend/src/app/App.tsx`.
3. Add a nav item in `frontend/src/data/site.ts` if it should appear in navigation.
4. Add page CSS in `frontend/src/styles/pages/` if needed.
5. Add the matching SPA route in `SpaController.java` for production refresh support.

To add a new portfolio project:

1. Add the project object in `frontend/src/features/portfolio/portfolio.ts`.
2. Add the image to `frontend/public/images/`.
3. Use a stable `slug` because it becomes the public URL.

To change the navbar:

1. Edit structure and React state in `frontend/src/app/Layout.tsx`.
2. Edit visual styling in `frontend/src/styles/components/navbar.css`.
3. Keep accessibility attributes such as `aria-expanded` and `aria-controls`.
4. Test desktop, tablet, and mobile widths.

To change site themes:

1. Update theme metadata in `frontend/src/data/site.ts`.
2. Update or add theme CSS under `frontend/src/styles/themes/`.
3. Ensure `frontend/src/styles/index.css` imports the theme file.

To change form validation:

1. Update frontend form display in `Contact.tsx` or `Services.tsx`.
2. Update backend validation in `ContactForm.java`.
3. Update upload rules in `UploadValidationService.java` if file validation changes.
4. Add or update backend tests.

## Ownership Rules

React owns:

- page rendering
- visual layout
- route components
- theme picker UI
- mobile navigation state
- form UI state
- portfolio and services display data

Spring Boot owns:

- API endpoints
- validation rules
- upload validation
- email delivery
- legacy redirects
- production SPA fallback
- production packaging host

CSS owns:

- visual design
- responsive layout
- animations
- hover states
- focus states
- theme presentation

Build config owns:

- dependency installation
- frontend production build
- copying React output into Spring
- Docker and Render deployment behaviour

## Cleanliness Rules

Keep the repo easy to understand by following these rules:

- Do not add a second frontend system outside `frontend/`.
- Do not reintroduce Thymeleaf templates for public pages.
- Do not put public website CSS under Spring static source folders.
- Do not commit generated build output.
- Do not hardcode secrets.
- Keep route data, page content, styling, and backend API logic in their correct folders.
- Prefer editing the existing owner file instead of creating duplicate logic elsewhere.
