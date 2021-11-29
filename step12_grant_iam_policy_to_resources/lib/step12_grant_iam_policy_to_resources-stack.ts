import * as cdk from "@aws-cdk/core";
import * as appsync from "@aws-cdk/aws-appsync";
import * as ddb from "@aws-cdk/aws-dynamodb";

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
  }
}
