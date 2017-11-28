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
    'apt-get install -y docker-engine \n' +
    'apt-get install -y docker.io \n' +
    'apt-get install -y kubelet kubeadm kubernetes-cni \n' +
    'apt-get install -y s3cmd \n' +
    'echo -e "access_key=' + awsData.accessKeyId + '\nsecret_key=' + awsData.secretAccessKey + '" > /root/.s3cfg \n' +
    'kubeadm token generate  > token.txt \n' +
    '/sbin/ifconfig eth0 | grep \'inet addr\' | cut -d: -f2 | awk \'{print $1}\' > ip.txt \n' +
    's3cmd rb s3://' + awsData.s3BucketName + ' \n' +
    's3cmd mb s3://' + awsData.s3BucketName + ' \n' +
    's3cmd -P put token.txt  s3://' + awsData.s3BucketName + ' \n' +
    's3cmd -P put ip.txt  s3://' + awsData.s3BucketName + ' \n' +
    'wget -O token.txt http://s3.amazonaws.com/' + awsData.s3BucketName + '/token.txt \n' +
    'wget -O ip.txt http://s3.amazonaws.com/' + awsData.s3BucketName + '/ip.txt \n' +
    'kubeadm init --token "$(< token.txt)" \n' +
    'su ubuntu \n' +
    'sudo cp /etc/kubernetes/admin.conf $HOME/ \n' +
    'sudo chown $(id -u):$(id -g) $HOME/admin.conf \n' +
    'export KUBECONFIG=$HOME/admin.conf \n' +
    'echo "export KUBECONFIG=$HOME/admin.conf\" >> ~/.bashrc \n' +
    'sudo source ~/.bashrc \n' +
    'kubectl taint nodes --all node-role.kubernetes.io/master- \n' +
    'kubectl apply -f https://git.io/weave-kube-1.6 \n' +
    'kubectl create -f https://git.io/kube-dashboard \n' +
    'kubectl create serviceaccount heapster --namespace=kube-system \n' +
    'kubectl create clusterrolebinding heapster-role --clusterrole=system:heapster --serviceaccount=kube-system:heapster --namespace=kube-system \n' +
    'kubectl create clusterrolebinding add-on-cluster-admin --clusterrole=cluster-admin --serviceaccount=kube-system:default \n' +
    'git clone https://github.com/ansjin/temp.git \n' +
    'cd temp \n' +
    'kubectl create -f heapster.yaml \n' +
    'kubectl create -f influxdb.yaml \n' +
    'kubectl create -f mongo-controller.yaml \n' +
    'kubectl create -f mongo-service.yaml \n' +
    'kubectl create -f web-deployment.yaml \n' +
    'kubectl expose deployment movie-deployment --port=80 --type=LoadBalancer \n' +
    'kubectl autoscale deployment movie-deployment --min=' + kubeData.scalingParams.numMinPods + ' --max=' + kubeData.scalingParams.numMaxPods + ' --cpu-percent=' + kubeData.scalingParams.cpuPercent + ' \n' +
    'kubectl proxy --address=\'0.0.0.0\' --port=8001 --accept-hosts=\'^*$\'&';

  var scriptKubernetesMaster64 = new Buffer(scriptKubernetesMaster).toString('base64');
  return (scriptKubernetesMaster64);
}
