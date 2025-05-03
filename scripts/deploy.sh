#!/bin/bash

pushd infra
  terraform init
  terraform apply --auto-approve

  BUCKET_NAME=$(terraform output -raw s3_bucket_name)
  CLOUDFRONT_DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)
  CLOUDFRONT_DISTRIBUTION_DOMAIN_NAME=$(terraform output -raw cloudfront_distribution_domain_name)
popd

# copy all the files in public to the s3 bucket
aws s3 cp public/ "s3://${BUCKET_NAME}/" --recursive

# invalidate the cloudfront distribution
aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} --paths "/*"

# print the url of the website
echo "https://${CLOUDFRONT_DISTRIBUTION_DOMAIN_NAME}"