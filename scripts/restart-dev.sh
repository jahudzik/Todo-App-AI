#!/bin/bash

# Todo App Development Server Restart Script
# This script stops all development servers and starts them fresh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default ports
FRONTEND_PORT=3000
BACKEND_PORT=3001

# Parse command line arguments to pass to start-dev.sh
START_ARGS=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --logs|--verbose|-v)
            START_ARGS="$START_ARGS --logs"
            shift
            ;;
        --help|-h)
            echo "Todo App Development Server Restart Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --logs, --verbose, -v    Enable verbose logging with colored output"
            echo "  --help, -h              Show this help message"
            echo ""
            echo "This script stops existing servers and starts fresh ones."
            echo "All options are passed through to start-dev.sh"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

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

# Function to check if we're in the correct directory
check_directory() {
    if [ ! -f "package.json" ] || [ ! -f "pnpm-workspace.yaml" ]; then
        print_error "This script must be run from the project root directory"
        exit 1
    fi
}

# Function to kill processes on a specific port
kill_port() {
    local port=$1
    local processes=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -n "$processes" ]; then
        print_warning "Stopping processes on port $port"
        echo "$processes" | xargs kill -9 2>/dev/null || true
        sleep 2
        
        # Verify processes are killed
        local remaining=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$remaining" ]; then
            print_error "Failed to stop all processes on port $port"
            return 1
        else
            print_success "Stopped processes on port $port"
        fi
    else
        print_status "No processes running on port $port"
    fi
}

# Main execution
main() {
    print_status "Restarting Todo App development servers..."
    
    # Check if we're in the right directory
    check_directory
    
    # Stop existing servers
    print_status "Stopping existing development servers..."
    kill_port $FRONTEND_PORT
    kill_port $BACKEND_PORT
    
    # Wait a moment for cleanup
    sleep 1
    
    # Start fresh servers using the start-dev script
    print_status "Starting fresh development servers..."
    
    # Check if start-dev.sh exists and is executable
    if [ -x "./scripts/start-dev.sh" ]; then
        if [ -n "$START_ARGS" ]; then
            print_status "Passing arguments: $START_ARGS"
            exec ./scripts/start-dev.sh $START_ARGS
        else
            exec ./scripts/start-dev.sh
        fi
    else
        print_error "start-dev.sh script not found or not executable"
        print_error "Please ensure scripts/start-dev.sh exists and is executable"
        exit 1
    fi
}

# Handle script termination
cleanup() {
    print_warning "Restart interrupted, stopping all servers..."
    kill_port $FRONTEND_PORT
    kill_port $BACKEND_PORT
    exit 1
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Run main function
main