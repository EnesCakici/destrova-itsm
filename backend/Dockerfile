FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app

COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
COPY src src

RUN chmod +x mvnw \
    && sed -i 's/<packaging>war<\/packaging>/<packaging>jar<\/packaging>/' pom.xml \
    && sed -i '/spring-boot-starter-tomcat/{n;s/<scope>provided<\/scope>//;}' pom.xml \
    && ./mvnw -q package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

RUN apk add --no-cache wget

COPY --from=build /app/target/backend-*.jar app.jar

VOLUME ["/app/uploads"]

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=10s --retries=8 --start-period=90s \
  CMD wget -qO- http://localhost:8080/actuator/health 2>/dev/null | grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["java", "-jar", "app.jar", "--spring.profiles.active=docker"]
