#!/bin/sh
# Make sure script is executed as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run using root (sudo)!"
  exit
fi

apt-get update
iptables -I INPUT -j ACCEPT
apt-get install -y docker.io curl
curl -L https://github.com/docker/compose/releases/download/1.13.0/docker-compose-`uname -s`-`uname -m` > /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
cd ..
docker-compose up --build &
read -p "Press enter to Exit"
