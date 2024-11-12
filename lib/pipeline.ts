import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cfninc from 'aws-cdk-lib/cloudformation-include';

export interface PipelineStackProps extends cdk.StackProps {
  EventAthenaDatabaseName: string;
  CreateBucketName: string;
  NewConfigurationSet: string;
  ConfigurationSetName: string;
}

export class PipelineStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: PipelineStackProps) {
        super(scope, id, props);
    
        const template = new cfninc.CfnInclude(this, 'Template', { 
          templateFile: './lib/cf_pipeline.yaml',
          parameters: {
            'EventAthenaDatabaseName': props.EventAthenaDatabaseName,
            'CreateBucketName': props.CreateBucketName,
            'NewConfigurationSet': props.NewConfigurationSet,
            'ConfigurationSetName': props.ConfigurationSetName
          },
        });
  }
}