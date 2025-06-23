#!/bin/bash

# Todo App Development Server Startup Script
# This script kills any existing processes on frontend/backend ports and starts fresh development servers

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Default ports
FRONTEND_PORT=3000
BACKEND_PORT=3001

# Default options
VERBOSE_LOGS=false
SHOW_HELP=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --logs|--verbose|-v)
            VERBOSE_LOGS=true
            shift
            ;;
        --help|-h)
            SHOW_HELP=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Function to show help
show_help() {
    echo "Todo App Development Server Startup Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --logs, --verbose, -v    Enable verbose logging with colored output"
    echo "  --help, -h              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                      # Start servers with standard output"
    echo "  $0 --logs               # Start servers with enhanced logging"
    echo "  $0 -v                   # Same as --logs"
    echo ""
    echo "Ports:"
    echo "  Frontend: http://localhost:$FRONTEND_PORT"
    echo "  Backend:  http://localhost:$BACKEND_PORT"
    exit 0
}

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to kill processes on a specific port
kill_port() {
    local port=$1
    local processes
    local remaining
    
    processes=$(lsof -ti:"$port" 2>/dev/null || true)
    
    if [ -n "$processes" ]; then
        print_warning "Killing existing processes on port $port"
        echo "$processes" | xargs kill -9 2>/dev/null || true
        sleep 2
        
        # Verify processes are killed
        remaining=$(lsof -ti:"$port" 2>/dev/null || true)
        if [ -n "$remaining" ]; then
            print_error "Failed to kill all processes on port $port"
            return 1
        else
            print_success "Port $port is now free"
        fi
    else
        print_status "Port $port is already free"
    fi
}

# Function to check if pnpm is available
check_pnpm() {
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm is not installed. Please install it first:"
        print_error "npm install -g pnpm"
        exit 1
    fi
}

# Function to check if we're in the correct directory
check_directory() {
    if [ ! -f "package.json" ] || [ ! -f "pnpm-workspace.yaml" ]; then
        print_error "This script must be run from the project root directory"
        exit 1
    fi
}

# Function to install dependencies if needed
install_dependencies() {
    if [ ! -d "node_modules" ] || [ ! -d "apps/frontend/node_modules" ] || [ ! -d "apps/backend/node_modules" ]; then
        print_status "Installing dependencies..."
        pnpm install
        print_success "Dependencies installed"
    else
        print_status "Dependencies already installed"
    fi
}

# Function to start servers with enhanced logging
start_with_logs() {
    print_status "Starting servers with enhanced logging..."
    print_status "Frontend (${CYAN}Next.js${NC}) logs will be prefixed with ${CYAN}[FRONTEND]${NC}"
    print_status "Backend (${MAGENTA}Express${NC}) logs will be prefixed with ${MAGENTA}[BACKEND]${NC}"
    echo ""
    
    # Start frontend and backend separately with colored prefixes
    (cd apps/frontend && pnpm dev 2>&1 | sed "s/^/${CYAN}[FRONTEND]${NC} /") &
    FRONTEND_PID=$!
    
    (cd apps/backend && pnpm dev 2>&1 | sed "s/^/${MAGENTA}[BACKEND]${NC} /") &
    BACKEND_PID=$!
    
    # Store PIDs for cleanup
    echo $FRONTEND_PID > /tmp/todo-app-frontend.pid
    echo $BACKEND_PID > /tmp/todo-app-backend.pid
    
    # Wait for both processes
    wait $FRONTEND_PID $BACKEND_PID
}

# Function to start servers normally
start_normal() {
    print_status "Starting development servers..."
    pnpm dev
}

# Main execution
main() {
    # Show help if requested
    if [ "$SHOW_HELP" = true ]; then
        show_help
    fi
    
    print_status "Starting Todo App development servers..."
    
    # Preliminary checks
    check_directory
    check_pnpm
    
    # Kill existing processes on both ports
    print_status "Checking for existing processes..."
    kill_port $FRONTEND_PORT
    kill_port $BACKEND_PORT
    
    # Install dependencies if needed
    install_dependencies
    
    # Display server URLs
    print_status "Frontend will be available at: http://localhost:$FRONTEND_PORT"
    print_status "Backend API will be available at: http://localhost:$BACKEND_PORT"
    
    if [ "$VERBOSE_LOGS" = true ]; then
        print_status "Verbose logging enabled - all server logs will be visible"
        echo ""
        start_with_logs
    else
        print_status "Starting servers (use --logs for enhanced logging)"
        echo ""
        start_normal
    fi
}

# Handle script termination
cleanup() {
    print_warning "Shutting down development servers..."
    
    # Clean up PID files if they exist
    if [ -f /tmp/todo-app-frontend.pid ]; then
        FRONTEND_PID=$(cat /tmp/todo-app-frontend.pid)
        kill -TERM $FRONTEND_PID 2>/dev/null || true
        rm -f /tmp/todo-app-frontend.pid
    fi
    
    if [ -f /tmp/todo-app-backend.pid ]; then
        BACKEND_PID=$(cat /tmp/todo-app-backend.pid)
        kill -TERM $BACKEND_PID 2>/dev/null || true
        rm -f /tmp/todo-app-backend.pid
    fi
    
    # Fallback to port-based cleanup
    kill_port $FRONTEND_PORT
    kill_port $BACKEND_PORT
    
    print_success "Development servers stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Run main function
main