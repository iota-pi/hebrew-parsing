locals {
  bucket_name = "hebrew-parsing-${var.environment}"
  compress    = true
  origin_id   = "app_s3_origin"

  min_ttl     = 86400
  default_ttl = 86400
  max_ttl     = 604800

  allowed_methods = ["GET", "HEAD", "OPTIONS"]
  cached_methods  = ["GET", "HEAD"]

  viewer_protocol_policy = "redirect-to-https"
}

resource "aws_s3_bucket" "app" {
  bucket = local.bucket_name
}

resource "aws_s3_bucket_cors_configuration" "app_cors" {
  bucket = aws_s3_bucket.app.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
  }
}

resource "aws_s3_bucket_acl" "app_acl" {
  bucket = aws_s3_bucket.app.id

  acl = "private"

  depends_on = [aws_s3_bucket_ownership_controls.app_bucket_acl_ownership]
}

resource "aws_s3_bucket_ownership_controls" "app_bucket_acl_ownership" {
  bucket = aws_s3_bucket.app.id
  rule {
    object_ownership = "ObjectWriter"
  }
}

resource "aws_s3_bucket_public_access_block" "app_public_access" {
  bucket = aws_s3_bucket.app.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
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
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
  }

  custom_error_response {
    error_caching_min_ttl = local.min_ttl
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
  }

  default_cache_behavior {
    allowed_methods  = local.allowed_methods
    cached_methods   = local.cached_methods
    target_origin_id = local.origin_id
    cache_policy_id  = aws_cloudfront_cache_policy.hebrew_parsing_cache_policy.id

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
    acm_certificate_arn = aws_acm_certificate.hebrew_cert.arn
    ssl_support_method  = "sni-only"
  }
}

resource "aws_cloudfront_cache_policy" "hebrew_parsing_cache_policy" {
  name = "hebrew_parsing_cache_policy"

  min_ttl     = local.min_ttl
  max_ttl     = local.max_ttl
  default_ttl = local.default_ttl

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

output "app_bucket" {
  value = local.bucket_name
}
