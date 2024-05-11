variable "environment" {
  type    = string
  default = "production"
}

variable "root_domain" {
  type    = string
  default = "cross-code.org"
}

variable "subdomain" {
  type    = string
  default = "hebrew"
}

variable "cloudflare_zone_id" {
  type = string
}
