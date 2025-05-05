const serverlessExpress = require("@codegenie/serverless-express");

const express = require("express");
const app = express();

app.get("/api", (req, res) => {
  res.send("Hello, world!");
});

app.get("/api/testing", (req, res) => {
  res.send("testing, world!");
});

app.use((req, res) => {
  res.status(404).send("Not Found");
});

exports.handler = serverlessExpress({ app });
