exports.getMinionScript= function(kubeData, awsData) {
  var scriptKubernetesMinion = '#!/bin/bash \n' +
    'sudo su - \n' +
    'iptables -I INPUT -j ACCEPT \n' +
    'apt-get update && apt-get install -y apt-transport-https \n' +
    'apt-get update\n' +
    'apt-get install -y docker-engine \n' +
    'apt-get install -y docker.io \n' +
    'docker run -d --net=host --name=nginx nginx';

  var scriptKubernetesMinion64 = new Buffer(scriptKubernetesMinion).toString('base64');
  return (scriptKubernetesMinion64);
}

