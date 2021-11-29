# Step 12 Granting IAM policies to Resources

## Steps to code

1. Create a new directory by using `mkdir step12_grant_iam_policy_to_resources`
2. Naviagte to the newly created directory using `cd step12_grant_iam_policy_to_resources`
3. Create a cdk app using `cdk init app --language typescript`
4. Use `npm run watch` to auto build our app as we code
5. Create "graphql/schema.gql" to define schema for the api

   ```gql
   type Data {
     id: ID!
     entry: String!
   }

   type Query {
     allData: [Data]
   }

   type Mutation {
     createData(entry: String!): Data!
   }
   ```

6. Install AppSync in the app using `npm i @aws-cdk/aws-appsync`
7. Update "lib/step12_grant_iam_policy_to_resources-stack.ts" to define appsync api in the app

   ```js
   import * as appsync from "@aws-cdk/aws-appsync";
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
   ```

8. Update "lib/step12_grant_iam_policy_to_resources-stack.ts" to display API URL and api key in console

   ```js
   new cdk.CfnOutput(this, "APIGraphQlURL", {
     value: api.graphqlUrl,
   });
   new cdk.CfnOutput(this, "GraphQLAPIKey", {
     value: api.apiKey || "",
   });
   ```

9. Install DynamoDb in the app using `npm i @aws-cdk/aws-dynamodb`
10. Update "lib/step12_grant_iam_policy_to_resources-stack.ts" to define a ddb table in the stack

    ```js
    import * as ddb from "@aws-cdk/aws-dynamodb";
    const dynamoDBTable = new ddb.Table(this, "Table", {
      tableName: "DDB-Table",
      partitionKey: {
        name: "id",
        type: ddb.AttributeType.STRING,
      },
    });
    ```

11. Install IAM user cosnole in the app using `npm i @aws-cdk/aws-iam`
12. Update "lib/step12_grant_iam_policy_to_resources-stack.ts" to define a new role for lambda service

    ```js
    import { Role, ServicePrincipal } from "@aws-cdk/aws-iam";
    const role = new Role(this, "lambdaRole", {
      roleName: "Step12-Lambda-Role",
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    });
    ```

13. Update "lib/step12_grant_iam_policy_to_resources-stack.ts" to attach ddb access to policy

    ```js
    import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
    const policy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["dynamodb:*", "logs:*"],
      resources: ["*"],
    });
    ```

14. Update "lib/step12_grant_iam_policy_to_resources-stack.ts" to add policy to role

    ```js
    role.addToPolicy(policy);
    ```

15. Install sdk in the app using `npm i aws-sdk`
16. Create "lambda/index.ts" to define a lambda function

    ```js
    const AWS = require("aws-sdk");
    const docClient = new AWS.DynamoDB.DocumentClient();

    type AppSyncEvent = {
      info: {
        fieldName: string,
      },
      arguments: {
        id: string,
        title: string,
      },
    };

    exports.handler = async (event: AppSyncEvent) => {
      const params = {
        TableName: process.env.TABLE,
        Item: event.arguments,
      };
      try {
        await docClient.put(params).promise();
        return event.arguments;
      } catch (err) {
        console.log("DynamoDB error: ", err);
        return null;
      }
    };
    ```

17. Install lambda in app using `npm i @aws-cdk/aws-lambda`
18. Update "lib/step12_grant_iam_policy_to_resources-stack.ts" to define lambda function

    ```js
    import * as lambda from "@aws-cdk/aws-lambda";
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
    ```

19. Update "lib/step12_grant_iam_policy_to_resources-stack.ts" to add datasource to api

    ```js
    const lambda_data_source = api.addLambdaDataSource(
      "LamdaDataSource",
      lambda_function
    );
    ```

20. Update "lib/step12_grant_iam_policy_to_resources-stack.ts" to define resolver

    ```js
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
    ```

21. Deploy App using `cdk deploy`
22. Test app functions on AWS web console
23. Destroy the app using `cdk destroy`
