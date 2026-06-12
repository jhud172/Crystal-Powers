FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend ./
RUN npm run build

FROM eclipse-temurin:17-jdk-jammy AS app-build
WORKDIR /app
ENV SKIP_FRONTEND_BUILD=true

COPY gradlew gradlew.bat settings.gradle build.gradle ./
COPY gradle ./gradle
COPY src ./src
COPY --from=frontend-build /app/dist ./src/main/resources/static

RUN chmod +x ./gradlew && ./gradlew --no-daemon bootJar

FROM eclipse-temurin:17-jre-jammy AS runtime
WORKDIR /app

COPY --from=app-build /app/build/libs/*.jar /app/app.jar

EXPOSE 10000

CMD ["java", "-jar", "/app/app.jar"]
