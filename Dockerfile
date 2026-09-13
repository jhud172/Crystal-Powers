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
RUN groupadd --system crystal && useradd --system --gid crystal --home /app crystal

COPY --from=app-build /app/build/libs/*.jar /app/app.jar
USER crystal
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=60.0 -XX:+ExitOnOutOfMemoryError -Djava.awt.headless=true"

EXPOSE 10000

CMD ["java", "-jar", "/app/app.jar"]
