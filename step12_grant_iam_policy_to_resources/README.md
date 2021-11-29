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
