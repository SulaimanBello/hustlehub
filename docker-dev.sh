#!/bin/bash
# Development Docker Helper Script for HustleHub

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}HustleHub Development Environment${NC}"
echo -e "${GREEN}========================================${NC}"

# Function to start development environment
start() {
    echo -e "\n${YELLOW}Starting development environment...${NC}"
    docker-compose -f docker-compose.dev.yml up --build
}

# Function to start in detached mode
start_detached() {
    echo -e "\n${YELLOW}Starting development environment (detached)...${NC}"
    docker-compose -f docker-compose.dev.yml up -d --build
    echo -e "${GREEN}✓ Services started${NC}"
    echo -e "\nView logs with: ${YELLOW}./docker-dev.sh logs${NC}"
}

# Function to stop development environment
stop() {
    echo -e "\n${YELLOW}Stopping development environment...${NC}"
    docker-compose -f docker-compose.dev.yml down
    echo -e "${GREEN}✓ Services stopped${NC}"
}

# Function to restart development environment
restart() {
    echo -e "\n${YELLOW}Restarting development environment...${NC}"
    docker-compose -f docker-compose.dev.yml restart
    echo -e "${GREEN}✓ Services restarted${NC}"
}

# Function to view logs
logs() {
    if [ -z "$2" ]; then
        docker-compose -f docker-compose.dev.yml logs -f
    else
        docker-compose -f docker-compose.dev.yml logs -f "$2"
    fi
}

# Function to run migrations
migrate() {
    echo -e "\n${YELLOW}Running database migrations...${NC}"
    docker-compose -f docker-compose.dev.yml exec backend npm run migrate
    echo -e "${GREEN}✓ Migrations completed${NC}"
}

# Function to access database
db_shell() {
    echo -e "\n${YELLOW}Connecting to PostgreSQL...${NC}"
    docker-compose -f docker-compose.dev.yml exec db psql -U hustlehub -d hustlehub_dev
}

# Function to show service status
status() {
    echo -e "\n${YELLOW}Service status:${NC}"
    docker-compose -f docker-compose.dev.yml ps
}

# Function to clean up volumes
clean() {
    echo -e "\n${RED}WARNING: This will remove all volumes and data!${NC}"
    read -p "Are you sure? (yes/no): " -r
    if [[ $REPLY == "yes" ]]; then
        echo -e "${YELLOW}Cleaning up...${NC}"
        docker-compose -f docker-compose.dev.yml down -v
        echo -e "${GREEN}✓ Cleanup completed${NC}"
    else
        echo -e "${YELLOW}Cleanup cancelled${NC}"
    fi
}

# Function to rebuild without cache
rebuild() {
    echo -e "\n${YELLOW}Rebuilding images without cache...${NC}"
    docker-compose -f docker-compose.dev.yml build --no-cache
    echo -e "${GREEN}✓ Rebuild completed${NC}"
}

# Main script logic
case "${1:-start}" in
    start)
        start
        ;;
    start-detached|up)
        start_detached
        ;;
    stop|down)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs "$@"
        ;;
    migrate)
        migrate
        ;;
    db|psql)
        db_shell
        ;;
    status|ps)
        status
        ;;
    clean)
        clean
        ;;
    rebuild)
        rebuild
        ;;
    *)
        echo -e "\n${YELLOW}Usage:${NC} ./docker-dev.sh [command]"
        echo -e "\n${YELLOW}Commands:${NC}"
        echo "  start              Start services (default)"
        echo "  start-detached     Start services in background"
        echo "  stop               Stop all services"
        echo "  restart            Restart all services"
        echo "  logs [service]     View logs (optionally for specific service)"
        echo "  migrate            Run database migrations"
        echo "  db                 Access PostgreSQL shell"
        echo "  status             Show service status"
        echo "  clean              Remove all volumes and data"
        echo "  rebuild            Rebuild images without cache"
        echo ""
        exit 1
        ;;
esac
