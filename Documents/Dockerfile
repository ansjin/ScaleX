FROM debian:stretch
LABEL maintainer="walentinlamonos@gmail.com"

RUN apt-get update && apt-get install -y \
	git \
	docker.io \
	curl && \
	apt-get -y upgrade && \
	apt-get clean autoclean && \
	apt-get autoremove -y && \
	rm -rf /var/lib/{apt,dpkg,cache,log}/

RUN iptables -I INPUT -j ACCEPT && \
	curl -L https://github.com/docker/compose/releases/download/1.13.0/docker-compose-`uname -s`-`uname -m` > /usr/local/bin/docker-compose && \
	chmod +x /usr/local/bin/docker-compose && \
	git clone https://github.com/ansjin/APMT

ENTRYPOINT cd /root/APMT && docker-compose up --build

EXPOSE 8080
