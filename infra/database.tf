resource "aws_dynamodb_table" "main_table" {
  name         = "main-table"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  tags = {
    Name = "main-table"
  }
}

# IAM policy for Lambda to access DynamoDB
data "aws_iam_policy_document" "lambda_dynamodb_policy" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query"
    ]
    resources = [aws_dynamodb_table.main_table.arn]
  }
}

resource "aws_iam_policy" "lambda_dynamodb_policy" {
  name        = "lambda-dynamodb-policy"
  description = "IAM policy for Lambda to access DynamoDB"
  policy      = data.aws_iam_policy_document.lambda_dynamodb_policy.json
}

# Attach the policy to the Lambda role
resource "aws_iam_role_policy_attachment" "lambda_dynamodb_attachment" {
  role       = module.lambda_function.lambda_role_name
  policy_arn = aws_iam_policy.lambda_dynamodb_policy.arn
}
