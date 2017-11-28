exports.getMinionScript= function(kubeData, awsData) {
  var scriptKubernetesMinion = '#!/bin/bash \n' +
    'sudo su - \n' +
    'iptables -I INPUT -j ACCEPT \n' +
    'apt-get update && apt-get install -y apt-transport-https \n' +
    'curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add - \n' +
    'cat <<EOF >/etc/apt/sources.list.d/kubernetes.list\n' +
    'deb http://apt.kubernetes.io/ kubernetes-xenial main\n' +
    'EOF\n' +
    'apt-get update\n' +
    'apt-get install -y docker-engine \n' +
    'apt-get install -y docker.io \n' +
    'apt-get install -y kubelet kubeadm kubernetes-cni \n' +
    'apt-get install -y s3cmd \n' +
    'echo -e "access_key=' + awsData.accessKeyId + '\nsecret_key=' + awsData.secretAccessKey + '" > /root/.s3cfg \n' +
    'wget -O token.txt http://s3.amazonaws.com/' + awsData.s3BucketName + '/token.txt \n' +
    'wget -O ip.txt http://s3.amazonaws.com/' + awsData.s3BucketName + '/ip.txt \n' +
    'wget -O discoverytoken.txt http://s3.amazonaws.com/' + awsData.s3BucketName + '/discoverytoken.txt \n' +
    'sudo rm -r /var/lib/kubelet \n' +
    'rm -r /var/lib/kubelet \n' +
    'kubeadm join --token "$(< token.txt)" "$(< ip.txt)":6443 --discovery-token-ca-cert-hash sha256:"$(< discoverytoken.txt)" --skip-preflight-checks \n' +
    'su ubuntu \n' +
    'sudo cp /etc/kubernetes/admin.conf $HOME/ \n' +
    'sudo chown $(id -u):$(id -g) $HOME/admin.conf \n' +
    'export KUBECONFIG=$HOME/admin.conf \n';

  var scriptKubernetesMinion64 = new Buffer(scriptKubernetesMinion).toString('base64');
  return (scriptKubernetesMinion64);
}

