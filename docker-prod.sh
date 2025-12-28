#!/bin/bash
# Production Docker Helper Script for HustleHub

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}HustleHub Production Environment${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}ERROR: .env file not found!${NC}"
    echo -e "${YELLOW}Copy .env.example to .env and fill in your values:${NC}"
    echo -e "  cp .env.example .env"
    exit 1
fi

# Function to start production environment
start() {
    echo -e "\n${YELLOW}Starting production environment...${NC}"
    docker-compose up -d --build
    echo -e "${GREEN}✓ Services started${NC}"
    status
}

# Function to stop production environment
stop() {
    echo -e "\n${YELLOW}Stopping production environment...${NC}"
    docker-compose down
    echo -e "${GREEN}✓ Services stopped${NC}"
}

# Function to restart production environment
restart() {
    echo -e "\n${YELLOW}Restarting production environment...${NC}"
    docker-compose restart
    echo -e "${GREEN}✓ Services restarted${NC}"
}

# Function to view logs
logs() {
    if [ -z "$2" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f "$2"
    fi
}

# Function to run migrations
migrate() {
    echo -e "\n${YELLOW}Running database migrations...${NC}"
    docker-compose exec backend npm run migrate
    echo -e "${GREEN}✓ Migrations completed${NC}"
}

# Function to show service status
status() {
    echo -e "\n${YELLOW}Service status:${NC}"
    docker-compose ps
    echo -e "\n${YELLOW}Service health:${NC}"
    docker-compose ps --filter "health=healthy"
}

# Function to build images
build() {
    echo -e "\n${YELLOW}Building production images...${NC}"
    docker-compose build
    echo -e "${GREEN}✓ Build completed${NC}"
}

# Function to scale services
scale() {
    if [ -z "$2" ]; then
        echo -e "${RED}ERROR: Please specify service and number of replicas${NC}"
        echo -e "Usage: ./docker-prod.sh scale backend 3"
        exit 1
    fi
    echo -e "\n${YELLOW}Scaling $2 to $3 replicas...${NC}"
    docker-compose up -d --scale "$2=$3"
    echo -e "${GREEN}✓ Scaling completed${NC}"
}

# Function to backup database
backup() {
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    echo -e "\n${YELLOW}Creating database backup: $BACKUP_FILE${NC}"
    docker-compose exec -T db pg_dump -U hustlehub hustlehub > "$BACKUP_FILE"
    echo -e "${GREEN}✓ Backup saved to $BACKUP_FILE${NC}"
}

# Main script logic
case "${1:-help}" in
    start|up)
        start
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
    status|ps)
        status
        ;;
    build)
        build
        ;;
    scale)
        scale "$@"
        ;;
    backup)
        backup
        ;;
    *)
        echo -e "\n${YELLOW}Usage:${NC} ./docker-prod.sh [command]"
        echo -e "\n${YELLOW}Commands:${NC}"
        echo "  start              Start services"
        echo "  stop               Stop all services"
        echo "  restart            Restart all services"
        echo "  logs [service]     View logs (optionally for specific service)"
        echo "  migrate            Run database migrations"
        echo "  status             Show service status and health"
        echo "  build              Build production images"
        echo "  scale <svc> <n>    Scale service to n replicas"
        echo "  backup             Backup database"
        echo ""
        exit 1
        ;;
esac
