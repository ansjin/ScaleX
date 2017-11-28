const Q                                 = require('q');
const http                              = require('http');
const request                           = require('request');
const AWS                               = require('aws-sdk');
const awsAutoscalingMongoFunctions      = require('./awsAutoscaleMongoFunctions');

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
exports.deployAutoscaler = function(username, awsDeployData, awsData,req, res) {
  var ec2 = new AWS.EC2({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2016-11-15'});
  var cloudwatch = new AWS.CloudWatch({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2016-11-15'});
  var autoscaling = new AWS.AutoScaling({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2016-11-15'});
  var elbv2 = new AWS.ELBv2({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2015-12-01'});
  var deferred = Q.defer();


  var scriptAnalyzer = '#!/bin/bash \n ' +
    'sudo apt-get update \n ' +
    'sudo apt-get -y install docker.io \n ' +
    'sudo apt-get -y install nodejs \n ' +
    'sudo apt-get -y install npm \n ' +
    'sudo iptables -A INPUT -p tcp --dport 3001 -j ACCEPT \n ' +
    'sudo curl -L https://github.com/docker/compose/releases/download/1.13.0/docker-compose-`uname -s`-`uname -m` > /usr/local/bin/docker-compose \n ' +
    'sudo chmod +x /usr/local/bin/docker-compose \n ' +
    'git clone ' +awsDeployData.application.giturl+' \n ' +
    'cd ' +awsDeployData.application.name+' \n ' +
    'sudo docker-compose up --build & \n ';
  var scriptAnalyzerBase64 = new Buffer(scriptAnalyzer).toString('base64');


  var paramsLaunchConfiguration = {
    ImageId: awsDeployData.image,
    InstanceType: awsDeployData.launchConfig.typeInst,
    InstanceMonitoring: {
      Enabled: true
    },
    SecurityGroups: awsData.securityId,
    LaunchConfigurationName: awsDeployData.launchConfig.name,
    KeyName: awsData.awsKeyName,
    UserData: scriptAnalyzerBase64
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
    DefaultActions: [ /* required */
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
    MaxSize: awsDeployData.autoScale.maxInst,
    MinSize: awsDeployData.autoScale.minInst,
    VPCZoneIdentifier: awsDeployData.autoScale.subnet,//"subnet-fd25cdb4",
    TargetGroupARNs: [ ],
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
    AlarmActions: [ ],
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
    AlarmActions: [ ],
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

  elbv2.createLoadBalancer(paramsLoadBalancer, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else
    {
      console.log(data);
      paramsTargetGroup.VpcId = data.LoadBalancers[0].VpcId;
      paramsListener.LoadBalancerArn= data.LoadBalancers[0].LoadBalancerArn;
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
/*
                  var fs = require('fs');
                  fs.writeFile("test",loadBalArn+"\n"+targetarn, function(err) {
                    if(err)
                    {
                      console.log(err);
                    }

                    console.log("The file was saved!");
                  });*/
                  autoscaling.createAutoScalingGroup(paramsAutoScaler, function (err, data) {
                    if (err) console.log(err, err.stack); // an error occurred
                    else {
                      console.log(data);
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
                                  }
                                };
                                awsAutoscalingMongoFunctions.addConfigData(username,awsAutoScaleData)
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
  res.render('awsautoscale/success', {
    layout: '../awsautoscale/layouts/main',
    user: username,
    dataForm: req.body,
    dataClient: "Request Sent to Server for Deployment"
  });
}
exports.terminateAutoScale = function(awsData,username,req, res) {
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
  var deferred = Q.defer();

  awsAutoscalingMongoFunctions.getAwsAutoScaleInfo(username)
    .then(function (awsDeployInfo) {
      if (awsDeployInfo) {

        var paramsAutoscaling = {
          AutoScalingGroupName: awsDeployInfo.scaling.AutoScalingGroupName,
          ForceDelete: true
        };
        autoscaling.deleteAutoScalingGroup(paramsAutoscaling, function(err, data) {
          if (err) console.log(err, err.stack); // an error occurred
          else     console.log(data);           // successful response
        });
        setTimeout(function(){
          var paramsLaunchConfig = {
            LaunchConfigurationName: awsDeployInfo.scaling.LaunchConfigurationName
          };
          autoscaling.deleteLaunchConfiguration(paramsLaunchConfig, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else     console.log(data);           // successful response
          });
        }, 3000);

        var paramsLoadBal = {
          LoadBalancerArn: awsDeployInfo.listener.LoadBalancerArn /* required */
        };
        elbv2.deleteLoadBalancer(paramsLoadBal, function (err, data) {
          if (err) console.log(err, err.stack); // an error occurred
          else     console.log(data);           // successful response
        });
        setTimeout(function() {
          var paramsTargetGroup = {
            TargetGroupArn: awsDeployInfo.listener.DefaultActions[0].TargetGroupArn /* required */
          };
          elbv2.deleteTargetGroup(paramsTargetGroup, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else     console.log(data);           // successful response
          });
        }, 30000);

        res.render('success', {
          user: username,
          dataForm: req.body,
          dataClient: "Kubernetes Instances Terminated"
        });
      }
      else {
        res.render('success', {
          user: username,
          dataForm: req.body,
          dataClient: "No Information Found to Terminate"
        });
      }
    });
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

  awsAutoscalingMongoFunctions.getAwsAutoScaleInfo(username)
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
                Value: awsDeployInfo.scaling.AutoScalingGroupName/* required */
              },
            ],
            Statistics: [
              "Average"
              /* more items */
            ]
           // Unit: 'Count'
          };
          console.log(params);
        cloudwatch.getMetricStatistics(params, function (err, data) {
          if (err) console.log(err, err.stack); // an error occurred
          else {
            var dataAll = {
              "instances": data,
              "cpuUtilization": ''
            }
            var params = {
              EndTime: new Date, /* required */
              MetricName: 'CPUUtilization', /* required */
              Namespace: 'AWS/EC2', /* required */
              Period: 60, /* required */
              StartTime: new Date(d.getTime() - 60 * MS_PER_MINUTE), /* required */
              Dimensions: [
                {
                  Name: 'AutoScalingGroupName', /* required */
                  Value: awsDeployInfo.scaling.AutoScalingGroupName/* required */
                },
                /* more items */
              ],
              Statistics: [
                "Average"
                /* more items */
              ]
              // Unit: 'Count'
            };
            cloudwatch.getMetricStatistics(params, function (err, data) {
              if (err) console.log(err, err.stack); // an error occurred
              else {
                // successful response
                dataAll.cpuUtilization = data;
                awsAutoscalingMongoFunctions.addCurrentRecordedData(username,dataAll );
                res.send(dataAll);
                console.log("data sent for matrics_write");
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
    autoscaling.describeAutoScalingGroups(params, function(err, data) {
      if (err){
        console.log(err, err.stack); // an error occurred
      }
      else
      {
        var autoScalingGroupsArr = data.AutoScalingGroups;
        autoScalingGroupsArr.forEach(function (autoScalingGroup) {
          var row = {
            "AutoScalingGroupName": autoScalingGroup["AutoScalingGroupName"],
            "LaunchConfigurationName": autoScalingGroup["LaunchConfigurationName"],
            "MinSize": autoScalingGroup["MinSize"],
            "MaxSize": autoScalingGroup["MaxSize"],
            "DesiredCapacity": autoScalingGroup["DesiredCapacity"],
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
            awsAutoscalingMongoFunctions.addAutoscalingData(username, testname, dataAll)
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

          awsAutoscalingMongoFunctions.addLoadBalancerDns(req.user.username,loadbalancer["DNSName"]);
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
