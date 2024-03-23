terraform {
  required_version = ">= 1.1"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
    }
  }

  backend "s3" {
    bucket         = "crosscode-terraform-state"
    key            = "hebrew-parsing/terraform.tfstate"
    region         = "ap-southeast-2"
    dynamodb_table = "CrossCodeTerraformLocking"
  }
}

provider "aws" {
  region = "ap-southeast-2"

  skip_metadata_api_check     = true
  skip_region_validation      = true
  # skip_credentials_validation = true
}

provider "aws" {
  region = "us-east-1"
  alias  = "us_east_1"

  skip_metadata_api_check     = true
  skip_region_validation      = true
  # skip_credentials_validation = true
}
