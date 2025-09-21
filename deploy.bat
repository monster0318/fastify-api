@echo off
REM Simplified Docker deployment script for Capital Marketplace Backend (Windows)
REM This script handles building, deploying, and managing the application with SQLite

setlocal enabledelayedexpansion

REM Configuration
set COMPOSE_FILE=docker-compose.yml
set ENV_FILE=.env

REM Functions
:log_info
echo [INFO] %~1
goto :eof

:log_warn
echo [WARN] %~1
goto :eof

:log_error
echo [ERROR] %~1
goto :eof

:check_requirements
call :log_info "Checking requirements..."

docker --version >nul 2>&1
if errorlevel 1 (
    call :log_error "Docker is not installed. Please install Docker Desktop first."
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    call :log_error "Docker Compose is not installed. Please install Docker Desktop first."
    exit /b 1
)

if not exist "%ENV_FILE%" (
    call :log_warn "Environment file %ENV_FILE% not found. Creating from example..."
    if exist "docker.env.example" (
        copy docker.env.example "%ENV_FILE%" >nul
        call :log_warn "Please update %ENV_FILE% with your production values before continuing."
        exit /b 1
    ) else (
        call :log_error "No environment file found. Please create %ENV_FILE%"
        exit /b 1
    )
)

call :log_info "Requirements check passed!"
goto :eof

:build_images
call :log_info "Building Docker image..."
docker-compose -f "%COMPOSE_FILE%" build --no-cache
if errorlevel 1 (
    call :log_error "Failed to build image"
    exit /b 1
)
call :log_info "Image built successfully!"
goto :eof

:start_services
call :log_info "Starting services..."
docker-compose -f "%COMPOSE_FILE%" up -d
if errorlevel 1 (
    call :log_error "Failed to start services"
    exit /b 1
)
call :log_info "Services started!"
goto :eof

:stop_services
call :log_info "Stopping services..."
docker-compose -f "%COMPOSE_FILE%" down
call :log_info "Services stopped!"
goto :eof

:restart_services
call :log_info "Restarting services..."
docker-compose -f "%COMPOSE_FILE%" restart
call :log_info "Services restarted!"
goto :eof

:run_migrations
call :log_info "Running database migrations..."
docker-compose -f "%COMPOSE_FILE%" exec api npx prisma migrate deploy
if errorlevel 1 (
    call :log_error "Failed to run migrations"
    exit /b 1
)
call :log_info "Migrations completed!"
goto :eof

:seed_database
call :log_info "Seeding database..."
docker-compose -f "%COMPOSE_FILE%" exec api npx prisma db seed
if errorlevel 1 (
    call :log_error "Failed to seed database"
    exit /b 1
)
call :log_info "Database seeded!"
goto :eof

:show_logs
call :log_info "Showing logs..."
docker-compose -f "%COMPOSE_FILE%" logs -f
goto :eof

:show_status
call :log_info "Service status:"
docker-compose -f "%COMPOSE_FILE%" ps
goto :eof

:backup_database
call :log_info "Creating database backup..."
for /f "tokens=1-6 delims=: " %%a in ("%time%") do set timestamp=%%a%%b%%c
set BACKUP_FILE=backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_!timestamp!.db
docker-compose -f "%COMPOSE_FILE%" exec api cp /app/data/prod.db "/app/uploads/%BACKUP_FILE%"
docker cp $(docker-compose -f "%COMPOSE_FILE%" ps -q api):/app/uploads/"%BACKUP_FILE%" .
call :log_info "Database backup created: %BACKUP_FILE%"
goto :eof

:cleanup
call :log_info "Cleaning up unused Docker resources..."
docker system prune -f
docker volume prune -f
call :log_info "Cleanup completed!"
goto :eof

REM Main script logic
if "%1"=="build" (
    call :check_requirements
    call :build_images
) else if "%1"=="start" (
    call :check_requirements
    call :start_services
    call :run_migrations
) else if "%1"=="stop" (
    call :stop_services
) else if "%1"=="restart" (
    call :restart_services
) else if "%1"=="deploy" (
    call :check_requirements
    call :build_images
    call :stop_services
    call :start_services
    call :run_migrations
    call :seed_database
    call :log_info "Deployment completed successfully!"
) else if "%1"=="migrate" (
    call :run_migrations
) else if "%1"=="seed" (
    call :seed_database
) else if "%1"=="logs" (
    call :show_logs
) else if "%1"=="status" (
    call :show_status
) else if "%1"=="backup" (
    call :backup_database
) else if "%1"=="cleanup" (
    call :cleanup
) else (
    echo Capital Marketplace Backend - Simplified Docker Deployment Script ^(Windows^)
    echo.
    echo Usage: %0 [command]
    echo.
    echo Commands:
    echo   build     - Build Docker image
    echo   start     - Start the service
    echo   stop      - Stop the service
    echo   restart   - Restart the service
    echo   deploy    - Full deployment ^(build, start, migrate, seed^)
    echo   migrate   - Run database migrations
    echo   seed      - Seed the database
    echo   logs      - Show service logs
    echo   status    - Show service status
    echo   backup    - Create database backup
    echo   cleanup   - Clean up unused Docker resources
    echo   help      - Show this help message
    echo.
    echo Examples:
    echo   %0 deploy    # Full deployment
    echo   %0 logs      # View logs
    echo   %0 status    # Check service status
)

endlocal