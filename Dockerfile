FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tailwind.config.js ./
COPY src/main/frontend ./src/main/frontend
COPY src/main/resources ./src/main/resources
RUN npm run build:css

FROM eclipse-temurin:25-jdk-jammy AS app-build
WORKDIR /app
ENV SKIP_FRONTEND_BUILD=true

COPY gradlew gradlew.bat settings.gradle build.gradle ./
COPY gradle ./gradle
COPY src ./src
COPY --from=frontend-build /app/src/main/resources/static/css/style.css ./src/main/resources/static/css/style.css

RUN chmod +x ./gradlew && ./gradlew --no-daemon bootJar

FROM eclipse-temurin:25-jre-jammy AS runtime
WORKDIR /app

COPY --from=app-build /app/build/libs/*.jar /app/app.jar

EXPOSE 10000

CMD ["java", "-jar", "/app/app.jar"]
