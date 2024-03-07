locals {
  bucket_name = "bgf-app-${var.environment}"
  compress    = true
  origin_id   = "app_s3_origin"
  domain      = "bgf.campusbiblestudy.org"

  min_ttl     = 0
  default_ttl = 0
  max_ttl     = 600

  allowed_methods = ["GET", "HEAD", "OPTIONS"]
  cached_methods  = ["GET", "HEAD"]

  viewer_protocol_policy = "redirect-to-https"
}

resource "aws_s3_bucket" "app" {
  bucket = local.bucket_name

  tags = local.standard_tags
}

resource "aws_s3_bucket_cors_configuration" "app_cors" {
  bucket = aws_s3_bucket.app.bucket

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
  }
}

resource "aws_s3_bucket_acl" "app_acl" {
  bucket = aws_s3_bucket.app.bucket

  acl = "private"
}

resource "aws_cloudfront_origin_access_identity" "app_oai" {}

resource "aws_cloudfront_distribution" "s3_distribution" {
  origin {
    domain_name = aws_s3_bucket.app.bucket_regional_domain_name
    origin_id   = local.origin_id

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.app_oai.cloudfront_access_identity_path
    }
  }

  aliases = [local.domain]

  enabled         = true
  is_ipv6_enabled = true

  default_root_object = "index.html"

  custom_error_response {
    error_caching_min_ttl = local.min_ttl
    error_code = 404
    response_code = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_caching_min_ttl = local.min_ttl
    error_code = 403
    response_code = 200
    response_page_path = "/index.html"
  }

  default_cache_behavior {
    allowed_methods  = local.allowed_methods
    cached_methods   = local.cached_methods
    target_origin_id = local.origin_id

    forwarded_values {
      query_string = false
      headers      = ["Origin"]

      cookies {
        forward = "none"
      }
    }

    min_ttl                = local.min_ttl
    default_ttl            = local.default_ttl
    max_ttl                = local.max_ttl
    compress               = local.compress
    viewer_protocol_policy = local.viewer_protocol_policy
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = data.aws_acm_certificate.root_cert.arn
    ssl_support_method  = "sni-only"
  }

  tags = local.standard_tags
}

data "aws_acm_certificate" "root_cert" {
  domain   = local.domain
  provider = aws.us_east_1
}

output "app_bucket" {
  value = local.bucket_name
}
