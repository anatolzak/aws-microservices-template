import * as cdk from 'aws-cdk-lib';
import { EcsAlbMicroservicesStack } from './infra/alb-ecs-microservices';

const AWS_ACCOUNT_ID = process.env.AWS_ACCOUNT_ID!;
const AWS_REGION = process.env.AWS_REGION!;
const AWS_SSL_CERTIFICATE_ARN = process.env.AWS_SSL_CERTIFICATE_ARN!;

const app = new cdk.App();

new EcsAlbMicroservicesStack(app, 'EcsAlbMicroservicesStackv19', {
  env: { account: AWS_ACCOUNT_ID, region: AWS_REGION },
  certificateArn: AWS_SSL_CERTIFICATE_ARN,
  microservices: [
    {
      folder: 'users',
      cpu: 512,
      memoryLimitMiB: 1024,
      pathPattern: '/api/users*',
      containerPort: 80,
      priority: 10,
      autoScaling: {
        minCapacity: 1,
        maxCapacity: 10,
        targetCpuUtilizationPercent: 50,
      },
    },
  ],
});
