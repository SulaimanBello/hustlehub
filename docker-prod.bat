@echo off
REM Production Docker Helper Script for HustleHub (Windows)

echo ========================================
echo HustleHub Production Environment
echo ========================================

REM Check if .env file exists
if not exist .env (
    echo ERROR: .env file not found!
    echo Copy .env.example to .env and fill in your values:
    echo   copy .env.example .env
    exit /b 1
)

if "%1"=="" goto help
if "%1"=="start" goto start
if "%1"=="up" goto start
if "%1"=="stop" goto stop
if "%1"=="down" goto stop
if "%1"=="restart" goto restart
if "%1"=="logs" goto logs
if "%1"=="migrate" goto migrate
if "%1"=="status" goto status
if "%1"=="ps" goto status
if "%1"=="build" goto build
if "%1"=="backup" goto backup
goto help

:start
echo.
echo Starting production environment...
docker-compose up -d --build
echo Services started successfully
call :status
goto end

:stop
echo.
echo Stopping production environment...
docker-compose down
echo Services stopped successfully
goto end

:restart
echo.
echo Restarting production environment...
docker-compose restart
echo Services restarted successfully
goto end

:logs
if "%2"=="" (
    docker-compose logs -f
) else (
    docker-compose logs -f %2
)
goto end

:migrate
echo.
echo Running database migrations...
docker-compose exec backend npm run migrate
echo Migrations completed successfully
goto end

:status
echo.
echo Service status:
docker-compose ps
goto end

:build
echo.
echo Building production images...
docker-compose build
echo Build completed successfully
goto end

:backup
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set BACKUP_FILE=backup_%mydate%_%mytime%.sql
echo.
echo Creating database backup: %BACKUP_FILE%
docker-compose exec -T db pg_dump -U hustlehub hustlehub > %BACKUP_FILE%
echo Backup saved to %BACKUP_FILE%
goto end

:help
echo.
echo Usage: docker-prod.bat [command]
echo.
echo Commands:
echo   start              Start services
echo   stop               Stop all services
echo   restart            Restart all services
echo   logs [service]     View logs (optionally for specific service)
echo   migrate            Run database migrations
echo   status             Show service status
echo   build              Build production images
echo   backup             Backup database
echo.
goto end

:end
