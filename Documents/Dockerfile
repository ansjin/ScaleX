FROM debian:stretch
LABEL maintainer="walentinlamonos@gmail.com"

RUN apt-get update && \ 
	apt-get install -y \
	curl \
	git \
	build-essential \
	libssl-dev \
	gnupg gnupg1 gnupg2 \
	mongodb && \
	curl -sL https://deb.nodesource.com/setup_6.x | bash - && \
	apt-get install -y nodejs && \
	apt-get -y upgrade && \
	apt-get clean autoclean && \
	apt-get autoremove -y && \
	rm -rf /var/lib/{apt,dpkg,cache,log}/

WORKDIR /usr/src/apmt

RUN cd /root/ && \
	git clone https://github.com/ansjin/APMT && \
	mkdir -p /data/db && \
	mkdir -p /usr/src/apmt && \
	cp -a /root/APMT/server/. /usr/src/apmt/ && \
	cd /usr/src/apmt && npm install

VOLUME /data/db

ENTRYPOINT node index.js & /usr/bin/mongod

EXPOSE 8080
