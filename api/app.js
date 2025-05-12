const serverlessExpress = require("@codegenie/serverless-express");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");
const cors = require("cors");

const express = require("express");
const app = express();

app.use(cors());

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

app.get("/api/nodes", async (req, res) => {
  try {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: "nodes",
        sk: "nodes",
      },
    });

    const response = await docClient.send(command);
    res.json(response.Item || {});
  } catch (error) {
    console.error("Error fetching from DynamoDB:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/nodes", async (req, res) => {
  try {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: "nodes",
        sk: "nodes",
        ...req.body,
      },
    });

    await docClient.send(command);
    res.json({ message: "Record updated successfully" });
  } catch (error) {
    console.error("Error updating DynamoDB:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.use((req, res) => {
  res.status(404).send("Not Found");
});

exports.handler = serverlessExpress({ app });
