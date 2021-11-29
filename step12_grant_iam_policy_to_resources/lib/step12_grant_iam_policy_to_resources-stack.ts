import * as cdk from "@aws-cdk/core";
import * as appsync from "@aws-cdk/aws-appsync";
import * as ddb from "@aws-cdk/aws-dynamodb";
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "@aws-cdk/aws-iam";
import * as lambda from "@aws-cdk/aws-lambda";

export class Step12GrantIamPolicyToResourcesStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // AppSync APi
    const api = new appsync.GraphqlApi(this, "Step12-GQL-API", {
      name: "Step12-GQL-API",
      schema: appsync.Schema.fromAsset("graphql/schema.gql"),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: cdk.Expiration.after(cdk.Duration.days(100)),
          },
        },
      },
      xrayEnabled: true,
    });

    // Print API URl and Key
    new cdk.CfnOutput(this, "APIGraphQlURL", {
      value: api.graphqlUrl,
    });
    new cdk.CfnOutput(this, "GraphQLAPIKey", {
      value: api.apiKey || "",
    });

    // Create ddb table
    const dynamoDBTable = new ddb.Table(this, "Table", {
      tableName: "DDB-Table",
      partitionKey: {
        name: "id",
        type: ddb.AttributeType.STRING,
      },
    });

    // Create specific role for lambda function
    const role = new Role(this, "lambdaRole", {
      roleName: "Step12-Lambda-Role",
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    });

    // Attaching DDB access to policy
    const policy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["dynamodb:*", "logs:*"],
      resources: ["*"],
    });

    // Add policy to role
    role.addToPolicy(policy);

    // Lambda Function
    const lambda_function = new lambda.Function(this, "LambdaFucntion", {
      functionName: "Step12-lambda-function",
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("lambda"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      role: role,
      environment: {
        TABLE: dynamoDBTable.tableName,
      },
    });

    // Data Source to api
    const lambda_data_source = api.addLambdaDataSource(
      "LamdaDataSource",
      lambda_function
    );

    // Resolver mapping template reference for Lambda is also being used in it it will customize the way you want the data in your lambda function
    // NOTE: No need to write response Mapping Template for it if you also want to customize the response then you can write response Mapping Template.
    lambda_data_source.createResolver({
      typeName: "Mutation",
      fieldName: "createData",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
          $util.qr($context.arguments.put("id", $util.defaultIfNull($ctx.arguments.id, $util.autoId())))
        {
          "version": "2017-02-28",
          "operation": "Invoke",
          "payload": {
              "arguments": $util.toJson($context.arguments)
          }
        }
      `),
    });
  }
}
