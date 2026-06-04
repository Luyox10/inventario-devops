terraform {
  backend "s3" {
    bucket         = "inventario-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "inventario-terraform-locks"
  }
}
