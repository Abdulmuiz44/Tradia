# Multi-stage build for .NET MT5 API service
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY *.csproj ./
RUN dotnet restore

COPY . ./
RUN dotnet publish -c Release -o /out

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /out ./

# Railway provides PORT; bind to 0.0.0.0
ENV ASPNETCORE_URLS=http://0.0.0.0:${PORT}
ENV DOTNET_RUNNING_IN_CONTAINER=true

EXPOSE 8080 80
CMD ["dotnet", "MtApiService.dll"]
