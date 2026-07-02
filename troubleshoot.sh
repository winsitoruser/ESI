#!/bin/bash

# ============================================================================
# Bedagang Server Troubleshooting Script
# ============================================================================
# Server: 103.253.212.64
# Usage: ./troubleshoot.sh
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVER_IP="103.253.212.64"
SERVER_USER="root"

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

# Check if server is reachable
check_server_ping() {
    print_header "1. Checking Server Connectivity"
    
    if ping -c 3 ${SERVER_IP} > /dev/null 2>&1; then
        print_success "Server is reachable via ping"
    else
        print_error "Server is NOT reachable via ping"
        echo "Possible issues:"
        echo "  - Server is down"
        echo "  - Network connectivity issues"
        echo "  - ICMP blocked by firewall"
    fi
}

# Check SSH connection
check_ssh() {
    print_header "2. Checking SSH Connection"
    
    if ssh -o ConnectTimeout=5 ${SERVER_USER}@${SERVER_IP} "echo 'SSH OK'" > /dev/null 2>&1; then
        print_success "SSH connection successful"
        return 0
    else
        print_error "Cannot connect via SSH"
        echo "Please check:"
        echo "  1. SSH key is configured: ssh-copy-id ${SERVER_USER}@${SERVER_IP}"
        echo "  2. SSH service is running on server"
        echo "  3. Port 22 is open in firewall"
        return 1
    fi
}

# Check server status
check_server_status() {
    print_header "3. Checking Server Status"
    
    ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
        echo "→ System Uptime:"
        uptime
        
        echo ""
        echo "→ Memory Usage:"
        free -h
        
        echo ""
        echo "→ Disk Usage:"
        df -h /
        
        echo ""
        echo "→ CPU Load:"
        top -bn1 | head -5
ENDSSH
}

# Check if application directory exists
check_app_directory() {
    print_header "4. Checking Application Directory"
    
    ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
        if [ -d "/var/www/bedagang" ]; then
            echo "✓ Application directory exists"
            ls -la /var/www/bedagang | head -10
        else
            echo "✗ Application directory NOT found"
            echo "You need to deploy the application first"
            echo "Run: git clone https://github.com/winsitoruser/bedagang.git /var/www/bedagang"
        fi
ENDSSH
}

# Check if Node.js is installed
check_nodejs() {
    print_header "5. Checking Node.js Installation"
    
    ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
        if command -v node &> /dev/null; then
            echo "✓ Node.js is installed"
            node --version
            npm --version
        else
            echo "✗ Node.js is NOT installed"
            echo "Install with: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install -y nodejs"
        fi
ENDSSH
}

# Check PM2 status
check_pm2() {
    print_header "6. Checking PM2 Process Manager"
    
    ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
        if command -v pm2 &> /dev/null; then
            echo "✓ PM2 is installed"
            pm2 --version
            echo ""
            echo "→ PM2 Process List:"
            pm2 list
            echo ""
            echo "→ PM2 Logs (last 20 lines):"
            pm2 logs bedagang --lines 20 --nostream || echo "No logs available"
        else
            echo "✗ PM2 is NOT installed"
            echo "Install with: sudo npm install -g pm2"
        fi
ENDSSH
}

# Check if application is running
check_app_running() {
    print_header "7. Checking Application Status"
    
    ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
        echo "→ Checking if Node.js process is running:"
        if ps aux | grep -v grep | grep "node" > /dev/null; then
            echo "✓ Node.js process found"
            ps aux | grep -v grep | grep "node"
        else
            echo "✗ No Node.js process running"
        fi
        
        echo ""
        echo "→ Checking port 3000:"
        if netstat -tulpn 2>/dev/null | grep ":3000" > /dev/null || ss -tulpn 2>/dev/null | grep ":3000" > /dev/null; then
            echo "✓ Port 3000 is in use"
            netstat -tulpn 2>/dev/null | grep ":3000" || ss -tulpn 2>/dev/null | grep ":3000"
        else
            echo "✗ Port 3000 is NOT in use"
            echo "Application is not running!"
        fi
ENDSSH
}

# Check Nginx status
check_nginx() {
    print_header "8. Checking Nginx Web Server"
    
    ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
        if command -v nginx &> /dev/null; then
            echo "✓ Nginx is installed"
            nginx -v
            echo ""
            echo "→ Nginx Status:"
            sudo systemctl status nginx --no-pager | head -10
            echo ""
            echo "→ Nginx Configuration Test:"
            sudo nginx -t
        else
            echo "✗ Nginx is NOT installed"
            echo "Install with: sudo apt install -y nginx"
        fi
ENDSSH
}

# Check firewall status
check_firewall() {
    print_header "9. Checking Firewall Configuration"
    
    ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
        if command -v ufw &> /dev/null; then
            echo "→ UFW Firewall Status:"
            sudo ufw status verbose
        else
            echo "UFW not installed"
        fi
        
        echo ""
        echo "→ Open Ports (listening):"
        sudo netstat -tulpn | grep LISTEN || sudo ss -tulpn | grep LISTEN
ENDSSH
}

# Check PostgreSQL status
check_postgresql() {
    print_header "10. Checking PostgreSQL Database"
    
    ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
        if command -v psql &> /dev/null; then
            echo "✓ PostgreSQL is installed"
            psql --version
            echo ""
            echo "→ PostgreSQL Status:"
            sudo systemctl status postgresql --no-pager | head -10
        else
            echo "✗ PostgreSQL is NOT installed"
            echo "Install with: sudo apt install -y postgresql postgresql-contrib"
        fi
ENDSSH
}

# Provide solutions
provide_solutions() {
    print_header "SOLUTIONS FOR ERR_CONNECTION_REFUSED"
    
    echo "Common causes and solutions:"
    echo ""
    echo "1. Application Not Running:"
    echo "   → Start with PM2: ssh ${SERVER_USER}@${SERVER_IP} 'cd /var/www/bedagang && pm2 start npm --name bedagang -- start'"
    echo ""
    echo "2. Application Not Deployed:"
    echo "   → Deploy: ./deploy.sh deploy"
    echo ""
    echo "3. Firewall Blocking Port:"
    echo "   → Allow port: ssh ${SERVER_USER}@${SERVER_IP} 'sudo ufw allow 3000/tcp && sudo ufw allow 80/tcp'"
    echo ""
    echo "4. Nginx Not Configured:"
    echo "   → Configure Nginx reverse proxy (see SERVER_SETUP_GUIDE.md)"
    echo ""
    echo "5. Wrong Port:"
    echo "   → Try: http://103.253.212.64:3000 (with port 3000)"
    echo ""
    echo "6. Application Crashed:"
    echo "   → Check logs: ssh ${SERVER_USER}@${SERVER_IP} 'pm2 logs bedagang'"
    echo "   → Restart: ssh ${SERVER_USER}@${SERVER_IP} 'pm2 restart bedagang'"
}

# Quick fix script
quick_fix() {
    print_header "ATTEMPTING QUICK FIX"
    
    print_info "This will attempt to start the application..."
    
    ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
        # Navigate to app directory
        cd /var/www/bedagang || exit 1
        
        # Check if dependencies are installed
        if [ ! -d "node_modules" ]; then
            echo "→ Installing dependencies..."
            npm install
        fi
        
        # Check if .env exists
        if [ ! -f ".env" ]; then
            echo "⚠ Warning: .env file not found"
            echo "Please create .env file with proper configuration"
        fi
        
        # Try to start with PM2
        echo "→ Starting application with PM2..."
        pm2 start npm --name "bedagang" -- start || pm2 restart bedagang
        
        # Save PM2 configuration
        pm2 save
        
        # Show status
        echo ""
        echo "→ Application Status:"
        pm2 status bedagang
        
        # Show logs
        echo ""
        echo "→ Recent Logs:"
        pm2 logs bedagang --lines 20 --nostream
ENDSSH
    
    print_success "Quick fix completed. Try accessing http://103.253.212.64:3000"
}

# Main menu
show_menu() {
    clear
    print_header "Bedagang Server Troubleshooting"
    echo "Server: ${SERVER_IP}"
    echo ""
    echo "1) Run Full Diagnostics"
    echo "2) Quick Fix (Start Application)"
    echo "3) Check Server Status Only"
    echo "4) Check Application Status Only"
    echo "5) View Application Logs"
    echo "6) Restart Application"
    echo "7) Exit"
    echo ""
    read -p "Select option: " option
    
    case $option in
        1)
            check_server_ping
            echo ""
            if check_ssh; then
                check_server_status
                echo ""
                check_app_directory
                echo ""
                check_nodejs
                echo ""
                check_pm2
                echo ""
                check_app_running
                echo ""
                check_nginx
                echo ""
                check_firewall
                echo ""
                check_postgresql
                echo ""
                provide_solutions
            fi
            ;;
        2)
            if check_ssh; then
                quick_fix
            fi
            ;;
        3)
            if check_ssh; then
                check_server_status
            fi
            ;;
        4)
            if check_ssh; then
                check_app_running
                echo ""
                check_pm2
            fi
            ;;
        5)
            if check_ssh; then
                ssh ${SERVER_USER}@${SERVER_IP} "pm2 logs bedagang --lines 50"
            fi
            ;;
        6)
            if check_ssh; then
                print_info "Restarting application..."
                ssh ${SERVER_USER}@${SERVER_IP} "pm2 restart bedagang && pm2 status bedagang"
                print_success "Application restarted"
            fi
            ;;
        7)
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
    if [ $# -eq 0 ]; then
        show_menu
    else
        case $1 in
            diagnose)
                check_server_ping
                check_ssh && check_server_status && check_app_running
                ;;
            fix)
                check_ssh && quick_fix
                ;;
            logs)
                check_ssh && ssh ${SERVER_USER}@${SERVER_IP} "pm2 logs bedagang"
                ;;
            restart)
                check_ssh && ssh ${SERVER_USER}@${SERVER_IP} "pm2 restart bedagang"
                ;;
            *)
                echo "Usage: $0 {diagnose|fix|logs|restart}"
                exit 1
                ;;
        esac
    fi
}

main "$@"
