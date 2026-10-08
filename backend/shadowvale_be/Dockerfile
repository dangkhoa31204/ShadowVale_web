# Render has no native .NET runtime, so the API ships as a container (build context: backend/shadowvale_be)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first so the package layer is cached when only source files change
COPY ShadowVale.API/ShadowVale.API.csproj ShadowVale.API/
COPY ShadowVale.BLL/ShadowVale.BLL.csproj ShadowVale.BLL/
COPY ShadowVale.DAL/ShadowVale.DAL.csproj ShadowVale.DAL/
COPY ShadowVale.Contracts/ShadowVale.Contracts.csproj ShadowVale.Contracts/
RUN dotnet restore ShadowVale.API/ShadowVale.API.csproj

COPY . .
RUN dotnet publish ShadowVale.API/ShadowVale.API.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .

# Render routes traffic to the port in $PORT; set PORT=8080 on the service to match
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

# Non-root user that ships with the official .NET images
USER $APP_UID
ENTRYPOINT ["dotnet", "ShadowVale.API.dll"]
