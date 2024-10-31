#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DNSStack } from '../lib/dns';
import { SESInfraStack } from '../lib/ses_infra';
import { PipelineStack, PipelineStackProps } from '../lib/pipeline';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag'
import { Aspects } from 'aws-cdk-lib';
import { TestUserDataStack, TestUserStackProps } from '../lib/test_user_data';
import { SESqueueStack } from '../lib/ses_queuing';

const app = new cdk.App();
const aws_region = 'us-west-2'

# Amazon SES analytics pipeline CloudFormation
const pipelineStack = new PipelineStack(app, "PipelineStack", {
  env: {region: aws_region },
  EventAthenaDatabaseName: 'ses-events',
  CreateBucketName: `${app.account}-ses-queuing`,
  NewConfigurationSet: 'Yes',
  ConfigurationSetName: 'sesbenchconfsetname'
})

# Amazon SES email queuing CloudFormation
const sesQueueStack = new SESqueueStack(app, "SESqueueStack", {
  env: { region: aws_region },
  SQSBatchSize: 20,
  ReservedLambdaConcurrency: 7,
  DashboardName: 'SES-queue-monitoring',
  ApiGatewayName: 'ses-endpoint-queue'
});

const testUserDataStack = new TestUserDataStack(app, "TestUserDataStack", {
	env: { region: aws_region },
	DynamoDBTableName: sesQueueStack.DynamoDBTableName
} as TestUserStackProps);

Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }))

NagSuppressions.addStackSuppressions(testUserDataStack, [
  { id: 'AwsSolutions-IAM4', reason: 'AWS Managed Policy following Blog Post' },
  { id: 'AwsSolutions-IAM5', reason: 'Allow All Ops' },
]);


NagSuppressions.addStackSuppressions(sesQueueStack, [
  { id: 'AwsSolutions-IAM4', reason: 'AWS Managed Policy following Blog Post' },
  { id: 'AwsSolutions-IAM5', reason: 'Allow All Ops' },
  { id: 'AwsSolutions-SQS3', reason: 'No DLQ needed' },
  { id: 'AwsSolutions-APIG6', reason: 'No Logging Required' },
  { id: 'AwsSolutions-APIG3', reason: 'Suppress WAF Warning - not needed for Benchmark' },
  { id: 'AwsSolutions-APIG2', reason: 'Requests are only for Demo - no validation needed' }
]);


NagSuppressions.addStackSuppressions(pipelineStack, [
  { id: 'AwsSolutions-IAM5', reason: 'Allow All  Ops' },
  { id: 'AwsSolutions-KDF1', reason: 'ServerSide Encyrption disabled' }
]);

