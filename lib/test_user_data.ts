import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { triggers, aws_lambda as lambda, aws_iam as iam } from 'aws-cdk-lib';

export interface TestUserStackProps extends cdk.StackProps {
  DynamoDBTableName: string;
}

export class TestUserDataStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TestUserStackProps) {
    super(scope, id, props);

    const userGeneratorLambda = new triggers.TriggerFunction(this, "GenerateUsers", {
      runtime: lambda.Runtime.PYTHON_3_12,
      timeout: cdk.Duration.minutes(5),
      code: lambda.Code.fromAsset("lib/lambda_code"),
      handler: "generate_users.lambda_handler",
      memorySize: 2048,
	  environment: {
		  DYNAMODB_TABLE_NAME: props.DynamoDBTableName
		}
    });

    userGeneratorLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:BatchWriteItem'],
      resources: [
        `arn:aws:dynamodb:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:table/${props.DynamoDBTableName}`
      ],
    }));

    const trigger = new triggers.Trigger(this, "TriggerGenerateUsers", {
      handler: userGeneratorLambda,
      timeout: cdk.Duration.minutes(5),
      executeAfter: [userGeneratorLambda],
      executeOnHandlerChange: true
    });
  }
}
