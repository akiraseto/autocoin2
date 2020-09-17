#!/usr/bin/env bash

ssh -i ~/.ssh/keypair_aws.pem ec2-user@54.150.221.242 <<EOC
docker-compose -f ./autocoin2/docker-compose.yml up -d
EOC
