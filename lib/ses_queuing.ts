import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cfninc from 'aws-cdk-lib/cloudformation-include';

export interface SESqueueStackProps extends cdk.StackProps {
  SQSBatchSize: number;
  ReservedLambdaConcurrency: number;
  DashboardName: string;
  ApiGatewayName: string;
}

export class SESqueueStack extends cdk.Stack {
  public readonly DynamoDBTableName: string;

  constructor(scope: Construct, id: string, props: SESqueueStackProps) {
    super(scope, id, props);

    const template = new cfninc.CfnInclude(this, 'Template', {
      templateFile: './lib/cf-ses-message-queuing.yaml',
      parameters: {
        'SQSBatchSize': props.SQSBatchSize,
        'ReservedLambdaConcurrency': props.ReservedLambdaConcurrency,
        'DashboardName': props.DashboardName,
        'ApiGatewayName': props.ApiGatewayName
      },
    });

    this.DynamoDBTableName = template.getOutput('DynamoDBTableName').value;
  }
}