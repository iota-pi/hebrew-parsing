locals {
  application = "hebrew-parsing"
  standard_tags = {
    Environment = var.environment
    Application = local.application
  }
  force_api_redeploy = 0
}


# Lambda
resource "aws_lambda_function" "hebrew_lambda" {
  function_name = "hebrew-parsing"

  handler     = "lambda.handler"
  runtime     = "nodejs20.x"
  memory_size = 512
  timeout     = 120

  s3_bucket        = var.code_bucket
  s3_key           = "hebrew-parsing/lambda.zip"
  source_code_hash = filebase64sha256("../lambda/build/lambda.zip")

  role = aws_iam_role.hebrew_lambda_role.arn
  tags = local.standard_tags
}

resource "aws_iam_role" "hebrew_lambda_role" {
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

resource "aws_iam_policy" "hebrew_lambda_policy" {
  description = "Lambda policy to allow logging"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3Access",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": ["arn:aws:s3:::${aws_s3_bucket.app.id}/data/*"]
    },
    {
      "Sid": "PutLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": ["arn:aws:logs:*:*:*"]
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "hebrew_lambda_policy_attach" {
  role       = aws_iam_role.hebrew_lambda_role.name
  policy_arn = aws_iam_policy.hebrew_lambda_policy.arn
}


# API Gateway
resource "aws_apigatewayv2_api" "hebrew_lambda" {
  name                       = "hebrew_lambda"
  protocol_type              = "HTTP"

  cors_configuration {
    allow_origins = ["https://${local.domain}"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["*"]
    max_age       = 3000
  }

  tags = local.standard_tags
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.hebrew_lambda.function_name
  principal     = "apigateway.amazonaws.com"

  # The "/*/*" portion grants access from any method on any resource
  # within the API Gateway REST API.
  source_arn = "${aws_apigatewayv2_api.hebrew_lambda.execution_arn}/*/*"
}

resource "aws_apigatewayv2_integration" "hebrew_lambda" {
  api_id           = aws_apigatewayv2_api.hebrew_lambda.id
  integration_type = "AWS_PROXY"

  connection_type           = "INTERNET"
  description               = "hebrew_lambda lambda integration"
  integration_method        = "POST"
  integration_uri           = aws_lambda_function.hebrew_lambda.invoke_arn
  passthrough_behavior      = "WHEN_NO_MATCH"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_apigatewayv2_route" "hebrew_lambda_default" {
  api_id    = aws_apigatewayv2_api.hebrew_lambda.id
  route_key = "GET /{proxy+}"

  target = "integrations/${aws_apigatewayv2_integration.hebrew_lambda.id}"
}

resource "aws_apigatewayv2_stage" "hebrew_lambda_production" {
  api_id = aws_apigatewayv2_api.hebrew_lambda.id
  name   = "production"

  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 5000
    throttling_rate_limit  = 10000
  }
}

output "invoke_url" {
  value = "${aws_apigatewayv2_api.hebrew_lambda.api_endpoint}/${aws_apigatewayv2_stage.hebrew_lambda_production.name}"
}
