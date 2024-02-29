import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { join } from 'path';

type AutoScaling = {
  minCapacity: number;
  maxCapacity: number;
  targetCpuUtilizationPercent?: number;
  targetMemoryUtilizationPercent?: number;
  requestsPerTarget?: number;
};

type Microservice = {
  folder: string;
  cpu: number;
  memoryLimitMiB: number;
  pathPattern: string;
  containerPort: number;
  priority: number;
  autoScaling: AutoScaling;
};

type Props = cdk.StackProps & { certificateArn: string; microservices: Microservice[] };

export class EcsAlbMicroservicesStack extends cdk.Stack {
  private vpc: cdk.aws_ec2.IVpc;
  private albListener: cdk.aws_elasticloadbalancingv2.ApplicationListener;
  private ecsCluster: cdk.aws_ecs.Cluster;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);
    const { certificateArn, microservices } = props;

    this.vpc = this.getDefaultVpc();
    this.albListener = this.createApplicationLoadBalancer(certificateArn);
    this.ecsCluster = this.createECSCluster();

    microservices.forEach(microservice => {
      this.createMicroservice(microservice);
    });
  }

  private getDefaultVpc(): cdk.aws_ec2.IVpc {
    return ec2.Vpc.fromLookup(this, 'Vpc', { isDefault: true });
  }

  private createApplicationLoadBalancer(certificateArn: string): cdk.aws_elasticloadbalancingv2.ApplicationListener {
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
    const httpsListener = alb.addListener('HTTPS Listener', {
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

    return httpsListener;
  }

  private createECSCluster(): cdk.aws_ecs.Cluster {
    return new ecs.Cluster(this, 'Cluster', {
      vpc: this.vpc,
    });
  }

  private createMicroservice(microservice: Microservice): void {
    const taskDefinition = this.createTaskDefinition(microservice);
    const fargateService = this.createFargateService(microservice, taskDefinition);
    const targetGroup = this.addTargetGroup(microservice, fargateService);
    this.configureAutoScaling(microservice, fargateService, targetGroup);
  }

  private createTaskDefinition(microservice: Microservice): cdk.aws_ecs.FargateTaskDefinition {
    const { folder, cpu, memoryLimitMiB, containerPort } = microservice;

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

    return taskDefinition;
  }

  private createFargateService(
    microservice: Microservice,
    taskDefinition: cdk.aws_ecs.FargateTaskDefinition
  ): cdk.aws_ecs.FargateService {
    const { folder } = microservice;

    return new ecs.FargateService(this, `${folder}Service`, {
      cluster: this.ecsCluster,
      taskDefinition,
      assignPublicIp: true,
    });
  }

  private addTargetGroup(
    microservice: Microservice,
    fargateService: cdk.aws_ecs.FargateService
  ): cdk.aws_elasticloadbalancingv2.ApplicationTargetGroup {
    const { folder, pathPattern, priority, containerPort } = microservice;

    return this.albListener.addTargets(`${folder}Target`, {
      port: 80,
      conditions: [elbv2.ListenerCondition.pathPatterns([pathPattern])],
      priority,
      targets: [
        fargateService.loadBalancerTarget({
          containerName: folder,
          containerPort,
        }),
      ],
    });
  }

  private configureAutoScaling(
    microservice: Microservice,
    fargateService: cdk.aws_ecs.FargateService,
    targetGroup: cdk.aws_elasticloadbalancingv2.ApplicationTargetGroup
  ): void {
    const {
      folder,
      autoScaling: {
        minCapacity,
        maxCapacity,
        targetCpuUtilizationPercent,
        targetMemoryUtilizationPercent,
        requestsPerTarget,
      },
    } = microservice;

    const scalableTarget = fargateService.autoScaleTaskCount({
      minCapacity,
      maxCapacity,
    });

    if (targetCpuUtilizationPercent !== undefined) {
      scalableTarget.scaleOnCpuUtilization(`${folder}CPUAutoScaling`, {
        targetUtilizationPercent: targetCpuUtilizationPercent,
      });
    }

    if (targetMemoryUtilizationPercent !== undefined) {
      scalableTarget.scaleOnMemoryUtilization(`${folder}MemoryAutoScaling`, {
        targetUtilizationPercent: targetMemoryUtilizationPercent,
      });
    }

    if (requestsPerTarget !== undefined) {
      scalableTarget.scaleOnRequestCount(`${folder}RequestAutoScaling`, {
        requestsPerTarget,
        targetGroup,
      });
    }
  }
}
