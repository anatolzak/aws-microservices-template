# AWS Application Load Balancer & Elastic Container Service Template

This repository offers a template for deploying microservices on AWS, leveraging Application Load Balancer (ALB) and Elastic Container Service (ECS).

- **Infrastructure Management**: Utilizes the AWS Cloud Development Kit (CDK) in TypeScript for robust Infrastructure as Code (IaC) capabilities.
- **Traffic Routing**: Employs an Application Load Balancer (ALB) to direct traffic to separate microservices.
- **Path-Based Routing**: Configures the ALB to route traffic based on URL paths (e.g., /api/users\*) for targeted service delivery.
- **Security & TLS**: Features dual ALB listeners for HTTP (port 80) and HTTPS (port 443), with HTTP traffic automatically redirected to HTTPS via AWS Certificate Manager for secure TLS encryption.
- **Container Orchestration**: Deploys microservices on ECS, orchestrating Docker containers for optimal resource utilization.
- **Resource Allocation**: Allows customization of resource allocation (CPU, memory) for each microservice.
- **Dynamic Scaling**: Implements auto-scaling for microservices based on various metrics like CPU and memory usage, and request count.
- **Microservice Example**: Includes a TypeScript microservice example demonstrating rapid builds with Bun (<1 second) compared to traditional tools like Webpack.
- **Performance Optimization**: Uses Bun runtime in Docker images for enhanced performance of the example microservice.
