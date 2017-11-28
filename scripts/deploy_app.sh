#!/bin/sh
sudo apt-get update
sudo iptables -I INPUT -j ACCEPT
sudo apt-get install -y docker.io
sudo apt-get install -y curl
curl -L https://github.com/docker/compose/releases/download/1.13.0/docker-compose-`uname -s`-`uname -m` > /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
cd ..
sudo docker-compose up --build &
read -p "Press enter to Exit"
