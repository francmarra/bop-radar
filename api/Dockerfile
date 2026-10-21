FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY Directory.Build.props ./
COPY src/ src/
RUN dotnet publish src/BopRadar.Api/BopRadar.Api.csproj -c Release -o /out

FROM mcr.microsoft.com/dotnet/aspnet:9.0
# curl for the compose healthcheck (the base image has none)
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /out .
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
USER app
ENTRYPOINT ["sh", "-c", "dotnet BopRadar.Api.dll import /data && exec dotnet BopRadar.Api.dll"]
