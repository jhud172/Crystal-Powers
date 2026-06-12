# Crystal Powers Website

Crystal Powers is a React frontend with a Spring Boot backend API. React is the only public UI source; Spring Boot serves the production build and handles enquiry validation, uploads, and email delivery.

## Folder Structure

- `frontend/` - Vite, React, TypeScript, and Tailwind public website.
- `frontend/src/app/` - app shell, routing composition, layout, navigation, theme picker, and footer.
- `frontend/src/routes/` - route-level pages for the public website.
- `frontend/src/features/` - feature-owned data and form helpers for contact, services, and portfolio.
- `frontend/src/styles/` - active CSS source split into base, components, pages, and themes.
- `frontend/public/` - public images, favicon, and manifest used by the React app.
- `src/main/java/com/crystalpower/website/api/` - JSON API controllers.
- `src/main/java/com/crystalpower/website/web/` - SPA forwarding and legacy redirect controllers.
- `src/main/java/com/crystalpower/website/service/` - backend services for email delivery and upload validation.
- `docs/` - project notes and status documentation.

## Routes

React owns these public routes:

- `/`
- `/about`
- `/services`
- `/portfolio`
- `/portfolio/:slug`
- `/support`
- `/contact`

Legacy flat-file routes such as `/home.html`, `/about.html`, and `/portfolio.html` redirect to the matching React route.

## Frontend Development

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173/`. Vite proxies `/api` requests to Spring Boot on `http://localhost:8080`.

Build the frontend:

```powershell
cd frontend
npm run build
```

## Backend Development

Run Spring Boot from the repository root:

```powershell
.\gradlew.bat bootRun
```

Open `http://localhost:8080/`.

## API Endpoints

- `POST /api/contact` - structured contact enquiry.
- `POST /api/services` - services quote request with optional image/video uploads.

Both endpoints return JSON:

```json
{
  "success": false,
  "message": "Please check the highlighted fields and try again.",
  "fieldErrors": {}
}
```

## Environment Variables

Copy `.env.example` for local reference and configure equivalent variables in deployment:

- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `APP_MAIL_TO`
- `APP_MAIL_FROM`

Never commit real credentials.

## Build And Test

Run the full local build pipeline from the project root:

```powershell
.\build.ps1
```

This installs frontend dependencies, builds the React app, runs backend tests, and packages the Spring Boot jar.

Useful options:

```powershell
.\build.ps1 -SkipTests
.\build.ps1 -RunAfterBuild
.\build.ps1 -RunAfterBuild -Port 8081
```

Gradle builds `frontend/dist` and packages it into the Spring Boot jar.

## Deployment

The Dockerfile builds the frontend in a Node stage, copies `frontend/dist` into the Spring static resources, then packages and runs the Spring Boot jar.
