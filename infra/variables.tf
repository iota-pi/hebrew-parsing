variable "environment" {
  type    = string
  default = "production"
}

variable "code_bucket" {
  type    = string
  default = "crosscode-lambdas"
}

variable "ccb_username" {
  type = string
}

variable "ccb_password" {
  type      = string
  sensitive = true
}

variable "bgf_password_salt" {
  type      = string
  sensitive = true
}

variable "bgf_password_hash" {
  type      = string
  sensitive = true
}
