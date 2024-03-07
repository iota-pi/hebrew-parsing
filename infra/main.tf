locals {
  application = "bgf"
  standard_tags = {
    Environment = var.environment
    Application = local.application
  }
  force_api_redeploy = 1
}


# Lambda
resource "aws_lambda_function" "broadcaster" {
  function_name = "bgf-broadcaster"

  handler     = "lambda.handler"
  runtime     = "nodejs20.x"
  memory_size = 512
  timeout     = 120

  s3_bucket        = var.code_bucket
  s3_key           = "bgf/lambda.zip"
  source_code_hash = filebase64sha256("../lambda/build/lambda.zip")

  environment {
    variables = {
      CONNECTION_TABLE_NAME = aws_dynamodb_table.bgf_connections.name
      STATE_TABLE_NAME      = aws_dynamodb_table.bgf_state.name
      CACHE_TABLE_NAME      = aws_dynamodb_table.bgf_cache.name
      CCB_USERNAME          = var.ccb_username
      CCB_PASSWORD          = var.ccb_password
      BGF_PASSWORD_SALT     = var.bgf_password_salt
      BGF_PASSWORD_HASH     = var.bgf_password_hash
    }
  }

  role = aws_iam_role.broadcaster_role.arn
  tags = local.standard_tags
}

resource "aws_iam_role" "broadcaster_role" {
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_policy" "broadcaster_policy" {
  description = "Lambda policy to allow logging"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PutLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": ["arn:aws:logs:*:*:*"]
    },
    {
      "Sid": "ReadWriteCreateTable",
      "Effect": "Allow",
      "Action": [
          "dynamodb:BatchGetItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchWriteItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:CreateTable"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/${aws_dynamodb_table.bgf_connections.name}",
        "arn:aws:dynamodb:*:*:table/${aws_dynamodb_table.bgf_state.name}",
        "arn:aws:dynamodb:*:*:table/${aws_dynamodb_table.bgf_cache.name}"
      ]
    },
    {
      "Sid": "ManageConnections",
      "Effect": "Allow",
      "Action": [
        "execute-api:ManageConnections"
      ],
      "Resource": [
        "${aws_apigatewayv2_api.broadcaster.execution_arn}/*"
      ]
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "broadcaster_policy_attach" {
  role       = aws_iam_role.broadcaster_role.name
  policy_arn = aws_iam_policy.broadcaster_policy.arn
}


# DynamoDB
resource "aws_dynamodb_table" "bgf_connections" {
  name         = "BGFConnections_${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "session"

  attribute {
    name = "session"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = local.standard_tags
}

resource "aws_dynamodb_table" "bgf_state" {
  name         = "BGFState_${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "session"

  attribute {
    name = "session"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = local.standard_tags
}

resource "aws_dynamodb_table" "bgf_cache" {
  name         = "BGFCache_${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "cacheKey"

  attribute {
    name = "cacheKey"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = local.standard_tags
}


# API Gateway
resource "aws_apigatewayv2_api" "broadcaster" {
  name                       = "broadcaster"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"

  tags = local.standard_tags
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.broadcaster.function_name
  principal     = "apigateway.amazonaws.com"

  # The "/*/*" portion grants access from any method on any resource
  # within the API Gateway REST API.
  source_arn = "${aws_apigatewayv2_api.broadcaster.execution_arn}/*/*"
}

resource "aws_apigatewayv2_integration" "broadcaster" {
  api_id           = aws_apigatewayv2_api.broadcaster.id
  integration_type = "AWS_PROXY"

  content_handling_strategy = "CONVERT_TO_TEXT"
  description               = "Broadcaster lambda integration"
  integration_method        = "POST"
  integration_uri           = aws_lambda_function.broadcaster.invoke_arn
  passthrough_behavior      = "WHEN_NO_MATCH"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_apigatewayv2_route" "broadcaster_default" {
  api_id    = aws_apigatewayv2_api.broadcaster.id
  route_key = "$default"

  target = "integrations/${aws_apigatewayv2_integration.broadcaster.id}"
}

resource "aws_apigatewayv2_deployment" "broadcaster" {
  api_id      = aws_apigatewayv2_api.broadcaster.id
  description = "Deployment for broadcaster"

  triggers = {
    redeployment = sha1(join(",", [
      jsonencode(aws_apigatewayv2_integration.broadcaster),
      jsonencode(aws_apigatewayv2_route.broadcaster_default),
      local.force_api_redeploy,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_apigatewayv2_stage" "broadcaster_production" {
  api_id = aws_apigatewayv2_api.broadcaster.id
  name   = "production"

  deployment_id = aws_apigatewayv2_deployment.broadcaster.id

  default_route_settings {
    throttling_burst_limit = 5000
    throttling_rate_limit  = 10000
  }
}

output "invoke_url" {
  value = aws_apigatewayv2_api.broadcaster.api_endpoint
}
