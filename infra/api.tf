data "aws_ecr_authorization_token" "token" {}

data "aws_caller_identity" "current" {}

provider "docker" {
  registry_auth {
    address  = "${data.aws_caller_identity.current.account_id}.dkr.ecr.us-east-1.amazonaws.com"
    username = data.aws_ecr_authorization_token.token.user_name
    password = data.aws_ecr_authorization_token.token.password
  }
}

module "lambda_function" {
  source = "terraform-aws-modules/lambda/aws"

  function_name  = "wdc-api"
  create_package = false

  image_uri    = module.docker_image.image_uri
  package_type = "Image"
}

module "docker_image" {
  source = "terraform-aws-modules/lambda/aws//modules/docker-build"

  create_ecr_repo = true
  ecr_repo        = "wdc-api"

  use_image_tag = false

  triggers = {
    redeployment = timestamp()
  }

  source_path = "../api"
}

