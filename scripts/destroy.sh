#!/bin/bash

pushd infra
  terraform init
  terraform destroy --auto-approve
popd
