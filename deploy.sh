#!/bin/bash

# Financial Advisor Bot Deployment Script
# This script provides deployment options for different platforms

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    print_success "Docker is available"
}

# Check if Docker Compose is installed
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    print_success "Docker Compose is available"
}

# Build Docker image
build_image() {
    print_status "Building Docker image..."
    docker build -t financial-advisor-bot .
    print_success "Docker image built successfully"
}

# Deploy with Docker Compose (local)
deploy_local() {
    print_status "Deploying with Docker Compose (local)..."
    
    # Copy environment file if it doesn't exist
    if [ ! -f .env ]; then
        cp env.development .env
        print_warning "Created .env from env.development. Please edit with your settings."
    fi
    
    docker-compose up -d
    print_success "Application deployed locally with Docker Compose"
    print_status "Access the application at http://localhost:3000"
    print_status "View logs with: docker-compose logs -f"
}

# Deploy with Docker Compose (production)
deploy_production() {
    print_status "Deploying with Docker Compose (production)..."
    
    # Copy environment file if it doesn't exist
    if [ ! -f .env ]; then
        cp env.production .env
        print_warning "Created .env from env.production. Please edit with your production settings."
    fi
    
    docker-compose -f docker-compose.prod.yml up -d
    print_success "Application deployed in production mode"
    print_status "Access the application at http://localhost:3000"
    print_status "View logs with: docker-compose -f docker-compose.prod.yml logs -f"
}

# Deploy to Heroku
deploy_heroku() {
    print_status "Deploying to Heroku..."
    
    if ! command -v heroku &> /dev/null; then
        print_error "Heroku CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if Heroku app exists
    if ! heroku apps:info &> /dev/null; then
        print_status "Creating Heroku app..."
        heroku create
    fi
    
    # Set environment variables
    print_status "Setting environment variables..."
    heroku config:set NODE_ENV=production
    
    # Deploy
    print_status "Deploying to Heroku..."
    git push heroku main
    
    print_success "Application deployed to Heroku"
    print_status "Your app URL: $(heroku info -s | grep web_url | cut -d= -f2)"
}

# Deploy to DigitalOcean App Platform
deploy_digitalocean() {
    print_status "Deploying to DigitalOcean App Platform..."
    
    if ! command -v doctl &> /dev/null; then
        print_error "DigitalOcean CLI (doctl) is not installed. Please install it first."
        exit 1
    fi
    
    print_warning "Please create a DigitalOcean App Platform app manually and connect your GitHub repository."
    print_status "The app will automatically deploy when you push to main branch."
}

# Deploy to AWS ECS
deploy_aws_ecs() {
    print_status "Deploying to AWS ECS..."
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    print_warning "Please create an ECS cluster and task definition manually."
    print_status "Then use the following commands:"
    echo "aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com"
    echo "docker tag financial-advisor-bot:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/financial-advisor-bot:latest"
    echo "docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/financial-advisor-bot:latest"
}

# Deploy to Google Cloud Run
deploy_gcp_run() {
    print_status "Deploying to Google Cloud Run..."
    
    if ! command -v gcloud &> /dev/null; then
        print_error "Google Cloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    print_status "Building and deploying to Cloud Run..."
    gcloud run deploy financial-advisor-bot \
        --source . \
        --platform managed \
        --region us-central1 \
        --allow-unauthenticated
    
    print_success "Application deployed to Google Cloud Run"
}

# Health check
health_check() {
    print_status "Performing health check..."
    
    if curl -f http://localhost:3000/health &> /dev/null; then
        print_success "Application is healthy"
    else
        print_error "Application health check failed"
        exit 1
    fi
}

# Show usage
show_usage() {
    echo "Financial Advisor Bot Deployment Script"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  local       Deploy locally with Docker Compose"
    echo "  production  Deploy in production mode with Docker Compose"
    echo "  heroku      Deploy to Heroku"
    echo "  digitalocean Deploy to DigitalOcean App Platform"
    echo "  aws-ecs     Deploy to AWS ECS"
    echo "  gcp-run     Deploy to Google Cloud Run"
    echo "  build       Build Docker image only"
    echo "  health      Perform health check"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 local"
    echo "  $0 production"
    echo "  $0 heroku"
}

# Main script
main() {
    case "${1:-help}" in
        local)
            check_docker
            check_docker_compose
            build_image
            deploy_local
            ;;
        production)
            check_docker
            check_docker_compose
            build_image
            deploy_production
            ;;
        heroku)
            deploy_heroku
            ;;
        digitalocean)
            deploy_digitalocean
            ;;
        aws-ecs)
            deploy_aws_ecs
            ;;
        gcp-run)
            deploy_gcp_run
            ;;
        build)
            check_docker
            build_image
            ;;
        health)
            health_check
            ;;
        help|*)
            show_usage
            ;;
    esac
}

# Run main function
main "$@" 