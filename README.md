# ScaleX : Auto-scaling Performance Measurement Tool (Multilayered Level) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/bca3146fb95f49f4866138b41c1de69b)](https://www.codacy.com?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ansjin/Multi-Layered-Cloud-Applications-Auto-Scaling-Performance-Analysis&amp;utm_campaign=Badge_Grade) [![Build Status](https://travis-ci.com/ansjin/Multi-Layered-Cloud-Applications-Auto-Scaling-Performance-Analysis.svg?token=Ro5JmNzXybzvxeXtg7cx&branch=master)](https://travis-ci.com/ansjin/Multi-Layered-Cloud-Applications-Auto-Scaling-Performance-Analysis) [![Docker Status](https://github.com/ansjin/Multi-Layered-Cloud-Applications-Auto-Scaling-Performance-Analysis/blob/master/Documents/docker-hub.jpg)](https://hub.docker.com/r/ansjin/multi-layered-cloud-applications-auto-scaling-perormance-analysis/)

[![Scale-XYZ](https://github.com/ansjin/APMT/blob/master/Documents/ScaleXYZ1.png)](https://github.com/ansjin/APMT)

Multi-Layered Cloud Applications Auto-Scaling Performance Analysis

This tool will automatically estimate and analyze the different configurations of existing cloud auto-scaling solutions in respect to performance and costs metrics, and presents the user with the best suited configuration for the deployment of application along with the pros and cons of other configurations

## Setup
### Docker Compose
 ```
 1. Clone the Repository
 2. cd into scripts directory
 3. Run the script using the commands
    chmod +x deploy_app.sh
    sudo sh deploy_app.sh
 4. Then use the web browser to visit http://VM_IP:8080 
 
 Ref. Commands: 
sudo mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
kubectl -n kube-system describe secret $(kubectl -n kube-system get secret | awk '/^deployment-controller-token-/{print $1}') | awk '$1=="token:"{print $2}'


http://YOUR_VM_IP:8001/api/v1/namespaces/kube-system/services/http:kubernetes-dashboard:/proxy/


 ```
 ### Docker
 APMT unified into one container:
 
 *docker run -d -p 8080:8080 --name=apmt walki/apmt*
 
 ## Usage
 Once it starts running then you need to create the account or login if it already exists.
 After login you need to first complete your profile which contains some required information like
 1. AWS Secret Key
 2. AWS Token
 3. Security Group ID
 4. VPC group id (for running autoscaling)
 and there are other more.
  
 After completeing the profile, the next task is to use the application deployment procedure. 
 These are of three types: 
 1. AWS autoscaler
 2. Kubernetes Horizontal Pod Autoscaler
 3. Combined version of AWS autoscaler and Kubernetes Horizontal Pod Autoscaler
 
 After selecting any one of them, there would be menu shown with different options.
 The first task is to deploy.
 
 After selecting deploy, there would  some fields to be filled.
 Once those are filled the deployment will take place.
 
 After the deployment is done now the user can generate the load to test the autoscaling deployment.
 As part of load generator there are some default load added. 
 
 Here is the video to show the usage
 (https://s3.amazonaws.com/videoautoscale/apmt.mp4)


## Documentation

All the documents (architecture and other reference documents) are part of documents folder.

## Help and Contibution

Please add issues if you have a question or found a problem. 

Pull requests are welcome too!

Contributions are most welcome. Please message me if you like the idea and want to contribute.
