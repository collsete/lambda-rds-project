import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

export class AwsApiRdsProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Import existing VPC
    const vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', {
      vpcId: 'vpc-0e6553265a5c30a5b'
    });

    // Security Group for Lambda to access RDS
    const lambdaSG = new ec2.SecurityGroup(this, 'LambdaSG', {
      vpc,
      description: 'Allow Lambda to access RDS',
      allowAllOutbound: true,
    });

    lambdaSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(3306),
      'Allow MySQL access from Lambda'
    );

    // Import existing RDS instance
    const rdsInstance = rds.DatabaseInstance.fromDatabaseInstanceAttributes(this, 'ImportedRDS', {
      instanceEndpointAddress: 'database-2.czi4aoy8ko6m.us-east-2.rds.amazonaws.com',
      port: 3306,
      securityGroups: [lambdaSG],
      instanceIdentifier: 'database-2'
    });

    // Lambda function
    const apiLambda = new lambda.Function(this, 'ApiLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
      vpc,
      securityGroups: [lambdaSG],
      environment: {
        DB_HOST: rdsInstance.dbInstanceEndpointAddress,
        DB_USER: 'admin',
        DB_PASS: 'everton123',
        DB_NAME: 'mydatabase',
      },
    });

    // Grant Lambda access to RDS
    rdsInstance.connections.allowDefaultPortFrom(apiLambda);

    // API Gateway
    const api = new apigateway.RestApi(this, 'ApiGateway', {
      restApiName: 'Lambda RDS Service',
      description: 'API Gateway to Lambda connected to RDS',
    });

    const users = api.root.addResource('users');
    users.addMethod('GET', new apigateway.LambdaIntegration(apiLambda));
    users.addMethod('POST', new apigateway.LambdaIntegration(apiLambda));
    users.addMethod('PUT', new apigateway.LambdaIntegration(apiLambda));
    users.addMethod('DELETE', new apigateway.LambdaIntegration(apiLambda));
  }
}
