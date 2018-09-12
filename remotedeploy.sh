#!/bin/bash
# Add the ScaleX module to an existing container
# Creates a ScaleX container if it doesn't exist already
if [ -z $1 ] || [ -z $2 ] || [ -z $3 ]; then
  printf 'Not enough arguments provided!\n\n'
  printf 'Usage: ./remotedeploy.sh REMOTE SCALEXPORT SCALEXCONTAINERNAME\n\n'
  printf 'Example: ./remotedeploy.sh root@example.org 8080 ScaleX\n'
  exit 1;
fi
REMOTE=$1
SCALEXPORT=$2
SCALEXCONTAINERNAME=$3
ssh $REMOTE << EOF
  if ! docker start '$SCALEXCONTAINERNAME'; then docker run -d -p '$SCALEXPORT':8080 --name='$SCALEXCONTAINERNAME' walki/apmt; fi
  docker exec '$SCALEXCONTAINERNAME' bash -c 'if cd /usr/src/apmt/.git; then cd /usr/src/apmt/ && git fetch --all && git reset --hard origin/master && cp -a /usr/src/apmt/server/. /usr/src/apmt/; else cd /usr/src/ && git clone https://github.com/CM2Walki/ScaleX && mkdir -p /data/db && mkdir -p /usr/src/apmt && cp -a /usr/src/apmt/server/. /usr/src/apmt/ && cd /usr/src/apmt && npm install; fi'
  docker restart '$SCALEXCONTAINERNAME'
  printf 'Deployment script done.\n'
EOF
