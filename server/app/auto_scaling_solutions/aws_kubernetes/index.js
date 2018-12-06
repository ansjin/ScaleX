const Q                                         = require('q');
const http                                      = require('http');
const request                                   = require('request');
const AWS                                       = require('aws-sdk');
const awsAutoscaleKubernetesMongoFunctions      = require('./awsAutoscaleKubernetesMongoFunctions');
const kubeMaster                                = require('./masterScript');

exports.describeInstances = function(awsData,req, res) {
  var ec2 = new AWS.EC2({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2016-11-15'});
  var cloudwatch = new AWS.CloudWatch({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2016-11-15'});
  var autoscaling = new AWS.AutoScaling({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2016-11-15'});
  var elbv2 = new AWS.ELBv2({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2015-12-01'});
  var deferred = Q.defer();
  var params = {
    DryRun: false
  };

  var titlesArr = [];
  titlesArr.push({"title": "Name"});
  titlesArr.push({"title": "InstanceId"});
  titlesArr.push({"title": "ImageId"});
  titlesArr.push({"title": "PublicIpAddress"});
  titlesArr.push({"title": "LaunchTime"});
  titlesArr.push({"title": "State"});

  var awsArr = [];
  if(ec2) {
    ec2.describeInstances(params, function (err, data) {
      if (err) {
        console.log("Error", err.stack);
        var dataAll = [
          {
            "columns": titlesArr,
            "data": awsArr
          }
        ];
        deferred.resolve(dataAll);
      } else {
        instancesArr = data.Reservations;
        instancesArr.forEach(function (instance) {
          var row = []
          if (instance["Instances"][0]["Tags"][0])
            row.push(instance["Instances"][0]["Tags"][0]["Value"]);
          else
            row.push("None");
          row.push(instance["Instances"][0]["InstanceId"]);
          row.push(instance["Instances"][0]["ImageId"]);
          row.push(instance["Instances"][0]["PublicIpAddress"]);
          row.push(instance["Instances"][0]["LaunchTime"]);
          row.push(instance["Instances"][0]["State"]["Name"]);
          awsArr.push(row);
        });
        var dataAll = [{
          "columns": titlesArr,
          "data": awsArr
        }
        ];
        deferred.resolve(dataAll);
      }
    });
  }
  else {
    var dataAll = [{
      "columns": titlesArr,
      "data": awsArr
    }
    ];
    deferred.resolve(dataAll);
  }
  return deferred.promise;
}
exports.deployAutoscaler = function(username, awsDeployData,kubeData, awsData,req, res) {
  var ec2 = new AWS.EC2({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2016-11-15'});
  var cloudwatch = new AWS.CloudWatch({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2016-11-15'});
  var autoscaling = new AWS.AutoScaling({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2016-11-15'});
  var elbv2 = new AWS.ELBv2({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2015-12-01'});
  var deferred = Q.defer();
  try {
    var paramsLaunchConfiguration = {
      ImageId: awsDeployData.image,
      InstanceType: awsDeployData.launchConfig.typeInst,
      InstanceMonitoring: {
        Enabled: true
      },
      SecurityGroups: awsData.securityId,
      LaunchConfigurationName: awsDeployData.launchConfig.name,
      KeyName: awsData.awsKeyName,
      UserData: kubeMaster.getMasterScript(kubeData, awsData)
    };

    var paramsTargetGroup = {
      Name: awsDeployData.targetGroupConfig.name, /* required */
      Port: 80, /* required */
      Protocol: 'HTTP', /* required */
      VpcId: '',//'vpc-7552e212', /* required */
      Matcher: {
        HttpCode: '200' /* required */
      },
    };
    var paramsLoadBalancer = {
      Name: awsDeployData.loadBal.name, /* required */
      Subnets: awsDeployData.loadBal.subnetsArr,
      //[ /* required */
      //'subnet-fd25cdb4',
      //'subnet-d92dfbbe'
      /* more items */
      //],
      Tags: [
        {
          Key: 'Name', /* required */
          Value: 'LoadBal'
        },
        /* more items */
      ],
      SecurityGroups: awsData.securityId,
    };
    var paramsListener = {
      DefaultActions: [/* required */
        {
          TargetGroupArn: '', /* required */
          Type: 'forward' /* required */
        },
        /* more items */
      ],
      LoadBalancerArn: '', /* required */
      Port: 80, /* required */
      Protocol: 'HTTP', /* required */
    };
    var paramsAutoScaler = {
      AutoScalingGroupName: awsDeployData.autoScale.name,
      LaunchConfigurationName: awsDeployData.launchConfig.name,
      MaxSize: 1,
      MinSize: 1,
      VPCZoneIdentifier: awsDeployData.autoScale.subnet,//"subnet-fd25cdb4",
      TargetGroupARNs: [],
      TerminationPolicies: [
        'NewestInstance'
      ]
    };
    var paramsAutoScalingMetricsEnable = {
      AutoScalingGroupName: awsDeployData.autoScale.name,
      Granularity: "1Minute"
    };
    var paramsAutoScalingUpPolicy = {
      AdjustmentType: awsDeployData.autoScale.upPolicy.adjustmentType,//'ExactCapacity', /* required */
      AutoScalingGroupName: awsDeployData.autoScale.name, /* required */
      PolicyName: awsDeployData.autoScale.upPolicy.name, /* required */
      Cooldown: 0,
      EstimatedInstanceWarmup: 0,
      MetricAggregationType: awsDeployData.autoScale.upPolicy.metricAggregationType,//'Average',
      // MinAdjustmentMagnitude: 1,
      PolicyType: awsDeployData.autoScale.upPolicy.policyType,//'StepScaling',
      StepAdjustments: [
        {
          ScalingAdjustment: awsDeployData.autoScale.upPolicy.scalingAdjustment, /* required */
          MetricIntervalLowerBound: 0.0,
          //MetricIntervalUpperBound: 0.0
        },
        /* more items */
      ]
    };
    var paramsAutoScalingDownPolicy = {
      AdjustmentType: awsDeployData.autoScale.downPolicy.adjustmentType,//'ExactCapacity', /* required */
      AutoScalingGroupName: awsDeployData.autoScale.name, /* required */
      PolicyName: awsDeployData.autoScale.downPolicy.name, /* required */
      Cooldown: 0,
      EstimatedInstanceWarmup: 0,
      MetricAggregationType: awsDeployData.autoScale.downPolicy.metricAggregationType,//'Average',
      // MinAdjustmentMagnitude: 1,
      PolicyType: awsDeployData.autoScale.downPolicy.policyType,//'StepScaling',
      StepAdjustments: [
        {
          ScalingAdjustment: awsDeployData.autoScale.downPolicy.scalingAdjustment, /* required */
          //MetricIntervalLowerBound: 0.0,
          MetricIntervalUpperBound: 0.0
        },
        /* more items */
      ]
    };
    var paramsAutoScalingUpPolicyAlarm = {
      AlarmName: awsDeployData.autoScale.upPolicy.alarm.name, /* required */
      ComparisonOperator: awsDeployData.autoScale.upPolicy.alarm.ComparisonOperator,//'GreaterThanOrEqualToThreshold', /* required */
      EvaluationPeriods: 2, /* required */
      MetricName: awsDeployData.autoScale.upPolicy.alarm.metricName,//'CPUUtilization', /* required */
      Namespace: 'AWS/EC2', /* required */
      Period: 300, /* required */
      AlarmActions: [],
      Dimensions: [
        {
          Name: 'AutoScalingGroupName', /* required */
          Value: awsDeployData.autoScale.name /* required */
        },
        /* more items */
      ],
      Threshold: awsDeployData.autoScale.upPolicy.alarm.threshold, /* required */
      ActionsEnabled: true,
      AlarmDescription: awsDeployData.autoScale.upPolicy.alarm.description,//'Increase CPU utilization above 70',
      Statistic: awsDeployData.autoScale.upPolicy.alarm.Statistic,//'Average',
      Unit: awsDeployData.autoScale.upPolicy.alarm.Unit//'Percent'
    };
    var paramsAutoScalingDownPolicyAlarm = {
      AlarmName: awsDeployData.autoScale.downPolicy.alarm.name, /* required */
      ComparisonOperator: awsDeployData.autoScale.downPolicy.alarm.ComparisonOperator,//'GreaterThanOrEqualToThreshold', /* required */
      EvaluationPeriods: 2, /* required */
      MetricName: awsDeployData.autoScale.downPolicy.alarm.metricName, /* required */
      Namespace: 'AWS/EC2', /* required */
      Period: 300, /* required */
      AlarmActions: [],
      Dimensions: [
        {
          Name: 'AutoScalingGroupName', /* required */
          Value: awsDeployData.autoScale.name /* required */
        },
        /* more items */
      ],
      Threshold: awsDeployData.autoScale.downPolicy.alarm.threshold, /* required */
      ActionsEnabled: true,
      AlarmDescription: awsDeployData.autoScale.downPolicy.alarm.description,//'Increase CPU utilization above 70',
      Statistic: awsDeployData.autoScale.downPolicy.alarm.Statistic,//'Average',
      Unit: awsDeployData.autoScale.downPolicy.alarm.Unit//'Percent'
    };
  }catch(err){
    console.log(err);
  }

  elbv2.createLoadBalancer(paramsLoadBalancer, function(err, loadBalancerData) {
    if (err) console.log(err, err.stack); // an error occurred
    else
    {
      console.log(loadBalancerData);
      paramsTargetGroup.VpcId = loadBalancerData.LoadBalancers[0].VpcId;
      paramsListener.LoadBalancerArn= loadBalancerData.LoadBalancers[0].LoadBalancerArn;
      elbv2.createTargetGroup(paramsTargetGroup, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else
        {
          console.log(data);

          paramsListener.DefaultActions[0].TargetGroupArn= data.TargetGroups[0].TargetGroupArn;
          paramsAutoScaler.TargetGroupARNs.push(data.TargetGroups[0].TargetGroupArn);

          elbv2.createListener(paramsListener, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else
            {
              autoscaling.createLaunchConfiguration(paramsLaunchConfiguration, function (err, data) {
                if (err) console.log(err, err.stack); // an error occurred
                else {
                  // successful response
                  console.log(data);
                  autoscaling.createAutoScalingGroup(paramsAutoScaler, function (err, data) {
                    if (err) console.log(err, err.stack); // an error occurred
                    else {
                      console.log(data);
                      setTimeout(function(){

                        var params = {
                          AutoScalingGroupName: awsDeployData.autoScale.name,
                          MaxSize: awsDeployData.autoScale.maxInst,
                          MinSize: awsDeployData.autoScale.minInst
                        };
                        autoscaling.updateAutoScalingGroup(params, function(err, data) {
                          if (err) console.log(err, err.stack); // an error occurred
                          else     console.log(data);           // successful response
                        });

                      }, 140000);

                      var DescribbeAutoScalingarams = {
                        InstanceIds: [ ]
                      };
                      setTimeout(function() {
                        autoscaling.describeAutoScalingInstances(DescribbeAutoScalingarams, function (err, data) {
                          if (err) console.log(err, err.stack); // an error occurred
                          else {

                            console.log(data);
                            var masterInstId = data.AutoScalingInstances[0].InstanceId;

                            var paramMasterDescription = {
                              DryRun: false,
                              InstanceIds: [masterInstId]
                            };
                            ec2.describeInstances(paramMasterDescription, function (err, data) {
                              if (err) {
                                console.log("Error", err.stack);
                              } else {
                                var awsMasterNode = [];
                                var instance = data.Reservations[0];
                                var serviceURL = "";
                                var urlService = "http://" + instance["Instances"][0]["PublicIpAddress"] + ":8001/api/v1/services/";
                                var max = 200;
                                var retry = (function () {
                                  var count = 0;
                                  return function (next) {
                                    console.log(urlService);
                                    request({
                                      url: urlService,
                                      method: "GET",
                                      json: true,
                                      headers: {
                                        "content-type": "application/json",
                                      }
                                    }, function (error, response, body) {
                                      if (error || response.statusCode !== 200 || body.items == "undefined") {
                                        console.log('fail');

                                        if (count++ < max) {
                                          return setTimeout(function () {
                                            retry(next);
                                          }, 2500);
                                        } else {
                                          return next(new Error('max retries reached'));
                                        }
                                      }
                                      console.log('success');
                                      next(null, body);
                                    });
                                  }
                                })();
                                var portNumber = '';
                                retry(function (err, body) {
                                  var servicesArr = body.items;
                                  for (i = 0; i < servicesArr.length; i++) {
                                    if (servicesArr[i]["metadata"]['name'].indexOf(kubeData.application.name) !== -1) {
                                      portNumber = servicesArr[i]["spec"]["ports"][0].nodePort;
                                      serviceURL = url = "http://" + instance["Instances"][0]["PublicIpAddress"] + ":" + portNumber + "/api/test";
                                      console.log(serviceURL);
                                      var paramsTargetGroup = {
                                        Name: awsDeployData.targetGroupConfig.name +'main', /* required */
                                        Port: portNumber, /* required */
                                        Protocol: 'HTTP', /* required */
                                        VpcId: '',//'vpc-7552e212', /* required */
                                        Matcher: {
                                          HttpCode: '200' /* required */
                                        },
                                      };
                                      var paramsListener = {
                                        DefaultActions: [/* required */
                                          {
                                            TargetGroupArn: '', /* required */
                                            Type: 'forward' /* required */
                                          },
                                          /* more items */
                                        ],
                                        LoadBalancerArn: '', /* required */
                                        Port: portNumber, /* required */
                                        Protocol: 'HTTP', /* required */
                                      };

                                      paramsTargetGroup.VpcId = loadBalancerData.LoadBalancers[0].VpcId;
                                      paramsListener.LoadBalancerArn = loadBalancerData.LoadBalancers[0].LoadBalancerArn;
                                      elbv2.createTargetGroup(paramsTargetGroup, function (err, TGdata) {
                                        if (err) console.log(err, err.stack); // an error occurred
                                        else {
                                          console.log(data);

                                          paramsListener.DefaultActions[0].TargetGroupArn = TGdata.TargetGroups[0].TargetGroupArn;
                                          elbv2.createListener(paramsListener, function (err, data) {
                                            if (err) console.log(err, err.stack); // an error occurred
                                            else {
                                              var params = {
                                                AutoScalingGroupName: awsDeployData.autoScale.name,
                                                TargetGroupARNs: [TGdata.TargetGroups[0].TargetGroupArn]
                                              };
                                              autoscaling.attachLoadBalancerTargetGroups(params, function (err, data) {
                                                if (err) console.log(err, err.stack); // an error occurred
                                                else     console.log(data);           // successful response
                                              });
                                              var ipConfigData = {
                                                "Masterip": instance["Instances"][0]["PublicIpAddress"],
                                                "serviceURL": serviceURL,
                                                "listener": paramsListener,
                                                "target": paramsTargetGroup,
                                                "LoadBalIp": loadBalancerData.LoadBalancers[0].DNSName + ":" + portNumber
                                              }
                                              awsAutoscaleKubernetesMongoFunctions.addFurtherConfigData(username, ipConfigData)
                                                .then(function (added) {
                                                  if (added) {
                                                    console.log("added ipconfig informtion");
                                                  }
                                                  else {
                                                    console.log("user not found");
                                                  }
                                                });
                                            }
                                          });
                                        }
                                      });
                                      break;
                                    }
                                  }
                                });
                              }
                            });
                          }
                        });
                      },140000);
                      setTimeout(function(){

                        autoscaling.enableMetricsCollection(paramsAutoScalingMetricsEnable, function(err, data) {
                          if (err) console.log(err, err.stack); // an error occurred
                          else     console.log(data);           // successful response
                        });

                        autoscaling.putScalingPolicy(paramsAutoScalingUpPolicy, function (err, data) {
                          if (err) console.log(err, err.stack); // an error occurred
                          else {
                            console.log(data.PolicyARN);
                            paramsAutoScalingUpPolicyAlarm.AlarmActions.push(data.PolicyARN);
                            cloudwatch.putMetricAlarm(paramsAutoScalingUpPolicyAlarm, function (err, data) {
                              if (err) console.log(err, err.stack); // an error occurred
                              else {
                                console.log(data);
                              }
                            });
                          }// successful response
                        });
                      }, 4000);
                      setTimeout(function(){
                        autoscaling.putScalingPolicy(paramsAutoScalingDownPolicy, function (err, data) {
                          if (err) console.log(err, err.stack); // an error occurred
                          else {
                            console.log(data.PolicyARN);
                            paramsAutoScalingDownPolicyAlarm.AlarmActions.push(data.PolicyARN);
                            cloudwatch.putMetricAlarm(paramsAutoScalingDownPolicyAlarm, function (err, data) {
                              if (err) console.log(err, err.stack); // an error occurred
                              else {
                                console.log(data);
                                var awsAutoScaleData = {
                                  "launchConfig":paramsLaunchConfiguration,
                                  "targetGroup": paramsTargetGroup,
                                  "loadBal": paramsLoadBalancer,
                                  "listener": paramsListener,
                                  "scaling": paramsAutoScaler,
                                  "scalingPolicy":{
                                    "up":{
                                      "policy":paramsAutoScalingUpPolicy,
                                      "alarm":paramsAutoScalingUpPolicyAlarm
                                    },
                                    "down":{
                                      "policy":paramsAutoScalingDownPolicy,
                                      "alarm":paramsAutoScalingDownPolicyAlarm
                                    }
                                  },
                                  "s3bucketInfo":{
                                    "name": awsData.s3BucketName
                                  }
                                };
                                awsAutoscaleKubernetesMongoFunctions.addConfigData(username,awsAutoScaleData)
                                  .then(function (added) {
                                    if (added) {
                                      console.log("added awsAutoScaleData informtion");
                                    }
                                    else {
                                      console.log("user not found");
                                    }
                                  });
                              }
                            });
                          }// successful response
                        });
                      }, 8000);
                    }                     // successful response
                  });
                }
              })
            }           // successful response
          });
        }           // successful response
      });
    }           // successful response
  });
  res.render('awskubernetes/success', {
    layout: '../awskubernetes/layouts/main',
    user: username,
    dataForm: req.body,
    dataClient: "Request Sent to Server for Deployment"
  });
}
exports.terminateAutoScale = function(awsData,username,req, res) {
  try {
    var ec2 = new AWS.EC2({
      accessKeyId: awsData.accessKeyId,
      secretAccessKey: awsData.secretAccessKey,
      region: awsData.region,
      apiVersion: '2016-11-15'
    });
    var cloudwatch = new AWS.CloudWatch({
      accessKeyId: awsData.accessKeyId,
      secretAccessKey: awsData.secretAccessKey,
      region: awsData.region,
      apiVersion: '2016-11-15'
    });
    var autoscaling = new AWS.AutoScaling({
      accessKeyId: awsData.accessKeyId,
      secretAccessKey: awsData.secretAccessKey,
      region: awsData.region,
      apiVersion: '2016-11-15'
    });
    var elbv2 = new AWS.ELBv2({
      accessKeyId: awsData.accessKeyId,
      secretAccessKey: awsData.secretAccessKey,
      region: awsData.region,
      apiVersion: '2015-12-01'
    });
    var s3 = new AWS.S3({
      accessKeyId: awsData.accessKeyId,
      secretAccessKey: awsData.secretAccessKey,
      region: awsData.region,
      apiVersion: '2015-12-01'
    });
    var deferred = Q.defer();

    awsAutoscaleKubernetesMongoFunctions.getAwsAutoScaleInfo(username)
      .then(function (awsDeployInfo) {
        if (awsDeployInfo) {
          try{
            var params = {
              Bucket: awsDeployInfo.awsKubeAutoScaleConfig.s3bucketInfo.name
            };
            s3.listObjects(params, function(err, data) {
              if (err) console.log(err, err.stack); // an error occurred
              else {
                console.log(data);
                var keyArr = [];
                for(i=0;i<data.Contents.length;i++) {

                  keyArr.push({"Key":data.Contents[i].Key});
                }
                var params = {
                  Bucket: awsDeployInfo.awsKubeAutoScaleConfig.s3bucketInfo.name,
                  Delete: {
                    Objects: keyArr,
                    Quiet: false
                  }
                };
                s3.deleteObjects(params, function(err, data) {
                  if (err) console.log(err, err.stack); // an error occurred
                  else{
                    console.log(data);           // successful response
                    var paramsBucket = {
                      Bucket: awsDeployInfo.awsKubeAutoScaleConfig.s3bucketInfo.name
                    };
                    s3.deleteBucket(paramsBucket, function (err, data) {
                      if (err) console.log(err, err.stack); // an error occurred
                      else console.log(data);           // successful response
                    });
                  }
                });
              }
            });
          }catch(err){console.log(err);}

          var paramsAutoscaling = {
            AutoScalingGroupName: awsDeployInfo.awsKubeAutoScaleConfig.scaling.AutoScalingGroupName,
            ForceDelete: true
          };
          autoscaling.deleteAutoScalingGroup(paramsAutoscaling, function (err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else     console.log(data);           // successful response
          });
          setTimeout(function () {
            var paramsLaunchConfig = {
              LaunchConfigurationName: awsDeployInfo.awsKubeAutoScaleConfig.scaling.LaunchConfigurationName
            };
            autoscaling.deleteLaunchConfiguration(paramsLaunchConfig, function (err, data) {
              if (err) console.log(err, err.stack); // an error occurred
              else     console.log(data);           // successful response
            });
          }, 3000);

          var paramsLoadBal = {
            LoadBalancerArn: awsDeployInfo.awsKubeAutoScaleConfig.listener.LoadBalancerArn /* required */
          };
          elbv2.deleteLoadBalancer(paramsLoadBal, function (err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else     console.log(data);           // successful response
          });
          setTimeout(function () {
            var paramsTargetGroup = {
              TargetGroupArn: awsDeployInfo.awsKubeAutoScaleConfig.listener.DefaultActions[0].TargetGroupArn /* required */
            };
            elbv2.deleteTargetGroup(paramsTargetGroup, function (err, data) {
              if (err) console.log(err, err.stack); // an error occurred
              else     console.log(data);           // successful response
            });
          }, 60000);
          setTimeout(function () {
            var paramsTargetGroup = {
              TargetGroupArn: awsDeployInfo.ipConfig.listener.DefaultActions[0].TargetGroupArn /* required */
            };
            elbv2.deleteTargetGroup(paramsTargetGroup, function (err, data) {
              if (err) console.log(err, err.stack); // an error occurred
              else     console.log(data);           // successful response
            });
          }, 60000);

          res.render('awskubernetes/success', {
            layout: '../awskubernetes/layouts/main',
            user: username,
            dataForm: req.body,
            dataClient: "Request Sent for Terminatio"
          });
        }
        else {
          res.render('awskubernetes/success', {
            layout: '../awskubernetes/layouts/main',
            user: username,
            dataForm: req.body,
            dataClient: "No Information Found To Terminate"
          });
        }
      });
  }catch(err) {console.log(err);}
}
exports.getCurrentData = function(awsData,username,req,res) {
  var ec2 = new AWS.EC2({
    accessKeyId: awsData.accessKeyId,
    secretAccessKey: awsData.secretAccessKey,
    region: awsData.region,
    apiVersion: '2016-11-15'
  });
  var cloudwatch = new AWS.CloudWatch({
    accessKeyId: awsData.accessKeyId,
    secretAccessKey: awsData.secretAccessKey,
    region: awsData.region,
    apiVersion: '2016-11-15'
  });
  var autoscaling = new AWS.AutoScaling({
    accessKeyId: awsData.accessKeyId,
    secretAccessKey: awsData.secretAccessKey,
    region: awsData.region,
    apiVersion: '2016-11-15'
  });
  var elbv2 = new AWS.ELBv2({
    accessKeyId: awsData.accessKeyId,
    secretAccessKey: awsData.secretAccessKey,
    region: awsData.region,
    apiVersion: '2015-12-01'
  });

  awsAutoscaleKubernetesMongoFunctions.getAwsAutoScaleInfo(username)
    .then(function (awsDeployInfo) {
      if (awsDeployInfo) {
          var d = new Date();
          var MS_PER_MINUTE = 60000;
          var params = {
            EndTime: new Date, /* required */
            MetricName: 'GroupTotalInstances', /* required */
            Namespace: 'AWS/AutoScaling', /* required */
            Period: 60, /* required */
            StartTime: new Date(d.getTime() - 60 * MS_PER_MINUTE), /* required */
            Dimensions: [
              {
                Name: 'AutoScalingGroupName', /* required */
                Value: awsDeployInfo.awsKubeAutoScaleConfig.scaling.AutoScalingGroupName/* required */
              },
            ],
            Statistics: [
              "Average"
              /* more items */
            ]
           // Unit: 'Count'
          };
          //console.log(params);
        cloudwatch.getMetricStatistics(params, function (err, data) {
          if (err) console.log(err, err.stack); // an error occurred
          else {
            var dataAll = {
              "instances": data,
              "cpuUtilization": '',
              "desiredInstances": '',
              "inserviceInstances": '',
              "totalRequestCount": '',
              "HTTPCode5XXCountELB": '',
              "HTTPCode4XXCountELB": '',
              "HTTPCode2XXCount": '',
              "HTTPCode3XXCount": '',
              "HTTPCode4XXCount": '',
              "HTTPCode5XXCount": '',
              "instanceType": awsDeployInfo.awsKubeAutoScaleConfig.launchConfig.InstanceType,
              "latency": '',
              "responseTime": ''
            };
            var params = {
              EndTime: new Date, /* required */
              MetricName: 'CPUUtilization', /* required */
              Namespace: 'AWS/EC2', /* required */
              Period: 60, /* required */
              StartTime: new Date(d.getTime() - 60 * MS_PER_MINUTE), /* required */
              Dimensions: [
                {
                  Name: 'AutoScalingGroupName', /* required */
                  Value: awsDeployInfo.awsKubeAutoScaleConfig.scaling.AutoScalingGroupName/* required */
                },
                /* more items */
              ],
              Statistics: [
                "Average"
                /* more items */
              ]
              // Unit: 'Count'
            };
            //console.log(params);
            cloudwatch.getMetricStatistics(params, function (err, data) {
              if (err) console.log(err, err.stack); // an error occurred
              else {
                // successful response
                dataAll.cpuUtilization = data;
                var params = {
                  EndTime: new Date, /* required */
                  MetricName: 'GroupDesiredCapacity', /* required */
                  Namespace: 'AWS/AutoScaling', /* required */
                  Period: 60, /* required */
                  StartTime: new Date(d.getTime() - 60 * MS_PER_MINUTE), /* required */
                  Dimensions: [
                    {
                      Name: 'AutoScalingGroupName', /* required */
                      Value: awsDeployInfo.awsKubeAutoScaleConfig.scaling.AutoScalingGroupName/* required */
                    },
                    /* more items */
                  ],
                  Statistics: [
                    "Average"
                    /* more items */
                  ]
                  // Unit: 'Count'
                };
                //console.log(params);
                cloudwatch.getMetricStatistics(params, function (err, data) {
                  if (err) console.log(err, err.stack); // an error occurred
                  else {
                    // successful response
                    dataAll.desiredInstances = data;
                    var params = {
                      EndTime: new Date, /* required */
                      MetricName: 'GroupInServiceInstances', /* required */
                      Namespace: 'AWS/AutoScaling', /* required */
                      Period: 60, /* required */
                      StartTime: new Date(d.getTime() - 60 * MS_PER_MINUTE), /* required */
                      Dimensions: [
                        {
                          Name: 'AutoScalingGroupName', /* required */
                          Value: awsDeployInfo.awsKubeAutoScaleConfig.scaling.AutoScalingGroupName/* required */
                        },
                        /* more items */
                      ],
                      Statistics: [
                        "Minimum"
                        /* more items */
                      ]
                      // Unit: 'Count'
                    };
                    cloudwatch.getMetricStatistics(params, function (err, data) {
                      if (err) console.log(err, err.stack); // an error occurred
                      else {
                        // successful response
                        dataAll.inserviceInstances = data;
                        // Isolate load balancer name from ARN
                        lbarn = awsDeployInfo.awsKubeAutoScaleConfig.listener.LoadBalancerArn;
                        lbtmp = lbarn.split("loadbalancer/").slice(1);
                        lbname = lbtmp.join("loadbalancer/");
                        var params = {
                          EndTime: new Date, /* required */
                          MetricName: 'HTTPCode_Target_2XX_Count', /* required */
                          Namespace: 'AWS/ApplicationELB', /* required */
                          Period: 60, /* required */
                          StartTime: new Date(d.getTime() - 60 * MS_PER_MINUTE), /* required */
                          Dimensions: [
                            {
                              Name: 'LoadBalancer', /* required */
                              Value: lbname //'app/awsloadbal/0f546c0424c9ffc5' /* required */
                            },
                            /* more items */
                          ],
                          Statistics: [
                            "Sum"
                            /* more items */
                          ]
                          // Unit: 'Count'
                        };
                        cloudwatch.getMetricStatistics(params, function (err, data) {
                          if (err) console.log(err, err.stack); // an error occurred
                          else {
                            // successful response
                            dataAll.HTTPCode2XXCount = data;
                            var params = {
                              EndTime: new Date, /* required */
                              MetricName: 'RequestCount', /* required */
                              Namespace: 'AWS/ApplicationELB', /* required */
                              Period: 60, /* required */
                              StartTime: new Date(d.getTime() - 60 * MS_PER_MINUTE), /* required */
                              Dimensions: [
                                {
                                  Name: 'LoadBalancer', /* required */
                                  Value: lbname //'app/awsloadbal/0f546c0424c9ffc5' /* required */
                                },
                                /* more items */
                              ],
                              Statistics: [
                                "Sum"
                                /* more items */
                              ]
                              // Unit: 'Count'
                            };
                            cloudwatch.getMetricStatistics(params, function (err, data) {
                              if (err) console.log(err, err.stack); // an error occurred
                              else {
                                // successful response
                                dataAll.totalRequestCount = data;
                                var params = {
                                  EndTime: new Date, /* required */
                                  MetricName: 'HTTPCode_Target_3XX_Count', /* required */
                                  Namespace: 'AWS/ApplicationELB', /* required */
                                  Period: 60, /* required */
                                  StartTime: new Date(d.getTime() - 60 * MS_PER_MINUTE), /* required */
                                  Dimensions: [
                                    {
                                      Name: 'LoadBalancer', /* required */
                                      Value: lbname //'app/awsloadbal/0f546c0424c9ffc5' /* required */
                                    },
                                    /* more items */
                                  ],
                                  Statistics: [
                                    "Sum"
                                    /* more items */
                                  ]
                                  // Unit: 'Count'
                                };
                                cloudwatch.getMetricStatistics(params, function (err, data) {
                                  if (err) console.log(err, err.stack); // an error occurred
                                  else {
                                    dataAll.HTTPCode3XXCount = data;
                                    var params = {
                                      EndTime: new Date, /* required */
                                      MetricName: 'HTTPCode_Target_4XX_Count', /* required */
                                      Namespace: 'AWS/ApplicationELB', /* required */
                                      Period: 60, /* required */
                                      StartTime: new Date(d.getTime() - 60 * MS_PER_MINUTE), /* required */
                                      Dimensions: [
                                        {
                                          Name: 'LoadBalancer', /* required */
                                          Value: lbname //'app/awsloadbal/0f546c0424c9ffc5' /* required */
                                        },
                                        /* more items */
                                      ],
                                      Statistics: [
                                        "Sum"
                                        /* more items */
                                      ]
                                      // Unit: 'Count'
                                    };
                                    cloudwatch.getMetricStatistics(params, function (err, data) {
                                      if (err) console.log(err, err.stack); // an error occurred
                                      else {
                                        dataAll.HTTPCode4XXCount = data;
                                        var params = {
                                          EndTime: new Date, /* required */
                                          MetricName: 'HTTPCode_Target_5XX_Count', /* required */
                                          Namespace: 'AWS/ApplicationELB', /* required */
                                          Period: 60, /* required */
                                          StartTime: new Date(d.getTime() - 60 * MS_PER_MINUTE), /* required */
                                          Dimensions: [
                                            {
                                              Name: 'LoadBalancer', /* required */
                                              Value: lbname //'app/awsloadbal/0f546c0424c9ffc5' /* required */
                                            },
                                            /* more items */
                                          ],
                                          Statistics: [
                                            "Sum"
                                            /* more items */
                                          ]
                                          // Unit: 'Count'
                                        };
                                        cloudwatch.getMetricStatistics(params, function (err, data) {
                                          if (err) console.log(err, err.stack); // an error occurred
                                          else {
                                            dataAll.HTTPCode5XXCount = data;
                                            var params = {
                                              EndTime: new Date, /* required */
                                              MetricName: 'HTTPCode_ELB_4XX_Count', /* required */
                                              Namespace: 'AWS/ApplicationELB', /* required */
                                              Period: 60, /* required */
                                              StartTime: new Date(d.getTime() - 60 * MS_PER_MINUTE), /* required */
                                              Dimensions: [
                                                {
                                                  Name: 'LoadBalancer', /* required */
                                                  Value: lbname //'app/awsloadbal/0f546c0424c9ffc5' /* required */
                                                },
                                                /* more items */
                                              ],
                                              Statistics: [
                                                "Sum"
                                                /* more items */
                                              ]
                                              // Unit: 'Count'
                                            };
                                            cloudwatch.getMetricStatistics(params, function (err, data) {
                                              if (err) console.log(err, err.stack); // an error occurred
                                              else {
                                                dataAll.HTTPCode4XXCountELB = data;
                                                var params = {
                                                  EndTime: new Date, /* required */
                                                  MetricName: 'HTTPCode_ELB_5XX_Count', /* required */
                                                  Namespace: 'AWS/ApplicationELB', /* required */
                                                  Period: 60, /* required */
                                                  StartTime: new Date(d.getTime() - 60 * MS_PER_MINUTE), /* required */
                                                  Dimensions: [
                                                    {
                                                      Name: 'LoadBalancer', /* required */
                                                      Value: lbname //'app/awsloadbal/0f546c0424c9ffc5' /* required */
                                                    },
                                                    /* more items */
                                                  ],
                                                  Statistics: [
                                                    "Sum"
                                                    /* more items */
                                                  ]
                                                  // Unit: 'Count'
                                                };
                                                cloudwatch.getMetricStatistics(params, function (err, data) {
                                                  if (err) console.log(err, err.stack); // an error occurred
                                                  else {
                                                    dataAll.HTTPCode5XXCountELB = data;
                                                    awsAutoscaleKubernetesMongoFunctions.getLatencyData(username)
                                                      .then(function (latencyarray) {
                                                        //console.log(latencyarray)
                                                        if (latencyarray) {
                                                          dataAll.latency = latencyarray;
                                                          awsAutoscaleKubernetesMongoFunctions.getResponseTimeData(username)
                                                            .then(function (resptimearray) {
                                                              //console.log(resptimearray)
                                                              if (resptimearray) {
                                                                dataAll.responseTime = resptimearray;
                                                                // successful response
                                                                awsAutoscaleKubernetesMongoFunctions.addCurrentRecordedData(username, dataAll);
                                                                res.send(dataAll);
                                                                console.log("data sent for matrics_write");
                                                                console.log(dataAll);
                                                              }
                                                            });
                                                        }
                                                      });
                                                  }
                                                });
                                              }
                                            });
                                          }
                                        });
                                      }
                                    });
                                  }
                                });
                              }
                            });
                          }
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
}
exports.describeAutoscalingGroups = function(awsData,req, res) {
  var ec2 = new AWS.EC2({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2016-11-15'});
  var cloudwatch = new AWS.CloudWatch({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2016-11-15'});
  var autoscaling = new AWS.AutoScaling({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2016-11-15'});
  var elbv2 = new AWS.ELBv2({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2015-12-01'});
  var deferred = Q.defer();
  var params = {
    AutoScalingGroupNames: [ ]
  };

  var titlesArr = [];
  titlesArr.push({"title": "Name"});
  titlesArr.push({"title": "LaunchConfigurationName"});
  titlesArr.push({"title": "MinSize"});
  titlesArr.push({"title": "MaxSize"});
  titlesArr.push({"title": "DesiredCapacity"});
  titlesArr.push({"title": "Instances"});
  titlesArr.push({"title": "CreatedTime"});

  var awsArr = [];
  if(autoscaling) {
    autoscaling.describeAutoScalingGroups(params, function(err, data) {
      if (err){
        console.log(err, err.stack); // an error occurred
        var dataAll = [
          {
            "columns": titlesArr,
            "data": awsArr
          }
        ];
        deferred.resolve(dataAll);
      }
      else
      {
        var autoScalingGroupsArr = data.AutoScalingGroups;
        autoScalingGroupsArr.forEach(function (autoScalingGroup) {
          var row = [];
          row.push(autoScalingGroup["AutoScalingGroupName"]);
          row.push(autoScalingGroup["LaunchConfigurationName"]);
          row.push(autoScalingGroup["MinSize"]);
          row.push(autoScalingGroup["MaxSize"]);
          row.push(autoScalingGroup["DesiredCapacity"]);
          row.push(autoScalingGroup["Instances"].length);
          row.push(autoScalingGroup["CreatedTime"]);
          awsArr.push(row);
        });
        var dataAll = [{
          "columns": titlesArr,
          "data": awsArr
        }
        ];
        deferred.resolve(dataAll);
      }
    });// successful response
  }
  else {
    var dataAll = [{
      "columns": titlesArr,
      "data": awsArr
    }
    ];
    deferred.resolve(dataAll);
  }
  return deferred.promise;
}
exports.describeLoadBalancer = function(awsData,req, res) {
  var ec2 = new AWS.EC2({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2016-11-15'});
  var cloudwatch = new AWS.CloudWatch({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2016-11-15'});
  var autoscaling = new AWS.AutoScaling({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2016-11-15'});
  var elbv2 = new AWS.ELBv2({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2015-12-01'});
  var deferred = Q.defer();

  var params = {
    LoadBalancerArns: []
  };

  var titlesArr = [];
  titlesArr.push({"title": "Name"});
  titlesArr.push({"title": "DNSName"});
  titlesArr.push({"title": "Type"});
  titlesArr.push({"title": "Scheme"});
  titlesArr.push({"title": "CreatedTime"});
  titlesArr.push({"title": "State"});


  var awsArr = [];
  if(elbv2) {
    elbv2.describeLoadBalancers(params, function(err, data) {
      if (err){
        console.log(err, err.stack); // an error occurred
        var dataAll = [
          {
            "columns": titlesArr,
            "data": awsArr
          }
        ];
        deferred.resolve(dataAll);
      }
      else
      {
        var loadbalancerArr = data.LoadBalancers;
        loadbalancerArr.forEach(function (loadbalancer) {
          var row = [];
          row.push(loadbalancer["LoadBalancerName"]);
          row.push(loadbalancer["DNSName"]);
          row.push(loadbalancer["Type"]);
          row.push(loadbalancer["Scheme"]);
          row.push(loadbalancer["CreatedTime"]);
          row.push(loadbalancer["State"]["Code"]);
          awsArr.push(row);
        });
        var dataAll = [{
          "columns": titlesArr,
          "data": awsArr
        }
        ];
        deferred.resolve(dataAll);
      }
    });// successful response
  }
  else {
    var dataAll = [{
      "columns": titlesArr,
      "data": awsArr
    }
    ];
    deferred.resolve(dataAll);
  }
  return deferred.promise;
}
exports.loadHpaList = function (fields,data) {
  var titleshpaTable = [];
  fields.forEach(function(field) {
    titleshpaTable.push({"title": field});
  });
  titleshpaTable.push({"title": "minReplicas"});
  titleshpaTable.push({"title": "maxReplicas"});
  titleshpaTable.push({"title": "targetCPUUtilizationPercentage"});
  titleshpaTable.push({"title": "lastScaleTime"});
  titleshpaTable.push({"title": "currentReplicas"});
  titleshpaTable.push({"title": "desiredReplicas"});
  titleshpaTable.push({"title": "currentCPUUtilizationPercentage"});

  var titleshpaStatusTable = [];
  titleshpaStatusTable.push({"title": "name"});
  titleshpaStatusTable.push({"title": "type"});
  titleshpaStatusTable.push({"title": "status"});
  titleshpaStatusTable.push({"title": "lastTransitionTime"});
  titleshpaStatusTable.push({"title": "reason"});
  titleshpaStatusTable.push({"title": "message"});

  var titleshpaCurrentStatsTable = [];
  titleshpaCurrentStatsTable.push({"title": "name"});
  titleshpaCurrentStatsTable.push({"title": "type"});
  titleshpaCurrentStatsTable.push({"title": "ResourceName"});
  titleshpaCurrentStatsTable.push({"title": "currentAverageUtilization"});
  titleshpaCurrentStatsTable.push({"title": "currentAverageValue"});

  var hpaDataFull = [];
  var hpaStatusFull = [];
  var hpaCurrentStatsFull = [];

  data.forEach(function(item){
    var row = [];

    fields.forEach(function(field){
      row.push(item["metadata"][field+'']);
    });
    row.push(item["spec"].minReplicas);
    row.push(item["spec"].maxReplicas);
    row.push(item["spec"].targetCPUUtilizationPercentage);
    row.push(item["status"].lastScaleTime);
    row.push(item["status"].currentReplicas);
    row.push(item["status"].desiredReplicas);
    row.push(item["status"].currentCPUUtilizationPercentage);

    var temp= JSON.parse(item["metadata"]["annotations"]["autoscaling.alpha.kubernetes.io/conditions"]);
    if(item["metadata"]["annotations"]["autoscaling.alpha.kubernetes.io/current-metrics"]) {
      var tempStats = JSON.parse(item["metadata"]["annotations"]["autoscaling.alpha.kubernetes.io/current-metrics"]);
      for(i=0;i<tempStats.length; i++) {
        var row3 = [];
        row3.push(item["metadata"]["name"]);
        row3.push(tempStats[i].type);
        row3.push(tempStats[i].resource.name);
        row3.push(tempStats[i].resource.currentAverageUtilization);
        row3.push(tempStats[i].resource.currentAverageValue);
        hpaCurrentStatsFull.push(row3);
      }
      hpaDataFull.push(row);
    }
    for(i=0;i<temp.length; i++)
    {
      var row2 = [];
      row2.push(item["metadata"]["name"]);
      row2.push(temp[i].type);
      row2.push(temp[i].status);
      row2.push(temp[i].lastTransitionTime);
      row2.push(temp[i].reason);
      row2.push(temp[i].message);
      hpaStatusFull.push(row2);
    }
  });
  var dataAll = [
    {
      "columns": titleshpaTable,
      "data": hpaDataFull,
      "sScrollY": "600",
      "sScrollX": "100%",
      "sScrollXInner": "100%",
      "bScrollCollapse": true
    },
    {
      "columns": titleshpaStatusTable,
      "data": hpaStatusFull
    },
    {
      "columns": titleshpaCurrentStatsTable,
      "data": hpaCurrentStatsFull
    }
  ];
  return dataAll;
}
exports.loadNodeList=function(fields,data) {
  //Pod Data
  var titlesNodeTable = [];
  var titlesNodeInfoTable = [];``
  fields.forEach(function(field) {
    titlesNodeTable.push({"title": field});
  });
  var maxLength = 0;
  var maxIndexLength = 0;
  for(i = 0; i < data.length; i++ ){
    if(maxLength < data[i]["status"]["conditions"].length)
    {
      maxLength = data[i]["status"]["conditions"].length;
      maxIndexLength = i;
    }
  }
  for (i = 0; i < data[maxIndexLength]["status"]["conditions"].length; i++) {
    titlesNodeTable.push({"title": data[maxIndexLength]["status"]["conditions"][i]["type"]});
    titlesNodeTable.push({"title": "lastHeartbeatTime"});
    titlesNodeTable.push({"title": "lastTransitionTime"});
  }
  for (i = 0; i < Object.keys(data[0]["status"]["nodeInfo"]).length; i++) {
    titlesNodeInfoTable.push({"title": Object.keys(data[0]["status"]["nodeInfo"])[i]});
  }
  var nodeInfo = [];
  var nodeDataFull = [];
  data.forEach(function(item) {
    var row = [];
    var row2 = [];
    fields.forEach(function(field) {
      row.push(item["metadata"][field+'']);
    });
    for(j=0;j<item["status"]["conditions"].length; j++)
    {
      row.push(item["status"]["conditions"][j]["status"]);
      row.push(item["status"]["conditions"][j]["lastHeartbeatTime"]);
      row.push(item["status"]["conditions"][j]["lastTransitionTime"]);
    }
    row2.push(item["status"]["nodeInfo"].machineID);
    row2.push(item["status"]["nodeInfo"].systemUUID);
    row2.push(item["status"]["nodeInfo"].bootID);
    row2.push(item["status"]["nodeInfo"].kernelVersion);
    row2.push(item["status"]["nodeInfo"].osImage);
    row2.push(item["status"]["nodeInfo"].containerRuntimeVersion);
    row2.push(item["status"]["nodeInfo"].kubeletVersion);
    row2.push(item["status"]["nodeInfo"].kubeProxyVersion);
    row2.push(item["status"]["nodeInfo"].operatingSystem);
    row2.push(item["status"]["nodeInfo"].architecture);
    nodeInfo.push(row2);
    nodeDataFull.push(row);
  });
  var dataAll = [{
    "data": nodeDataFull,
    "columns":titlesNodeTable,
    "sScrollY": "600",
    "sScrollX": "100%",
    "sScrollXInner": "100%",
    "bScrollCollapse": true
  },
    {
      "data": nodeInfo,
      "columns":titlesNodeInfoTable,
      "sScrollY": "600",
      "sScrollX": "100%",
      "sScrollXInner": "100%",
      "bScrollCollapse": true
    }
  ];
  return dataAll;
}
exports.loadReplicationControllerList=function(fields,data) {
  //Pod Data
  var titlesRPCTable = [];
  fields.forEach(function(field) {
    titlesRPCTable.push({"title": field});
  });
  titlesRPCTable.push({"title": "replicas"});
  titlesRPCTable.push({"title": "fullyLabeledReplicas"});
  titlesRPCTable.push({"title": "readyReplicas"});
  titlesRPCTable.push({"title": "availableReplicas"});
  titlesRPCTable.push({"title": "observedGeneration"});

  var RPCDataFull = [];
  data.forEach(function(item) {
    var row = [];
    fields.forEach(function(field) {
      row.push(item["metadata"][field+'']);
    });
    row.push(item["status"].replicas);
    row.push(item["status"].fullyLabeledReplicas);
    row.push(item["status"].readyReplicas);
    row.push(item["status"].availableReplicas);
    row.push(item["status"].observedGeneration);

    RPCDataFull.push(row);
  });
  var dataAll = [
    {
      "data": RPCDataFull,
      "columns":titlesRPCTable,
    }
  ];
  return dataAll;
}
exports.loadPodTableList= function(fields,field2, field3,field4, data) {
  //Pod Data
  var titlesPodTable = [];
  fields.forEach(function(field) {
    titlesPodTable.push({"title": field});
  });
  titlesPodTable.push({"title": "NodeName"});
  titlesPodTable.push({"title": "State"});
  var PodDatFull = [];
  data.forEach(function(item) {
    var row = [];
    fields.forEach(function(field) {
      row.push(item["metadata"][field+'']);
    });
    row.push(item["spec"][field2]);
    row.push(item["status"][field3]);
    PodDatFull.push(row);
  });
  //pod Phase Data
  var titles = [];
  fields.forEach(function(field) {
    titles.push({"title": field})
  });

  var maxLength = 0;
  var maxIndexLength = 0;
  for(i = 0; i < data.length; i++ ){
    if(data[i]["status"][field4]) {
      if (maxLength < data[i]["status"][field4].length) {
        maxLength = data[i]["status"][field4].length;
        maxIndexLength = i;
      }
    }
  }
  for (i = 0; i < data[maxIndexLength]["status"][field4].length; i++) {
    titles.push({"title": data[maxIndexLength]["status"][field4][i]["type"]});
  }
  var PodPhaseFullData=[];

  data.forEach(function(item) {
    var podData = [];
    fields.forEach(function(field) {
      podData.push(item["metadata"][field+'']);
    });
    if(item["status"][field4]) {
      for (i = 0; i < item["status"][field4].length; i++) {
        podData.push(item["status"][field4][i]["lastTransitionTime"]);
      }
    }
    else
    {
      for (i = 0; i < maxLength; i++) {
        podData.push("Undefined");
      }
    }
    PodPhaseFullData.push(podData);
  });
// containers information
  var ContainerfullData=[];
  data.forEach(function(item) {
    var dataE = [];
    for (i = 0; i < item["spec"]["containers"].length; i++) {
      dataE.push(item["metadata"][fields[0]]);
      dataE.push(item["spec"]["containers"][i]["name"]);
      if (item["status"]["phase"] != "Failed" && item["status"]["containerStatuses"] ) {
        var val = Object.keys(item["status"]["containerStatuses"][i].state)[0];
        if (val) {
          val = Object.keys(item["status"]["containerStatuses"][i].state)[0];
          dataE.push(val);
          dataE.push(item["status"]["containerStatuses"][i].state[val].startedAt);
        }
        else {
          dataE.push("Undefined");
          dataE.push("None");
        }

        var val2 = Object.keys(item["status"]["containerStatuses"][i].lastState)[0];

        if (val2) {
          dataE.push(Object.keys(item["status"]["containerStatuses"][i].lastState)[0]);
          dataE.push(item["status"]["containerStatuses"][i].lastState[val2].startedAt);
        }
        else {
          dataE.push("Undefined");
          dataE.push("None");
        }
        dataE.push(item["status"]["containerStatuses"][i].restartCount);
      }
      else {
        dataE.push("Undefined");
        dataE.push("None");
        dataE.push("Undefined");
        dataE.push("None");
        dataE.push("None");
      }
    }
    ContainerfullData.push(dataE);
  });
  var dataAll = [{
    "data": PodDatFull,
    "columns":titlesPodTable
  },
    {
      "data": PodPhaseFullData,
      "columns":titles
    },
    {
      "data": ContainerfullData,
      "columns": [
        { title: "PodName" },
        { title: "ContainerName" },
        { title: "CurrentState" },
        { title: "TimeStamp" },
        { title: "Last State" },
        { title: "TimeStamp" },
        { title: "restartCount" }
      ]
    }
  ];
  return dataAll;
}
exports.loadTableServices= function(fields,data) {
  //Pod Data
  var titlesServiceTable = [];
  fields.forEach(function (field) {
    titlesServiceTable.push({"title": field});
  });
  var ServiceDataFull = [];
  data.forEach(function(item) {
    var row = [];
    fields.forEach(function(field) {
      row.push(item["metadata"][field+'']);
    });
    ServiceDataFull.push(row);
  });
  var dataAll = [{
    "data": ServiceDataFull,
    "columns":titlesServiceTable
  }
  ];
  return dataAll;
}
exports.loadTableTimeline= function(data) {
  //Pod Data
  var titlesTimelineTable = [];

  titlesTimelineTable.push({"title": "name"});
  titlesTimelineTable.push({"title": "kind"});
  titlesTimelineTable.push({"title": "namespace"});
  titlesTimelineTable.push({"title": "reason"});
  titlesTimelineTable.push({"title": "firstTimestamp"});
  titlesTimelineTable.push({"title": "lastTimestamp"});
  titlesTimelineTable.push({"title": "count"});
  titlesTimelineTable.push({"title": "message"});

  var timelineDataFull = [];
  var saveRowData = [];

  data.forEach(function(item) {
    var row = [];
    var saveRow = [];
    row.push(item["involvedObject"]["name"]);
    row.push(item["involvedObject"]["kind"]);
    row.push(item["involvedObject"]["namespace"]);
    row.push(item["reason"]);
    row.push(item["firstTimestamp"]);
    row.push(item["lastTimestamp"]);
    row.push(item["count"]);
    row.push(item["message"]);

    saveRow.push({"name": item["involvedObject"]["name"]});
    saveRow.push({"kind": item["involvedObject"]["kind"]});
    saveRow.push({"namespace": item["involvedObject"]["namespace"]});
    saveRow.push({"reason": item["reason"]});
    saveRow.push({"firstTimestamp": item["firstTimestamp"]});
    saveRow.push({"lastTimestamp": item["lastTimestamp"]});
    saveRow.push({"count": item["count"]});
    saveRow.push({"message": item["message"]});

    timelineDataFull.push(row);
    saveRowData.push(saveRow);
  });

  var dataAll = [{
    "data": timelineDataFull,
    "columns":titlesTimelineTable
  }
  ];
  return dataAll;
}

function getPodInfoForSave(url){
  var deferred = Q.defer();
  request({
    url: url,
    method: "GET",
    json: true,
    headers: {
      "content-type": "application/json",
    }
  }, function(error, response, body) {
    var podsInfoJsonArr = [];
    if (!error && response.statusCode === 200) {
      var podsInfo = body.items;
      podsInfo.forEach(function(pod) {
        var conditions = [];
        if(pod["status"]["conditions"]) {
          for (i = 0; i < pod["status"]["conditions"].length; i++) {
            var condition = {
              "type": pod["status"]["conditions"][i]["type"],
              "lastTransitionTime": pod["status"]["conditions"][i]["lastTransitionTime"]
            };
            conditions.push(condition);
          }
        }
        var onePodInfo = {
          "name": pod["metadata"]["name"],
          "namespace": pod["metadata"]["namespace"],
          "creationTimestamp": pod["metadata"]["creationTimestamp"],
          "NodeName": pod["spec"]["nodeName"],
          "state": pod["spec"]["phase"],
          "conditions": conditions
        };
        podsInfoJsonArr.push(onePodInfo);
      });
      deferred.resolve(podsInfoJsonArr); // username exists
    }
    else {
      deferred.resolve(podsInfoJsonArr);
    }
  });
  return deferred.promise;
}

function getContainerInfoForSave(url){
  var deferred = Q.defer();
  request({
    url: url,
    method: "GET",
    json: true,
    headers: {
      "content-type": "application/json",
    }
  }, function(error, response, body) {
    var containersInfoJsonArr = [];
    if (!error && response.statusCode === 200) {
      var podsInfo = body.items;
      podsInfo.forEach(function(pod) {
        for(i=0;i<pod["spec"]["containers"].length; i++) {

          var currentStateName = "undefined";
          var currentStateNameTimeStamp = 'None';
          var lastStateName = "undefined";
          var lastStateNameTimeStamp = 'None';
          var rcount =0;
          if (pod["status"]["phase"] != "Failed" && pod["status"]["containerStatuses"]) {
            currentStateName = Object.keys(pod["status"]["containerStatuses"][i].state);
            lastStateName = Object.keys(pod["status"]["containerStatuses"][i].lastState)[0];
            if (currentStateName) {
              currentStateName = Object.keys(pod["status"]["containerStatuses"][i].state)[0];
              currentStateNameTimeStamp = pod["status"]["containerStatuses"][i].state[currentStateName].startedAt;
            }
            if (lastStateName) {
              lastStateName = Object.keys(pod["status"]["containerStatuses"][i].lastState)[0];
              lastStateNameTimeStamp = pod["status"]["containerStatuses"][i].lastState[lastStateName].startedAt;
            }
            rcount = pod["status"]["containerStatuses"][i].restartCount;
          }
          var oneContainerInfo = {

            "name": pod["spec"]["containers"][i]["name"],
            "namespace": pod["metadata"]["namespace"],
            "currentStateName": currentStateName,
            "currentStateNameTimeStamp": currentStateNameTimeStamp,
            "lastStateName": lastStateName,
            "lastStateNameTimeStamp": lastStateNameTimeStamp,
            "restartCount": rcount
          };
          containersInfoJsonArr.push(oneContainerInfo);
        }
      });
      deferred.resolve(containersInfoJsonArr);
    }
    else {
      deferred.resolve(containersInfoJsonArr);
    }
  });
  return deferred.promise;
}
function getNodeInfoForSave(url){
  var deferred = Q.defer();
  request({
    url: url,
    method: "GET",
    json: true,
    headers: {
      "content-type": "application/json",
    }
  }, function(error, response, body) {
    var nodesInfoJsonArr = [];
    if (!error && response.statusCode === 200) {
      var nodesInfo = body.items;
      nodesInfo.forEach(function(node) {
        var conditions = [];
        if(node["status"]["conditions"]) {
          for (i = 0; i < node["status"]["conditions"].length; i++) {
            var condition = {
              "type": node["status"]["conditions"][i]["type"],
              "status": node["status"]["conditions"][i]["status"],
              "lastHeartbeatTime": node["status"]["conditions"][i]["lastHeartbeatTime"],
              "lastTransitionTime": node["status"]["conditions"][i]["lastTransitionTime"]
            };
            conditions.push(condition);
          }
        }
        var oneNodeInfo = {
          "name": node["metadata"]["name"],
          "creationTimestamp": node["metadata"]["creationTimestamp"],
          "machineID": node["status"]["nodeInfo"].machineID,
          "systemUUID": node["status"]["nodeInfo"].systemUUID,
          "bootID": node["status"]["nodeInfo"].bootID,
          "kernelVersion": node["status"]["nodeInfo"].kernelVersion,
          "osImage": node["status"]["nodeInfo"].osImage,
          "containerRuntimeVersion": node["status"]["nodeInfo"].containerRuntimeVersion,
          "kubeletVersion": node["status"]["nodeInfo"].kubeletVersion,
          "kubeProxyVersion": node["status"]["nodeInfo"].kubeProxyVersion,
          "operatingSystem": node["status"]["nodeInfo"].operatingSystem,
          "architecture": node["status"]["nodeInfo"].architecture,
          "conditions": conditions
        };
        nodesInfoJsonArr.push(oneNodeInfo);
      });
      deferred.resolve(nodesInfoJsonArr); // username exists
    }
    else {
      deferred.resolve(nodesInfoJsonArr);
    }
  });
  return deferred.promise;
}
function getServicesInfoForSave(url){
  var deferred = Q.defer();
  request({
    url: url,
    method: "GET",
    json: true,
    headers: {
      "content-type": "application/json",
    }
  }, function(error, response, body) {
    var servicesInfoJsonArr = [];
    if (!error && response.statusCode === 200) {
      var servicesInfo = body.items;
      servicesInfo.forEach(function(service) {
        var nodePort = service["spec"]["ports"][0].nodePort;
        if(nodePort)
        {
          port = service["spec"]["ports"][0].nodePort
        }
        else
        {
          port = service["spec"]["ports"][0].targetPort
        }
        var oneServiceInfo = {
          "name": service["metadata"]["name"],
          "namespace": service["metadata"]["namespace"],
          "creationTimestamp": service["metadata"]["creationTimestamp"],
          "port": port,

        };
        servicesInfoJsonArr.push(oneServiceInfo);
      });
      deferred.resolve(servicesInfoJsonArr);
    }
    else {
      deferred.resolve(servicesInfoJsonArr);
    }
  });
  return deferred.promise;
}
function getRpcInfoForSave(url){
  var deferred = Q.defer();
  request({
    url: url,
    method: "GET",
    json: true,
    headers: {
      "content-type": "application/json",
    }
  }, function(error, response, body) {
    var rpcInfoJsonArr = [];
    if (!error && response.statusCode === 200) {
      var rpcsInfo = body.items;
      rpcsInfo.forEach(function(rpc) {
        var onerpcInfo = {
          "name": rpc["metadata"]["name"],
          "namespace": rpc["metadata"]["namespace"],
          "creationTimestamp": rpc["metadata"]["creationTimestamp"],
          "replicas": rpc["status"].replicas,
          "fullyLabeledReplicas": rpc["status"].fullyLabeledReplicas,
          "readyReplicas": rpc["status"].readyReplicas,
          "availableReplicas": rpc["status"].availableReplicas,
          "observedGeneration": rpc["status"].observedGeneration
        };
        rpcInfoJsonArr.push(onerpcInfo);
      });
      deferred.resolve(rpcInfoJsonArr); // username exists
    }
    else {
      deferred.resolve(rpcInfoJsonArr);
    }
  });
  return deferred.promise;
}
function getHpaInfoForSave(url){
  var deferred = Q.defer();
  request({
    url: url,
    method: "GET",
    json: true,
    headers: {
      "content-type": "application/json",
    }
  }, function(error, response, body) {
    var hpasInfoJsonArr = [];
    if (!error && response.statusCode === 200) {
      var hpasInfo = body.items;
      hpasInfo.forEach(function(hpa) {
        var hpaCurrentStatsFull = [];
        var hpaStatusFull = [];
        var hpaStatus= JSON.parse(hpa["metadata"]["annotations"]["autoscaling.alpha.kubernetes.io/conditions"]);
        if(hpa["metadata"]["annotations"]["autoscaling.alpha.kubernetes.io/current-metrics"]) {
          var hpaStats = JSON.parse(hpa["metadata"]["annotations"]["autoscaling.alpha.kubernetes.io/current-metrics"]);
          for (i = 0; i < hpaStats.length; i++) {
            var oneStat = {
              "type": hpaStats[i].type ,
              "Resourcename":hpaStats[i].resource.name ,
              "currentAverageUtilization": hpaStats[i].resource.currentAverageUtilization,
              "currentAverageValue": hpaStats[i].resource.currentAverageValue
            }
            hpaCurrentStatsFull.push(oneStat);
          }
        }
        if(hpaStatus[i])
        {
          var oneStatus ={
            "type": hpaStatus[i].type ,
            "status":hpaStatus[i].status ,
            "lastTransitionTime": hpaStatus[i].lastTransitionTime,
            "reason": hpaStatus[i].reason,
            "message": hpaStatus[i].message
          }
          hpaStatusFull.push(oneStatus);
        }

        var onehpaInfo = {
          "name": hpa["metadata"]["name"],
          "namespace": hpa["metadata"]["namespace"],
          "creationTimestamp": hpa["metadata"]["creationTimestamp"],
          "minReplicas": hpa["spec"].minReplicas,
          "maxReplicas": hpa["spec"].maxReplicas,
          "targetCPUUtilizationPercentage": hpa["spec"].targetCPUUtilizationPercentage,
          "lastScaleTime": hpa["status"].lastScaleTime,
          "currentReplicas": hpa["status"].currentReplicas,
          "desiredReplicas": hpa["status"].desiredReplicas,
          "currentCPUUtilizationPercentage": hpa["status"].currentCPUUtilizationPercentage,
          "minReplicas": hpa["spec"].minReplicas,
          "statsCurrent": hpaCurrentStatsFull,
          "status": hpaStatusFull,
        };
        hpasInfoJsonArr.push(onehpaInfo);
      });
      deferred.resolve(hpasInfoJsonArr); // username exists
    }
    else {
      deferred.resolve(hpasInfoJsonArr);
    }
  });
  return deferred.promise;
}
function getEventsInfoForSave(url){
  var deferred = Q.defer();
  request({
    url: url,
    method: "GET",
    json: true,
    headers: {
      "content-type": "application/json",
    }
  }, function(error, response, body) {
    var eventsInfoJsonArr = [];
    if (!error && response.statusCode === 200) {
      var eventsInfo = body.items;
      eventsInfo.forEach(function(event) {

        var oneEventInfo = {
          "name": event["involvedObject"]["name"],
          "kind": event["involvedObject"]["kind"],
          "namespace": event["involvedObject"]["namespace"],
          "reason": event["reason"],
          "firstTimestamp": event["firstTimestamp"],
          "lastTimestamp": event["lastTimestamp"],
          "count": event["count"],
          "message": event["message"]
        };
        eventsInfoJsonArr.push(oneEventInfo);
      });
      deferred.resolve(eventsInfoJsonArr); // username exists
    }
    else {
      deferred.resolve(eventsInfoJsonArr);
    }
  });
  return deferred.promise;
}

exports.saveKubernetesData= function(username, objUrl){
  var timeStamp = new Date().getTime();
  var dataAll = {
    "time": timeStamp,
    "data": {}
  }
  getPodInfoForSave(objUrl.urlPods)
    .then(function (podInfo) {
      dataAll["data"]["podInfo"] = podInfo;
      getNodeInfoForSave(objUrl.urlNodes)
        .then(function (nodeInfo) {
          dataAll["data"]["nodeInfo"] = nodeInfo;
          getEventsInfoForSave(objUrl.urlEvents)
            .then(function (eventsInfo) {
              dataAll["data"]["eventsInfo"] = eventsInfo;
              getContainerInfoForSave(objUrl.urlContainers)
                .then(function (containersInfo) {
                  dataAll["data"]["containersInfo"] = containersInfo;
                  getServicesInfoForSave(objUrl.urlServices)
                    .then(function (servicesInfo) {
                      dataAll["data"]["servicesInfo"] = servicesInfo;
                      getHpaInfoForSave(objUrl.urlHpa)
                        .then(function (hpaInfo) {
                          dataAll["data"]["hpaInfo"] = hpaInfo;
                          getRpcInfoForSave(objUrl.urlRpc)
                            .then(function (rpcInfo) {
                              dataAll["data"]["rpcInfo"] = rpcInfo;
                              awsAutoscaleKubernetesMongoFunctions.addRecordedData(username,dataAll)
                                .then(function (added) {
                                  if (added) {
                                    console.log("added recorded data informtion");
                                  }
                                  else {
                                    console.log("user not found");
                                  }
                                });
                            });
                        });
                    });
                });
            });
        });
    });

}
exports.saveKubernetesDataLoadTest= function(username,loadTestName,objUrl){
  var timeStamp = new Date().getTime();
  var dataAll = {
    "time": timeStamp,
    "data": {}
  }
  getPodInfoForSave(objUrl.urlPods)
    .then(function (podInfo) {
      dataAll["data"]["podInfo"] = podInfo;
      getNodeInfoForSave(objUrl.urlNodes)
        .then(function (nodeInfo) {
          dataAll["data"]["nodeInfo"] = nodeInfo;
          getEventsInfoForSave(objUrl.urlEvents)
            .then(function (eventsInfo) {
              dataAll["data"]["eventsInfo"] = eventsInfo;
              getContainerInfoForSave(objUrl.urlContainers)
                .then(function (containersInfo) {
                  dataAll["data"]["containersInfo"] = containersInfo;
                  getServicesInfoForSave(objUrl.urlServices)
                    .then(function (servicesInfo) {
                      dataAll["data"]["servicesInfo"] = servicesInfo;
                      getHpaInfoForSave(objUrl.urlHpa)
                        .then(function (hpaInfo) {
                          dataAll["data"]["hpaInfo"] = hpaInfo;
                          getRpcInfoForSave(objUrl.urlRpc)
                            .then(function (rpcInfo) {
                              dataAll["data"]["rpcInfo"] = rpcInfo;
                              awsAutoscaleKubernetesMongoFunctions.addLoadTestKubernetesData(username,loadTestName,dataAll)
                                .then(function (added) {
                                  if (added) {
                                    console.log("added recorded data informtion");
                                  }
                                  else {
                                    console.log("user not found");
                                  }
                                });
                            });
                        });
                    });
                });
            });
        });
    });

}
exports.saveAutoscalingGroupData = function(awsData,username, testname) {
  var ec2 = new AWS.EC2({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2016-11-15'});
  var cloudwatch = new AWS.CloudWatch({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2016-11-15'});
  var autoscaling = new AWS.AutoScaling({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2016-11-15'});
  var elbv2 = new AWS.ELBv2({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2015-12-01'});
  var deferred = Q.defer();
  var params = {
    AutoScalingGroupNames: [ ]
  };

  var awsArr = [];
  if(autoscaling) {
    autoscaling.describeAutoScalingGroups(params, function (err, data) {
      if (err) {
        console.log(err, err.stack); // an error occurred
      }
      else {
        var autoScalingGroupsArr = data.AutoScalingGroups;
        autoScalingGroupsArr.forEach(function (autoScalingGroup) {
          var row = {
            "AutoScalingGroupName": autoScalingGroup["AutoScalingGroupName"],
            "LaunchConfigurationName": autoScalingGroup["LaunchConfigurationName"],
            "MinSize": autoScalingGroup["MinSize"],
            "MaxSize": autoScalingGroup["MaxSize"],
            "DesiredCapacity": autoScalingGroup["DesiredCapacity"],
            "InstancesDetails": autoScalingGroup["Instances"],
            "Instances": autoScalingGroup["Instances"].length,
            "CreatedTime": autoScalingGroup["CreatedTime"]
          };
            awsArr.push(row);
        });
        var d = new Date();
        var MS_PER_MINUTE = 60000;
        var params = {
          EndTime: new Date, /* required */
          MetricName: 'CPUUtilization', /* required */
          Namespace: 'AWS/EC2', /* required */
          Period: 60, /* required */
          StartTime: new Date(d.getTime() - 60 * MS_PER_MINUTE), /* required */
          Dimensions: [
            {
              Name: 'AutoScalingGroupName', /* required */
              Value: awsArr[0].AutoScalingGroupName/* required */
            },
            /* more items */
          ],
          Statistics: [
            "Average"
          ]
        };
        cloudwatch.getMetricStatistics(params, function (err, data) {
          if (err) console.log(err, err.stack); // an error occurred
          else {
            var timeStamp = new Date().getTime();
            var dataAll = {
              "time": timeStamp,
              "data": awsArr[0],
              "cpuUtilization": data
            };
            // successful response
            awsAutoscaleKubernetesMongoFunctions.addAutoscalingData(username, testname, dataAll)
              .then(function (added) {
                if (added) {
                  console.log("added recorded data informtion");
                }
                else {
                  console.log("user not found");
                }
              });
          }
        });
      }
    });// successful response
  }
}
