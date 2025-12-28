@echo off
REM Development Docker Helper Script for HustleHub (Windows)

echo ========================================
echo HustleHub Development Environment
echo ========================================

if "%1"=="" goto start
if "%1"=="start" goto start
if "%1"=="start-detached" goto start_detached
if "%1"=="up" goto start_detached
if "%1"=="stop" goto stop
if "%1"=="down" goto stop
if "%1"=="restart" goto restart
if "%1"=="logs" goto logs
if "%1"=="migrate" goto migrate
if "%1"=="db" goto db_shell
if "%1"=="psql" goto db_shell
if "%1"=="status" goto status
if "%1"=="ps" goto status
if "%1"=="clean" goto clean
if "%1"=="rebuild" goto rebuild
goto help

:start
echo.
echo Starting development environment...
docker-compose -f docker-compose.dev.yml up --build
goto end

:start_detached
echo.
echo Starting development environment (detached)...
docker-compose -f docker-compose.dev.yml up -d --build
echo Services started successfully
echo View logs with: docker-dev.bat logs
goto end

:stop
echo.
echo Stopping development environment...
docker-compose -f docker-compose.dev.yml down
echo Services stopped successfully
goto end

:restart
echo.
echo Restarting development environment...
docker-compose -f docker-compose.dev.yml restart
echo Services restarted successfully
goto end

:logs
if "%2"=="" (
    docker-compose -f docker-compose.dev.yml logs -f
) else (
    docker-compose -f docker-compose.dev.yml logs -f %2
)
goto end

:migrate
echo.
echo Running database migrations...
docker-compose -f docker-compose.dev.yml exec backend npm run migrate
echo Migrations completed successfully
goto end

:db_shell
echo.
echo Connecting to PostgreSQL...
docker-compose -f docker-compose.dev.yml exec db psql -U hustlehub -d hustlehub_dev
goto end

:status
echo.
echo Service status:
docker-compose -f docker-compose.dev.yml ps
goto end

:clean
echo.
echo WARNING: This will remove all volumes and data!
set /p CONFIRM="Are you sure? (yes/no): "
if /i "%CONFIRM%"=="yes" (
    echo Cleaning up...
    docker-compose -f docker-compose.dev.yml down -v
    echo Cleanup completed successfully
) else (
    echo Cleanup cancelled
)
goto end

:rebuild
echo.
echo Rebuilding images without cache...
docker-compose -f docker-compose.dev.yml build --no-cache
echo Rebuild completed successfully
goto end

:help
echo.
echo Usage: docker-dev.bat [command]
echo.
echo Commands:
echo   start              Start services (default)
echo   start-detached     Start services in background
echo   stop               Stop all services
echo   restart            Restart all services
echo   logs [service]     View logs (optionally for specific service)
echo   migrate            Run database migrations
echo   db                 Access PostgreSQL shell
echo   status             Show service status
echo   clean              Remove all volumes and data
echo   rebuild            Rebuild images without cache
echo.
goto end

:end
