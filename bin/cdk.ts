#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PipelineStack} from '../lib/pipeline';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag'
import { Aspects } from 'aws-cdk-lib';
import { TestUserDataStack, TestUserStackProps } from '../lib/test_user_data';
import { SESqueueStack } from '../lib/ses_queuing';

const app = new cdk.App();

// Read the parameters from config.params.json
const configParams = require("../config.params.json");

const eventAthenaDatabaseName = configParams.EventAthenaDatabaseName;
const newConfigurationSet = configParams.NewConfigurationSet;
const configurationSetName = configParams.ConfigurationSetName;
const sqsBatchSize = configParams.SQSBatchSize;
const reservedLambdaConcurrency = configParams.ReservedLambdaConcurrency;
const cloudwatchDashboardName = configParams.CloudWatchDashboardName;
const apiGatewayName = configParams.ApiGatewayName;

// Random S3 bucket name
function generateRandomBucketName(): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return `${result}-ses-load-testing`;
}

// Amazon SES analytics pipeline CloudFormation
const pipelineStack = new PipelineStack(app, "PipelineStack", {
  env: {region: process.env.CDK_DEFAULT_REGION },
  EventAthenaDatabaseName: eventAthenaDatabaseName,
  CreateBucketName: generateRandomBucketName(),
  NewConfigurationSet: newConfigurationSet,
  ConfigurationSetName: configurationSetName
})

// Amazon SES email queuing CloudFormation
const sesQueueStack = new SESqueueStack(app, "SESqueueStack", {
  env: { region: process.env.CDK_DEFAULT_REGION },
  SQSBatchSize: sqsBatchSize,
  ReservedLambdaConcurrency: reservedLambdaConcurrency,
  DashboardName: cloudwatchDashboardName,
  ApiGatewayName: apiGatewayName
});

// Test data for Amazon DynamoDB
const testUserDataStack = new TestUserDataStack(app, "TestUserDataStack", {
	env: { region: process.env.CDK_DEFAULT_REGION },
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

