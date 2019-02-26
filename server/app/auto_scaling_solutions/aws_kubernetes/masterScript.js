exports.getMasterScript= function(kubeData, awsData) {
  var scriptKubernetesMaster = '#!/bin/bash \n' +
    'sudo su - \n' +
    'iptables -I INPUT -j ACCEPT \n' +
    'apt-get update && apt-get install -y apt-transport-https \n' +
    'curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add - \n' +
    'cat <<EOF >/etc/apt/sources.list.d/kubernetes.list\n' +
    'deb http://apt.kubernetes.io/ kubernetes-xenial main\n' +
    'EOF\n' +
    'apt-get update\n' +
    'curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add - \n' +
    'add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \n' +
    'apt-get update\n' +
    'apt-get install -y docker-ce\n' +
    'systemctl enable docker.service \n' +
    'systemctl start docker.service \n' +
    'apt-get install -y kubelet kubeadm kubernetes-cni \n' +
    'apt-get install -y s3cmd \n' +
    'echo -e "access_key=' + awsData.accessKeyId + '\nsecret_key=' + awsData.secretAccessKey + '" > /root/.s3cfg \n' +
    'url="https://s3.'+ awsData.region +'.amazonaws.com/' + awsData.s3BucketName + '/tokenawskube.txt" \n' +
    'if curl --output /dev/null --silent --head --fail "$url"; then \n' +
    'wget -O tokenawskube.txt http://s3.' + awsData.region + '.amazonaws.com/' + awsData.s3BucketName + '/tokenawskube.txt \n' +
    'wget -O ipawskube.txt http://s3.' + awsData.region + '.amazonaws.com/' + awsData.s3BucketName + '/ipawskube.txt \n' +
    'wget -O discoverytoken.txt http://s3.'+ awsData.region +'.amazonaws.com/' + awsData.s3BucketName + '/discoverytoken.txt \n' +
    'sudo rm -r /var/lib/kubelet \n' +
    'rm -r /var/lib/kubelet \n' +
    'kubeadm join --token "$(< tokenawskube.txt)" "$(< ipawskube.txt)":6443 --discovery-token-ca-cert-hash sha256:"$(< discoverytoken.txt)" \n' +
    'su ubuntu \n' +
    'sudo cp /etc/kubernetes/admin.conf $HOME/ \n' +
    'sudo chown $(id -u):$(id -g) $HOME/admin.conf \n' +
    'export KUBECONFIG=$HOME/admin.conf \n' +
    'else \n' +
    'kubeadm token generate  > tokenawskube.txt \n' +
    '/sbin/ifconfig eth0 | grep \'inet\' | cut -d: -f2 | awk \'{print $2}\' > ipawskube.txt \n' +
    's3cmd rb s3://' + awsData.s3BucketName + ' --region=' + awsData.region + ' \n' +
    's3cmd mb s3://' + awsData.s3BucketName + ' --region=' + awsData.region + ' \n' +
    's3cmd -P put tokenawskube.txt  s3://' + awsData.s3BucketName + ' --region=' + awsData.region + ' \n' +
    's3cmd -P put ipawskube.txt  s3://' + awsData.s3BucketName + ' --region=' + awsData.region + ' \n' +
    'wget -O tokenawskube.txt http://s3.'+ awsData.region +'.amazonaws.com/' + awsData.s3BucketName + '/tokenawskube.txt \n' +
    'wget -O ipawskube.txt http://s3.'+ awsData.region +'.amazonaws.com/' + awsData.s3BucketName + '/ipawskube.txt \n' +
    'sudo rm -r /var/lib/kubelet \n' +
    'rm -r /var/lib/kubelet \n' +
    'kubeadm init --token "$(< tokenawskube.txt)"  --pod-network-cidr=10.244.0.0/16 \n' +
    'openssl x509 -pubkey -in /etc/kubernetes/pki/ca.crt | openssl rsa -pubin -outform der 2> /dev/null | openssl dgst -sha256 -hex > discoverytoken.txt \n' +
    'sed -i \'s/(stdin)= //g\' discoverytoken.txt \n' +
    's3cmd -P put discoverytoken.txt  s3://' + awsData.s3BucketName + ' --region=' + awsData.region + ' \n' +
    'su ubuntu \n' +
    'sudo cp /etc/kubernetes/admin.conf $HOME/ \n' +
    'sudo chown $(id -u):$(id -g) $HOME/admin.conf \n' +
    'export KUBECONFIG=$HOME/admin.conf \n' +
    'echo "export KUBECONFIG=$HOME/admin.conf\" >> ~/.bashrc \n' +
    'sudo source ~/.bashrc \n' +
    'kubectl taint nodes --all node-role.kubernetes.io/master- \n' +
    'kubectl apply -f https://git.io/weave-kube-1.6 \n' +
    'kubectl create serviceaccount heapster --namespace=kube-system \n' +
    'kubectl create clusterrolebinding heapster-role --clusterrole=system:heapster --serviceaccount=kube-system:heapster --namespace=kube-system \n' +
    'kubectl create clusterrolebinding add-on-cluster-admin --clusterrole=cluster-admin --serviceaccount=kube-system:default \n' +
    'git clone https://github.com/ansjin/temp.git \n' +
    'cd temp \n' +
    'kubectl create -f heapster.yaml \n' +
    'kubectl create -f influxdb.yaml \n' +
    'kubectl create -f web-deployment.yaml \n' +
    'kubectl create -f dashboard-admin.yaml \n' +
    'kubectl create -f metrics_config.yaml \n' +
    'kubectl autoscale rc movieapp-deployment --min=' + kubeData.scalingParams.numMinPods + ' --max=' + kubeData.scalingParams.numMaxPods + ' --cpu-percent=' + kubeData.scalingParams.cpuPercent + ' \n' +
    'kubectl create -f https://raw.githubusercontent.com/kubernetes/dashboard/v1.10.1/src/deploy/alternative/kubernetes-dashboard.yaml \n' +
    'sudo fuser -n tcp -k 8001 \n' +
    'kubectl proxy --address=\'0.0.0.0\' --port=8001 --accept-hosts=\'^*$\'& \n' +
    'fi';

  var scriptKubernetesMaster64 = new Buffer(scriptKubernetesMaster).toString('base64');
  return (scriptKubernetesMaster64);
}
