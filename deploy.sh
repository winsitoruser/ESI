#!/bin/bash

# ============================================================================
# Bedagang POS System - Deployment Script
# ============================================================================
# Server: 103.253.212.64
# Usage: ./deploy.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP="103.253.212.64"
SERVER_USER="root"
APP_DIR="/var/www/bedagang"
APP_NAME="bedagang"
BRANCH="main"

# Functions
print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Check if SSH connection is available
check_connection() {
    print_header "Checking Server Connection"
    if ssh -o ConnectTimeout=5 ${SERVER_USER}@${SERVER_IP} "echo 'Connection successful'" > /dev/null 2>&1; then
        print_success "Server connection established"
        return 0
    else
        print_error "Cannot connect to server"
        echo "Please check:"
        echo "  1. Server IP: ${SERVER_IP}"
        echo "  2. SSH key is configured"
        echo "  3. Server is accessible"
        exit 1
    fi
}

# Deploy application
deploy() {
    print_header "Starting Deployment"
    
    ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
        set -e
        
        echo "→ Navigating to application directory..."
        cd /var/www/bedagang
        
        echo "→ Pulling latest changes from GitHub..."
        git fetch origin
        git pull origin main
        
        echo "→ Installing dependencies..."
        npm install --production
        
        echo "→ Running database migrations..."
        npm run migrate || echo "⚠ Migration failed or no migrations to run"
        
        echo "→ Building application..."
        npm run build
        
        echo "→ Restarting application with PM2..."
        pm2 restart bedagang || pm2 start npm --name "bedagang" -- start
        
        echo "→ Saving PM2 configuration..."
        pm2 save
        
        echo "✓ Deployment completed successfully!"
        
        echo ""
        echo "→ Application Status:"
        pm2 status bedagang
        
        echo ""
        echo "→ Recent Logs:"
        pm2 logs bedagang --lines 20 --nostream
ENDSSH
    
    if [ $? -eq 0 ]; then
        print_success "Deployment completed successfully!"
        echo ""
        echo "Access your application at: http://${SERVER_IP}"
    else
        print_error "Deployment failed!"
        exit 1
    fi
}

# Rollback to previous version
rollback() {
    print_header "Rolling Back to Previous Version"
    
    ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
        set -e
        
        echo "→ Navigating to application directory..."
        cd /var/www/bedagang
        
        echo "→ Rolling back to previous commit..."
        git reset --hard HEAD~1
        
        echo "→ Installing dependencies..."
        npm install --production
        
        echo "→ Building application..."
        npm run build
        
        echo "→ Restarting application..."
        pm2 restart bedagang
        
        echo "✓ Rollback completed!"
ENDSSH
    
    print_success "Rollback completed"
}

# View logs
view_logs() {
    print_header "Viewing Application Logs"
    ssh ${SERVER_USER}@${SERVER_IP} "pm2 logs ${APP_NAME} --lines 50"
}

# Check status
check_status() {
    print_header "Application Status"
    ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
        echo "→ PM2 Status:"
        pm2 status bedagang
        
        echo ""
        echo "→ System Resources:"
        free -h
        df -h /var/www/bedagang
        
        echo ""
        echo "→ Nginx Status:"
        sudo systemctl status nginx --no-pager
        
        echo ""
        echo "→ PostgreSQL Status:"
        sudo systemctl status postgresql --no-pager
ENDSSH
}

# Backup database
backup_database() {
    print_header "Creating Database Backup"
    
    BACKUP_FILE="bedagang_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
        mkdir -p ~/backups
        pg_dump -U bedagang_user bedagang_production > ~/backups/${BACKUP_FILE}
        echo "✓ Backup created: ~/backups/${BACKUP_FILE}"
        ls -lh ~/backups/${BACKUP_FILE}
ENDSSH
    
    print_success "Database backup created"
}

# Main menu
show_menu() {
    echo ""
    print_header "Bedagang Deployment Tool"
    echo "Server: ${SERVER_IP}"
    echo ""
    echo "1) Deploy Application"
    echo "2) Rollback to Previous Version"
    echo "3) View Logs"
    echo "4) Check Status"
    echo "5) Backup Database"
    echo "6) Exit"
    echo ""
    read -p "Select option: " option
    
    case $option in
        1)
            check_connection
            deploy
            ;;
        2)
            check_connection
            rollback
            ;;
        3)
            check_connection
            view_logs
            ;;
        4)
            check_connection
            check_status
            ;;
        5)
            check_connection
            backup_database
            ;;
        6)
            print_info "Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid option"
            show_menu
            ;;
    esac
}

# Main execution
main() {
    clear
    
    # Check if running with argument
    if [ $# -eq 0 ]; then
        show_menu
    else
        case $1 in
            deploy)
                check_connection
                deploy
                ;;
            rollback)
                check_connection
                rollback
                ;;
            logs)
                check_connection
                view_logs
                ;;
            status)
                check_connection
                check_status
                ;;
            backup)
                check_connection
                backup_database
                ;;
            *)
                echo "Usage: $0 {deploy|rollback|logs|status|backup}"
                exit 1
                ;;
        esac
    fi
}

# Run main function
main "$@"
