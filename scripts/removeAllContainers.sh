#!/bin/sh
docker rm -f $(docker ps -a -q)
