#!/usr/bin/env bash

ssh -i ~/.ssh/[pem file] [AWS EC2のuser]@[IPアドレス] <<EOC
docker-compose -f ./autocoin2/docker-compose.yml down
EOC
