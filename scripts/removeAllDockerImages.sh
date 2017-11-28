#!/bin/sh
docker rmi $(docker images -q)