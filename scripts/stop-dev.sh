#!/bin/bash

# Todo App Development Server Stop Script
# This script stops all development servers running on frontend and backend ports

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
    local processes=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -n "$processes" ]; then
        print_status "Stopping processes on port $port..."
        echo "$processes" | xargs kill -9 2>/dev/null || true
        sleep 2
        
        # Verify processes are killed
        local remaining=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$remaining" ]; then
            print_error "Failed to stop all processes on port $port"
            return 1
        else
            print_success "Successfully stopped processes on port $port"
        fi
    else
        print_status "No processes running on port $port"
    fi
}

# Function to find and kill all node processes related to this project
kill_project_processes() {
    print_status "Searching for related Node.js processes..."
    
    # Find processes containing todo-app, next, or express keywords
    local project_processes=$(ps aux | grep -E "(todo-app|next|express|pnpm.*dev)" | grep -v grep | awk '{print $2}' || true)
    
    if [ -n "$project_processes" ]; then
        print_warning "Found related processes, attempting to stop them..."
        echo "$project_processes" | xargs kill -TERM 2>/dev/null || true
        sleep 3
        
        # Force kill if still running
        local remaining=$(ps aux | grep -E "(todo-app|next|express|pnpm.*dev)" | grep -v grep | awk '{print $2}' || true)
        if [ -n "$remaining" ]; then
            print_warning "Some processes still running, force killing..."
            echo "$remaining" | xargs kill -9 2>/dev/null || true
        fi
    fi
}

# Main execution
main() {
    print_status "Stopping Todo App development servers..."
    
    # Stop processes on specific ports
    kill_port $FRONTEND_PORT
    kill_port $BACKEND_PORT
    
    # Additional cleanup for any related processes
    kill_project_processes
    
    print_success "All development servers have been stopped"
    print_status "You can now start fresh servers using: ./scripts/start-dev.sh"
}

# Run main function
main