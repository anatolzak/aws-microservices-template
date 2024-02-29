import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { join } from 'path';

export type Microservice = {
  folder: string;
  cpu: number;
  memoryLimitMiB: number;
  pathPattern: string;
  containerPort: number;
  priority: number;
  autoScaling: {
    minCapacity: number;
    maxCapacity: number;
    targetCpuUtilizationPercent: number;
  };
};

type Props = cdk.StackProps & { certificateArn: string; microservices: Microservice[] };

export class EcsAlbMicroservicesStack extends cdk.Stack {
  private vpc: cdk.aws_ec2.IVpc | undefined;
  private albListener: cdk.aws_elasticloadbalancingv2.ApplicationListener | undefined;
  private ecsCluster: cdk.aws_ecs.Cluster | undefined;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);
    const { certificateArn, microservices } = props;

    this.setDefaultVpc();
    this.createECSCluster();
    this.createALB({ certificateArn });

    microservices.forEach(microservice => {
      this.createECSFargateService(microservice);
    });
  }

  private createECSCluster() {
    if (!this.vpc) {
      throw new Error('VPC must be defined');
    }

    this.ecsCluster = new ecs.Cluster(this, 'Cluster', {
      vpc: this.vpc,
    });
  }

  private createECSFargateService({
    containerPort,
    folder,
    pathPattern,
    priority,
    memoryLimitMiB,
    cpu,
    autoScaling: { minCapacity, maxCapacity, targetCpuUtilizationPercent },
  }: Microservice) {
    if (!this.ecsCluster) {
      throw new Error('ECS Cluster must be defined');
    }

    if (!this.albListener) {
      throw new Error('ALB Listener must be defined');
    }

    const taskDefinition = new ecs.FargateTaskDefinition(this, `${folder}TaskDef`, {
      cpu,
      memoryLimitMiB,
    });

    taskDefinition.addContainer(folder, {
      image: ecs.ContainerImage.fromAsset(join(__dirname, '..', 'services', folder)),
      memoryLimitMiB,
      cpu,
      portMappings: [{ containerPort }],
      environment: { NODE_ENV: 'production' },
    });

    const ecsService = new ecs.FargateService(this, `${folder}Service`, {
      cluster: this.ecsCluster,
      taskDefinition,
      assignPublicIp: true,
    });

    this.albListener.addTargets(`${folder}Targets`, {
      port: 80,
      conditions: [elbv2.ListenerCondition.pathPatterns([pathPattern])],
      priority,
      targets: [
        ecsService.loadBalancerTarget({
          containerName: folder,
          containerPort,
        }),
      ],
    });

    const scalableTarget = ecsService.autoScaleTaskCount({
      minCapacity,
      maxCapacity,
    });

    scalableTarget.scaleOnCpuUtilization(`${folder}AutoScaling`, {
      targetUtilizationPercent: targetCpuUtilizationPercent,
    });
  }

  private createALB({ certificateArn }: { certificateArn: string }) {
    if (!this.vpc) {
      throw new Error('VPC must be defined');
    }

    const alb = new elbv2.ApplicationLoadBalancer(this, 'LB', {
      vpc: this.vpc,
      internetFacing: true,
    });

    // HTTP LISTENER - REDIRECT TO HTTPS
    alb.addListener('Listener', {
      port: 80,
      defaultAction: elbv2.ListenerAction.redirect({
        protocol: 'HTTPS',
        host: '#{host}',
        path: '/#{path}',
        query: '#{query}',
      }),
    });

    // HTTPS LISTENER
    this.albListener = alb.addListener('HTTPS Listener', {
      port: 443,
      certificates: [{ certificateArn }],
      defaultAction: elbv2.ListenerAction.fixedResponse(404, {
        contentType: 'text/plain',
        messageBody: 'Not Found',
      }),
    });

    new cdk.CfnOutput(this, 'ALB DNS Name', {
      value: alb.loadBalancerDnsName,
    });
  }

  private setDefaultVpc() {
    this.vpc = ec2.Vpc.fromLookup(this, 'Vpc', { isDefault: true });
  }
}
