# AWS Microservices Template

This repository offers a template for deploying microservices on AWS, leveraging Application Load Balancer (ALB) and Elastic Container Service (ECS).

- **Infrastructure Management**: Utilizes the AWS Cloud Development Kit (CDK) in TypeScript for robust Infrastructure as Code (IaC) capabilities.
- **Traffic Routing**: Employs an Application Load Balancer (ALB) to direct traffic to separate microservices.
- **Path-Based Routing**: Configures the ALB to route traffic based on URL paths (e.g., /api/users\*) for targeted service delivery.
- **Security & TLS**: Features dual ALB listeners for HTTP (port 80) and HTTPS (port 443), with HTTP traffic automatically redirected to HTTPS via AWS Certificate Manager for secure TLS encryption.
- **Container Orchestration**: Deploys microservices on ECS, orchestrating Docker containers for optimal resource utilization.
- **Serverless Compute with Fargate**: Utilizes AWS Fargate for serverless compute, allowing for the automatic scaling and management of containers without the need to provision or manage servers.
- **Resource Allocation**: Allows customization of resource allocation (CPU, memory) for each microservice.
- **Dynamic Scaling**: Implements auto-scaling for microservices based on various metrics like CPU usage, memory usage, and request count.
- **Microservice Example**: Includes a TypeScript microservice example demonstrating rapid builds with Bun (<1 second) compared to traditional tools like Webpack (~40 seconds).
- **Performance Optimization**: Uses Bun runtime in Docker images for enhanced performance of the example microservice.
- **Docker Image Hosting**: Docker images are stored on Amazon Elastic Container Registry (ECR).

## Deployment Guide

1. **Install Dependencies**: Execute `bun install` to install required packages. This project uses Bun as its package manager.
2. **Configure Environment**: Populate the `.env` file with necessary environment variables, referencing `.env.example` for the template.
3. **CDK Bootstrap**: If your AWS account and region have not been prepared for CDK deployment, run `cdk bootstrap` to set up the necessary environment.
4. **Deploy the Stack**: Use `bun run deploy` for deployment. Ensure the Docker daemon is active, as the CDK stack automates Docker image building.
5. **DNS Configuration**: After deployment, configure your domain's DNS settings by pointing a record to the Application Load Balancer's DNS name to route traffic to your application.
