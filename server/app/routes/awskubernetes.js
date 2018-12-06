const express                                 = require('express');
const router                                  = express.Router();
const funct                                   = require('../functions');
const passport                                = require('passport');
const awsAutoscaleKubernetes                  = require("../auto_scaling_solutions/aws_kubernetes/index");
const awsAutoscaleKubernetesMongoFunctions    = require("../auto_scaling_solutions/aws_kubernetes/awsAutoscaleKubernetesMongoFunctions");
var http                                      = require('http');
var request                                   = require('request');
var loadtest                                  = require('loadtest');



//===============ROUTES=================
//displays our homepage
router.get('/', function(req, res){
  res.render('awskubernetes/home',{layout: '../awskubernetes/layouts/main',user: req.user} );
});
router.get('/edituserInfo', function(req, res){
  funct.getUserInfoforEdit(req.user.username, res,req);
});
router.get('/getUserInfoForDeploy', function(req, res){
  awsAutoscaleKubernetesMongoFunctions.getUserInfoforDeploy(req.user.username, res,req);
});
router.get('/loadtesthome', function(req, res){
  res.render('awskubernetes/loadtesthome',{layout: '../awskubernetes/layouts/main',user: req.user} );
});
router.get('/describeEc2Instances', function(req, res) {
  awsAutoscaleKubernetesMongoFunctions.getUserInfoForDescription(req.user.username, res,req)
    .then(function (data) {
      if (data) {
        var awsdata = {
          "accessKeyId": data.awstoken,
          "secretAccessKey": data.awssecret,
          "region": data.awsregion,
          "s3BucketName": data.s3bucketname,
          "awsKeyName": data.awskeyname
        };
        var b = awsAutoscaleKubernetes.describeInstances(awsdata, req, res)
          .then(function (data) {
            if (data) {
              res.send(data);
            }
          });
      }
      else {
        res.send("fail")
      }
    });
});
router.get('/describeAwsAutoscaleGroups', function(req, res) {
  awsAutoscaleKubernetesMongoFunctions.getUserInfoForDescription(req.user.username, res,req)
    .then(function (data) {
      if (data) {
        var awsdata = {
          "accessKeyId": data.awstoken,
          "secretAccessKey": data.awssecret,
          "region": data.awsregion,
          "s3BucketName": data.s3bucketname,
          "awsKeyName": data.awskeyname
        };
        var b = awsAutoscaleKubernetes.describeAutoscalingGroups(awsdata, req, res)
          .then(function (data) {
            if (data) {
              res.send(data);
            }
          });
      }
      else {
        res.send("fail")
      }
    });
});
router.get('/describeAwsLoadBalancer', function(req, res) {
  awsAutoscaleKubernetesMongoFunctions.getUserInfoForDescription(req.user.username, res,req)
    .then(function (data) {
      if (data) {
        var awsdata = {
          "accessKeyId": data.awstoken,
          "secretAccessKey": data.awssecret,
          "region": data.awsregion,
          "s3BucketName": data.s3bucketname,
          "awsKeyName": data.awskeyname
        };
        var b = awsAutoscaleKubernetes.describeLoadBalancer(awsdata, req, res)
          .then(function (data) {
            if (data) {
              res.send(data);
            }
          });
      }
      else {
        res.send("fail")
      }
    });
});
router.post('/deployawsautoscale', function(req, res){
  var data = req.body;

  var appUrl =  data.giturl;
  var splitArr = appUrl.split('/');
  var appNameTemp = splitArr[splitArr.length -1];
  var appNametemparr = appNameTemp.split('.');
  var appName = appNametemparr[0];

  var awsDeployData =
    {
      "image": data.imageid,
      "launchConfig": {
        "name": 'awslaunchconfig',
        "typeInst": data.typeInst
      },
      "targetGroupConfig": {
        "name": 'awstargetgroup',
        "vpcId": ''
      },
      "autoScale": {
        "name": 'awsautoscale',
        "maxInst": data.maxInst,
        "minInst": data.minInst,
        "subnet": ""+data.awssubnetid,
        "upPolicy": {
          "name": 'awsautoscaleUpPolicy',
          "adjustmentType": data.adjustmentType,
          "metricAggregationType": data.metricAggregationType,
          "policyType": data.policyType,
          "scalingAdjustment": data.scalingAdjustmentUp,
          "alarm": {
            "name": 'awsautoscaleUpPolicyAlarm_increase',
            "ComparisonOperator": "GreaterThanOrEqualToThreshold",
            "metricName": data.metricName,
            "threshold": data.threshold,
            "description": "Scaling Up if increase above threshold",
            "Statistic":  "Average",
            "Unit": "Percent"
          }
        },
        "downPolicy": {
          "name": 'awsautoscaledownPolicy',
          "adjustmentType": data.adjustmentType,
          "metricAggregationType": data.metricAggregationType,
          "policyType": data.policyType,
          "scalingAdjustment": '-' + data.scalingAdjustmentDown,
          "alarm": {
            "name": 'awsautoscaleDownPolicyAlarm_Decrease',
            "ComparisonOperator": "LessThanOrEqualToThreshold",
            "metricName": data.metricName,
            "threshold": data.threshold,
            "description": "Scaling down below the threshhold",
            "Statistic":  "Average",
            "Unit": "Percent"
          }
        }
      },
      "loadBal":{
        "name": 'awsloadbal',
        "subnetsArr":[ ""+data.awssubnetid,""+data.awssubnetid2
          /* more items */
          ],
      },
      "application":{
        "giturl": data.giturl,
        "port": data.appPort,
        "name": appName
      }
    };

  console.log(JSON.stringify(awsDeployData));
  var awsdata = {
    "accessKeyId": data.awstoken,
    "secretAccessKey": data.awssecret,
    "region": data.awsregion,
    "s3BucketName": data.s3bucketname,
    "awsKeyName": data.awskeyname,
    "securityId": [data.awssecurityid]
  };
  var kubedata = {
      "master": {
        "image": data.imageid,
        "name": 'MasterNode',
      },
      "minion": {
        "image": data.imageid,
        "name": 'MinionNode',
      },
      "scalingParams": {
        //"policy": data.scalingParam,
        "cpuPercent": data.podCpuPercent,
        "numMinPods": data.numMinPods,
        "numMaxPods": data.numMaxPods
      },
      "application": {
        "dockerId": "",
        "type": "",
        "name": "movie"
      }
  };

  awsAutoscaleKubernetes.deployAutoscaler(req.user.username,awsDeployData,kubedata, awsdata,req, res);
});
router.get('/terminate', function(req, res) {
  awsAutoscaleKubernetesMongoFunctions.getUserInfoForDescription(req.user.username, res,req)
    .then(function (data) {
      if (data) {
        var awsdata = {
          "accessKeyId": data.awstoken,
          "secretAccessKey": data.awssecret,
          "region": data.awsregion,
          "s3BucketName": data.s3bucketname,
          "awsKeyName": data.awskeyname
        };
        var b = awsAutoscaleKubernetes.terminateAutoScale(awsdata, req.user.username, req, res);
      }
      else {
        res.send("fail")
      }
    });
});
router.get('/tables', function(req, res){
  res.render('awskubernetes/tables', {layout: '../awskubernetes/layouts/main',user: req.user} );
});
router.get('/timelineKubernetes', function(req, res){
  res.render('awskubernetes/timeline', {layout: '../awskubernetes/layouts/main',user: req.user} );
});
router.get('/getPodsList', function(req, res) {

  awsAutoscaleKubernetesMongoFunctions.getMasterIp(req.user.username)
    .then(function (ip) {
      if (ip) {
        var url= "http://"+ip+":8001/api/v1/pods";
        console.log(url);
        request({
          url: url,
          method: "GET",
          json: true,
          headers: {
            "content-type": "application/json",
          }
        }, function(error, response, body) {
          if (!error && response.statusCode === 200) {
            var dataToSend = awsAutoscaleKubernetes.loadPodTableList( ['name', 'namespace', 'creationTimestamp'], 'nodeName', 'phase', 'conditions',  body.items);
            res.send(dataToSend);
          }
        });
      }
      else {
        console.log("ip not found");
        var dataToSend = awsAutoscaleKubernetes.loadPodTableList( ['name', 'namespace', 'creationTimestamp'], 'nodeName', 'phase', 'conditions',  body.items);
        res.send(dataToSend);
      }
    });
});
router.get('/getTimeLineData', function(req, res) {
  awsAutoscaleKubernetesMongoFunctions.getMasterIp(req.user.username)
    .then(function (ip) {
      if (ip) {
        var url= "http://"+ip+":8001/api/v1/events";
        console.log(url);
        request({
          url: url,
          method: "GET",
          json: true,
          headers: {
            "content-type": "application/json",
          }
        }, function(error, response, body) {
          if (!error && response.statusCode === 200) {
            var dataToSend = awsAutoscaleKubernetes.loadTableTimeline(body.items);
            res.send(dataToSend);
          }
        });
      }
      else {
        console.log("ip not found");
        var dataToSend = awsAutoscaleKubernetes.loadTableTimeline(body.items);
        res.send(dataToSend);
      }
    });
});
router.get('/getAutoScalingList', function(req, res) {
  awsAutoscaleKubernetesMongoFunctions.getMasterIp(req.user.username)
    .then(function (ip) {
      if (ip) {
        var url= "http://"+ip+":8001/apis/autoscaling/v1/horizontalpodautoscalers/"
        request({
          url: url,
          method: "GET",
          json: true,
          headers: {
            "content-type": "application/json",
          }
        }, function(error, response, body) {
          if (!error && response.statusCode === 200) {
            var dataToSend = awsAutoscaleKubernetes.loadHpaList(['name','namespace', 'creationTimestamp'], body.items);
            res.send(dataToSend);
          }
        });
      }
      else {
        console.log("ip not found");
        var dataToSend = awsAutoscaleKubernetes.loadHpaList(['name','namespace', 'creationTimestamp'], body.items);
        res.send(dataToSend);
      }
    });
});
router.get('/getServicesList', function(req, res) {
  awsAutoscaleKubernetesMongoFunctions.getMasterIp(req.user.username)
    .then(function (ip) {
      if (ip) {
        var url= "http://"+ip+":8001/api/v1/services/";
        console.log(url);
        request({
          url: url,
          method: "GET",
          json: true,
          headers: {
            "content-type": "application/json",
          }
        }, function(error, response, body) {
          if (!error && response.statusCode === 200) {
            var dataToSend = awsAutoscaleKubernetes.loadTableServices( ['name', 'namespace', 'creationTimestamp'], body.items);
            res.send(dataToSend);
          }
        });
      }
      else {
        console.log("ip not found");
        var dataToSend = awsAutoscaleKubernetes.loadTableServices( ['name', 'namespace', 'creationTimestamp'], body.items);
        res.send(dataToSend);
      }
    });
});
router.get('/getReplicationControllers', function(req, res) {
  awsAutoscaleKubernetesMongoFunctions.getMasterIp(req.user.username)
    .then(function (ip) {
      if (ip) {
        var url= "http://"+ip+":8001/api/v1/replicationcontrollers/";
        console.log(url);
        request({
          url: url,
          method: "GET",
          json: true,
          headers: {
            "content-type": "application/json",
          }
        }, function(error, response, body) {
          if (!error && response.statusCode === 200) {
            var dataToSend = awsAutoscaleKubernetes.loadReplicationControllerList( ['name', 'namespace', 'creationTimestamp'], body.items);
            res.send(dataToSend);
          }
        });
      }
      else {
        console.log("ip not found");
        var dataToSend = awsAutoscaleKubernetes.loadReplicationControllerList( ['name', 'namespace', 'creationTimestamp'], body.items);
        res.send(dataToSend);
      }
    });
});
router.get('/getNodesData', function(req, res) {
  awsAutoscaleKubernetesMongoFunctions.getMasterIp(req.user.username)
    .then(function (ip) {
      if (ip) {
        var url= "http://"+ip+":8001/api/v1/nodes/";
        console.log(url);
        request({
          url: url,
          method: "GET",
          json: true,
          headers: {
            "content-type": "application/json",
          }
        }, function(error, response, body) {
          if (!error && response.statusCode === 200) {
            var dataToSend = awsAutoscaleKubernetes.loadNodeList(['name', 'creationTimestamp'], body.items);
            res.send(dataToSend);
          }
        });
      }
      else {
        console.log("ip not found");
        var dataToSend = awsAutoscaleKubernetes.loadNodeList(['name', 'creationTimestamp'], body.items);
        res.send(dataToSend);
      }
    });
});
router.post('/getLoadKubernetesData', function(req,res){
  formElements = req.body;
  var loadTestName = formElements.testName;
  var timestamp = [];
  var desiredReplicas = [];
  var currentReplicas = [];
  var avblReplicas = [];
  var cpuPercentageCurrent = [];
  var cpuPercentageAvg = [];
  var k= 0;
  awsAutoscaleKubernetesMongoFunctions.getLoadKubernetesData(req.user.username,loadTestName)
    .then(function (dataArr) {
      try{
        console.log(dataArr.length);
        if (dataArr.length) {
          k = dataArr.length;
          for (i = 0; i < dataArr.length; i++) {
            timestamp.push(dataArr[i].time);
            if(dataArr[i].data.hpaInfo[0]){
              desiredReplicas.push(dataArr[i].data.hpaInfo[0].desiredReplicas);
              currentReplicas.push(dataArr[i].data.hpaInfo[0].currentReplicas);
              if (dataArr[i].data.hpaInfo[0].statsCurrent[0]) {
                cpuPercentageAvg.push(dataArr[i].data.hpaInfo[0].statsCurrent[0].currentAverageUtilization);
                cpuPercentageCurrent.push(dataArr[i].data.hpaInfo[0].currentCPUUtilizationPercentage);
              }
              else {
                cpuPercentageAvg.push(0);
                cpuPercentageCurrent.push(0);
              }
            }
            else
            {
              desiredReplicas.push(0);
              currentReplicas.push(0);
              cpuPercentageAvg.push(0);
              cpuPercentageCurrent.push(0);
            }
            if(dataArr[i].data.rpcInfo[0])
              avblReplicas.push(dataArr[i].data.rpcInfo[0].availableReplicas);
            else
              avblReplicas.push(0);

          }
          var allData = {
            "timestamp": timestamp,
            "desiredReplicas": desiredReplicas,
            "currentReplicas": currentReplicas,
            "avblReplicas": avblReplicas,
            "cpuPercentageAvg": cpuPercentageAvg,
            "cpuPercentageCurrent": cpuPercentageCurrent
          }
          res.send(allData);
        }

        else {
          var allData = {
            "timestamp" : '',
            "desiredReplicas" : '',
            "currentReplicas" : '',
            "cpuPercentageAvg" : '',
            "cpuPercentageCurrent" : ''
          }
          res.send(allData);
        }
      }catch(err) {
        console.log(err);
      }
    });
});
router.post('/getautoScaleData', function(req,res){
  formElements = req.body;
  var loadTestName = formElements.testName;
  var timestamp = [];
  var desiredInstances = [];
  var currentInstances = [];
  var cpuPercentageAvg = [];
  var k= 0;
  awsAutoscaleKubernetesMongoFunctions.getAutoscaleData(req.user.username,loadTestName)
    .then(function (dataArr) {
      try{
        console.log(dataArr.length);
        if (dataArr.length) {
          k = dataArr.length;
          for (i = 0; i < dataArr.length; i++) {
            timestamp.push(dataArr[i].time);
            desiredInstances.push(dataArr[i].data.DesiredCapacity);
            currentInstances.push(dataArr[i].data.Instances);
            cpuPercentageAvg.push(dataArr[i].cpuUtilization.Datapoints[0].Average);
          }
          var allData = {
            "timestamp": timestamp,
            "desiredInstances": desiredInstances,
            "currentInstances": currentInstances,
            "cpuPercentage": cpuPercentageAvg
          };
          res.send(allData);
        }

        else {
          var allData = {
            "timestamp" : '',
            "desiredInstances" : '',
            "currentInstances" : '',
            "cpuPercentage" : ''
          };
          res.send(allData);
        }
      }catch(err) {
        console.log(err);
      }
    });
});
router.post('/getLoadTestTimelineData', function(req,res){
  formElements = req.body;
  var loadTestName = formElements.testName;
  awsAutoscaleKubernetesMongoFunctions.getLoadTestTimelineData(req.user.username,loadTestName)
    .then(function (data) {
      var allData ={};
      if (data.length) {
        for(i=0;i< data.length;i++)
        {
          if(typeof(allData['' + data[i].name])=="undefined")
          {
            allData['' + data[i].name] = {};
          }
          allData['' + data[i].name]["kind"] = data[i].kind;
          allData[''+data[i].name]["namespace"] = data[i].namespace;

          if(typeof(allData['' + data[i].name][''+data[i].reason])=="undefined")
          {
            allData['' + data[i].name][''+data[i].reason] = {};
          }
          allData[''+data[i].name][''+data[i].reason]["firstTimestamp"] = Date.parse(data[i].firstTimestamp)/1000;
          allData[''+data[i].name][''+data[i].reason]["lastTimestamp"] = Date.parse(data[i].lastTimestamp)/1000;
          allData[''+data[i].name][''+data[i].reason]["count"] = data[i].count;
          allData[''+data[i].name][''+data[i].reason]["message"] = data[i].message;
        }


        res.send(allData);
      }
      else {
        var allData = {};
        res.send(allData);
      }
    });
});


router.get('/edituserInfo', function(req, res){
  funct.getUserInfoforEdit(req.user.username, res,req);
});

router.post('/loadTest', function(req,res){
  formElements = req.body;
  var startTime = new Date().getTime();
  var loadTestName = formElements.testName;
  var startTime = new Date().getTime();
  awsAutoscaleKubernetesMongoFunctions.setManualRecording(req.user.username, false)
    .then(function (set) {
      if (set) {
        console.log("Diabled Manual");
        awsAutoscaleKubernetesMongoFunctions.setLoadTestRecording(req.user.username, loadTestName, true)
          .then(function (set) {
            if (set) {
              console.log("Enabled");

              var interval = setInterval(function () {
                if (new Date().getTime() - startTime > formElements["maxTime"] * 1000 + 600000) {
                  clearInterval(interval);
                  return;
                }
                awsAutoscaleKubernetesMongoFunctions.getMasterIp(req.user.username)
                  .then(function (ip) {
                    if (ip) {
                      var objUrl = {
                        "urlEvents": "http://" + ip + ":8001/api/v1/events",
                        "urlPods": "http://" + ip + ":8001/api/v1/pods",
                        "urlContainers": "http://" + ip + ":8001/api/v1/pods",
                        "urlHpa": "http://" + ip + ":8001/apis/autoscaling/v1/horizontalpodautoscalers/",
                        "urlServices": "http://" + ip + ":8001/api/v1/services/",
                        "urlRpc": "http://" + ip + ":8001/api/v1/replicationcontrollers/",
                        "urlNodes": "http://" + ip + ":8001/api/v1/nodes/"
                      }
                      awsAutoscaleKubernetes.saveKubernetesDataLoadTest(req.user.username, loadTestName, objUrl);
                    }
                  });

              }, 2000);
              var interval = setInterval(function () {
                if (new Date().getTime() - startTime > formElements["maxTime"] * 1000 + 600000) {
                  clearInterval(interval);
                  return;
                }
                awsAutoscaleKubernetesMongoFunctions.getUserInfoForDescription(req.user.username, res,req)
                  .then(function (data) {
                    if (data) {
                      var awsdata = {
                        "accessKeyId": data.awstoken,
                        "secretAccessKey": data.awssecret,
                        "region": data.awsregion,
                        "s3BucketName": data.s3bucketname,
                        "awsKeyName": data.awskeyname
                      };
                      awsAutoscaleKubernetes.saveAutoscalingGroupData(awsdata,req.user.username,loadTestName);
                    }
                  });

              }, 2000);

              awsAutoscaleKubernetesMongoFunctions.getServiceURL(req.user.username)
                .then(function (url) {
                  if (url) {
                    console.log("Found URL informtion");
                    var options = '';
                    var username = req.user.username;
                    options = {
                      url: 'http://' + url + '/api/test',
                      concurrency: formElements["numConcurrClients"], //How many clients to start in parallel.
                      maxRequests: formElements["maxRequests"], //A max number of requests; after they are reached the test will end.
                      timeout: formElements["maxTimeOut"], //Timeout for each generated request in milliseconds. Setting this to 0 disables timeout (default).
                      requestsPerSecond: formElements["maxRequestsPerSecond"], //How many requests each client will send per second.
                      maxSeconds: formElements["maxTime"],
                      statusCallback: function statusCallback(error, result, latency) {
                        var timeStamp = new Date().getTime();
                        var testData = {
                          "time":timeStamp,
                          "error": error,
                          "result": result,
                          "latency": latency
                        }
                        awsAutoscaleKubernetesMongoFunctions.addLoadTestRequestData(username, loadTestName, testData);
                      }
                    };

                    loadtest.loadTest(options, function (error) {
                      if (error) {
                        console.error('Got an error: %s', error);
                      }
                      console.log('Tests run successfully');
                    });
                    // here neet to trigger load and save the data
                    // save information of kubernetes every one second
                    res.render('awskubernetes/success', {
                      layout: '../awskubernetes/layouts/main',
                      user: req.user.username,
                      dataForm: "Request send to Server, Plese check the graphs after the test is over",
                      dataClient: "Request send to Server, Plese check the graphs after the test is over"
                    });
                  }
                  else {
                    console.log("url not found");
                    res.render('awskubernetes/failure', {
                      layout: '../awskubernetes/layouts/main',
                      user: req.user.username,
                      error: "App Service Is not running, PLease deploy first and then run"
                    });
                  }
                });
            }
            else {
              console.log("Error");
            }
          });
      }
    });
});
router.post('/triangleLoadTest', function(req,res){
  formElements = req.body;
  var startTime = new Date().getTime();
  var loadTestName = formElements.testName;
  var startTime = new Date().getTime();
  awsAutoscaleKubernetesMongoFunctions.setManualRecording(req.user.username, false)
    .then(function (set) {
      if (set) {
        console.log("Diabled Manual");
        awsAutoscaleKubernetesMongoFunctions.setLoadTestRecording(req.user.username, loadTestName, true)
          .then(function (set) {
            if (set) {
              console.log("Enabled");

              var intervalKube = setInterval(function () {
                if (new Date().getTime() - startTime > 4000000) {
                  clearInterval(intervalKube);
                  return;
                }
                awsAutoscaleKubernetesMongoFunctions.getMasterIp(req.user.username)
                  .then(function (ip) {
                    if (ip) {
                      var objUrl = {
                        "urlEvents": "http://" + ip + ":8001/api/v1/events",
                        "urlPods": "http://" + ip + ":8001/api/v1/pods",
                        "urlContainers": "http://" + ip + ":8001/api/v1/pods",
                        "urlHpa": "http://" + ip + ":8001/apis/autoscaling/v1/horizontalpodautoscalers/",
                        "urlServices": "http://" + ip + ":8001/api/v1/services/",
                        "urlRpc": "http://" + ip + ":8001/api/v1/replicationcontrollers/",
                        "urlNodes": "http://" + ip + ":8001/api/v1/nodes/"
                      }
                      awsAutoscaleKubernetes.saveKubernetesDataLoadTest(req.user.username, loadTestName, objUrl);
                    }
                  });

              }, 2000);
              var intervalAws = setInterval(function () {
                if (new Date().getTime() - startTime > 4000000) {
                  clearInterval(intervalAws);
                  return;
                }
                awsAutoscaleKubernetesMongoFunctions.getUserInfoForDescription(req.user.username, res,req)
                  .then(function (data) {
                    if (data) {
                      var awsdata = {
                        "accessKeyId": data.awstoken,
                        "secretAccessKey": data.awssecret,
                        "region": data.awsregion,
                        "s3BucketName": data.s3bucketname,
                        "awsKeyName": data.awskeyname
                      };
                      awsAutoscaleKubernetes.saveAutoscalingGroupData(awsdata,req.user.username,loadTestName);
                    }
                  });

              }, 2000);
              var requests = 1;
              res.render('awskubernetes/success', {
                layout: '../awskubernetes/layouts/main',
                user: req.user.username,
                dataForm: "Request send to Server, Plese check the graphs after the test is over",
                dataClient: "Request send to Server, Plese check the graphs after the test is over"
              });
              var intervalReq = setInterval(function () {
                if (new Date().getTime() - startTime > 1200000 || requests > 10000) {
                  clearInterval(intervalReq);
                  return;
                }
                awsAutoscaleKubernetesMongoFunctions.getServiceURL(req.user.username)
                  .then(function (url) {
                    if (url) {
                      console.log("Found URL informtion");
                      console.log(url);

                      console.log("requests"+requests);
                      var options = '';
                      var username = req.user.username;
                      options = {
                        url: 'http://'+url + '/api/test',
                        concurrency: formElements["numConcurrClients"], //How many clients to start in parallel.
                        maxRequests: requests * 10, //A max number of requests; after they are reached the test will end.
                        timeout: 6500, //Timeout for each generated request in milliseconds. Setting this to 0 disables timeout (default).
                        requestsPerSecond: requests, //How many requests each client will send per second.
                        //maxSeconds: formElements["maxTime"],
                        statusCallback: function statusCallback(error, result, latency) {
                          var timeStamp = new Date().getTime();
                          var testData = {
                            "time": timeStamp,
                            "error": error,
                            "result": result,
                            "latency": latency
                          }
                          awsAutoscaleKubernetesMongoFunctions.addLoadTestRequestData(username, loadTestName, testData);
                        }
                      };
                      loadtest.loadTest(options, function (error) {
                        if (error) {
                          console.error('Got an error: %s', error);
                        }
                        console.log('Tests run successfully');
                      });
                      if (((new Date().getTime() - startTime) < 600000)) {
                        requests+=5;
                      }
                      else {
                        requests-=5;
                        if (requests <= 0) {
                          requests += 20;
                        }
                      }
                    }
                  });
              }, 20000);
            }
            else {
              console.log("Error");
              res.render('awskubernetes/failure', {
                layout: '../awskubernetes/layouts/main',
                user: req.user.username,
                error: "App Service Is not running, PLease deploy first and then run"
              });
            }
          });
      }
    });
});
router.post('/linearIncreaseLoadTest', function(req,res){
  formElements = req.body;
  var startTime = new Date().getTime();
  var loadTestName = formElements.testName;
  var startTime = new Date().getTime();
  awsAutoscaleKubernetesMongoFunctions.setManualRecording(req.user.username, false)
    .then(function (set) {
      if (set) {
        console.log("Diabled Manual");
        awsAutoscaleKubernetesMongoFunctions.setLoadTestRecording(req.user.username, loadTestName, true)
          .then(function (set) {
            if (set) {
              console.log("Enabled");

              var intervalKube = setInterval(function () {
                if (new Date().getTime() - startTime > 4000000) {
                  clearInterval(intervalKube);
                  return;
                }
                awsAutoscaleKubernetesMongoFunctions.getMasterIp(req.user.username)
                  .then(function (ip) {
                    if (ip) {
                      var objUrl = {
                        "urlEvents": "http://" + ip + ":8001/api/v1/events",
                        "urlPods": "http://" + ip + ":8001/api/v1/pods",
                        "urlContainers": "http://" + ip + ":8001/api/v1/pods",
                        "urlHpa": "http://" + ip + ":8001/apis/autoscaling/v1/horizontalpodautoscalers/",
                        "urlServices": "http://" + ip + ":8001/api/v1/services/",
                        "urlRpc": "http://" + ip + ":8001/api/v1/replicationcontrollers/",
                        "urlNodes": "http://" + ip + ":8001/api/v1/nodes/"
                      }
                      awsAutoscaleKubernetes.saveKubernetesDataLoadTest(req.user.username, loadTestName, objUrl);
                    }
                  });

              }, 2000);
              var intervalAws = setInterval(function () {
                if (new Date().getTime() - startTime > 4000000) {
                  clearInterval(intervalAws);
                  return;
                }
                awsAutoscaleKubernetesMongoFunctions.getUserInfoForDescription(req.user.username, res,req)
                  .then(function (data) {
                    if (data) {
                      var awsdata = {
                        "accessKeyId": data.awstoken,
                        "secretAccessKey": data.awssecret,
                        "region": data.awsregion,
                        "s3BucketName": data.s3bucketname,
                        "awsKeyName": data.awskeyname
                      };
                      awsAutoscaleKubernetes.saveAutoscalingGroupData(awsdata,req.user.username,loadTestName);
                    }
                  });

              }, 2000);
              var requests = 1;
              res.render('awskubernetes/success', {
                layout: '../awskubernetes/layouts/main',
                user: req.user.username,
                dataForm: "Request send to Server, Plese check the graphs after the test is over",
                dataClient: "Request send to Server, Plese check the graphs after the test is over"
              });
              var intervalReq = setInterval(function () {
                if (new Date().getTime() - startTime > 1200000 || requests > 10000) {
                  clearInterval(intervalReq);
                  return;
                }
                awsAutoscaleKubernetesMongoFunctions.getServiceURL(req.user.username)
                  .then(function (url) {
                    if (url) {
                      console.log("Found URL informtion");
                      console.log(url);

                      console.log("requests"+requests);
                      var options = '';
                      var username = req.user.username;
                      options = {
                        url: 'http://'+url + '/api/test',
                        concurrency: formElements["numConcurrClients"], //How many clients to start in parallel.
                        maxRequests: requests * 10, //A max number of requests; after they are reached the test will end.
                        timeout: 6500, //Timeout for each generated request in milliseconds. Setting this to 0 disables timeout (default).
                        requestsPerSecond: requests, //How many requests each client will send per second.
                        //maxSeconds: formElements["maxTime"],
                        statusCallback: function statusCallback(error, result, latency) {
                          var timeStamp = new Date().getTime();
                          var testData = {
                            "time": timeStamp,
                            "error": error,
                            "result": result,
                            "latency": latency
                          }
                          awsAutoscaleKubernetesMongoFunctions.addLoadTestRequestData(username, loadTestName, testData);
                        }
                      };
                      loadtest.loadTest(options, function (error) {
                        if (error) {
                          console.error('Got an error: %s', error);
                        }
                        console.log('Tests run successfully');
                      });
                      requests+=2;
                    }
                  });
              }, 20000);
            }
            else {
              console.log("Error");
              res.render('awskubernetes/failure', {
                layout: '../awskubernetes/layouts/main',
                user: req.user.username,
                error: "App Service Is not running, PLease deploy first and then run"
              });
            }
          });
      }
    });
});
router.post('/linearIncreaseConstantLoadTest', function(req,res){
  formElements = req.body;
  var startTime = new Date().getTime();
  var loadTestName = formElements.testName;
  var startTime = new Date().getTime();
  awsAutoscaleKubernetesMongoFunctions.setManualRecording(req.user.username, false)
    .then(function (set) {
      if (set) {
        console.log("Diabled Manual");
        awsAutoscaleKubernetesMongoFunctions.setLoadTestRecording(req.user.username, loadTestName, true)
          .then(function (set) {
            if (set) {
              console.log("Enabled");

              var intervalKube = setInterval(function () {
                if (new Date().getTime() - startTime > 4000000) {
                  clearInterval(intervalKube);
                  return;
                }
                awsAutoscaleKubernetesMongoFunctions.getMasterIp(req.user.username)
                  .then(function (ip) {
                    if (ip) {
                      var objUrl = {
                        "urlEvents": "http://" + ip + ":8001/api/v1/events",
                        "urlPods": "http://" + ip + ":8001/api/v1/pods",
                        "urlContainers": "http://" + ip + ":8001/api/v1/pods",
                        "urlHpa": "http://" + ip + ":8001/apis/autoscaling/v1/horizontalpodautoscalers/",
                        "urlServices": "http://" + ip + ":8001/api/v1/services/",
                        "urlRpc": "http://" + ip + ":8001/api/v1/replicationcontrollers/",
                        "urlNodes": "http://" + ip + ":8001/api/v1/nodes/"
                      }
                      awsAutoscaleKubernetes.saveKubernetesDataLoadTest(req.user.username, loadTestName, objUrl);
                    }
                  });

              }, 2000);
              var intervalAws = setInterval(function () {
                if (new Date().getTime() - startTime > 4000000) {
                  clearInterval(intervalAws);
                  return;
                }
                awsAutoscaleKubernetesMongoFunctions.getUserInfoForDescription(req.user.username, res,req)
                  .then(function (data) {
                    if (data) {
                      var awsdata = {
                        "accessKeyId": data.awstoken,
                        "secretAccessKey": data.awssecret,
                        "region": data.awsregion,
                        "s3BucketName": data.s3bucketname,
                        "awsKeyName": data.awskeyname
                      };
                      awsAutoscaleKubernetes.saveAutoscalingGroupData(awsdata,req.user.username,loadTestName);
                    }
                  });

              }, 2000);
              var requests = 1;
              res.render('awskubernetes/success', {
                layout: '../awskubernetes/layouts/main',
                user: req.user.username,
                dataForm: "Request send to Server, Plese check the graphs after the test is over",
                dataClient: "Request send to Server, Plese check the graphs after the test is over"
              });
              var intervalReq = setInterval(function () {
                if (new Date().getTime() - startTime > 1200000 || requests > 10000) {
                  clearInterval(intervalReq);
                  return;
                }
                awsAutoscaleKubernetesMongoFunctions.getServiceURL(req.user.username)
                  .then(function (url) {
                    if (url) {
                      console.log("Found URL informtion");
                      console.log(url);

                      console.log("requests"+requests);
                      var options = '';
                      var username = req.user.username;
                      options = {
                        url: 'http://'+url + '/api/test',
                        concurrency: formElements["numConcurrClients"], //How many clients to start in parallel.
                        maxRequests: requests * 10, //A max number of requests; after they are reached the test will end.
                        timeout: 6500, //Timeout for each generated request in milliseconds. Setting this to 0 disables timeout (default).
                        requestsPerSecond: requests, //How many requests each client will send per second.
                        //maxSeconds: formElements["maxTime"],
                        statusCallback: function statusCallback(error, result, latency) {
                          var timeStamp = new Date().getTime();
                          var testData = {
                            "time": timeStamp,
                            "error": error,
                            "result": result,
                            "latency": latency
                          }
                          awsAutoscaleKubernetesMongoFunctions.addLoadTestRequestData(username, loadTestName, testData);
                        }
                      };
                      loadtest.loadTest(options, function (error) {
                        if (error) {
                          console.error('Got an error: %s', error);
                        }
                        console.log('Tests run successfully');
                      });
                      if(((new Date().getTime() - startTime) < 600000) && requests < 10000)
                      {
                        requests+=5;

                      }
                      else
                      {
                        // the requests will be fixed now
                      }
                    }
                  });
              }, 20000);
            }
            else {
              console.log("Error");
              res.render('awskubernetes/failure', {
                layout: '../awskubernetes/layouts/main',
                user: req.user.username,
                error: "App Service Is not running, PLease deploy first and then run"
              });
            }
          });
      }
    });
});
router.post('/upDownLoadTest', function(req,res){
  formElements = req.body;
  var startTime = new Date().getTime();
  var loadTestName = formElements.testName;
  var startTime = new Date().getTime();
  awsAutoscaleKubernetesMongoFunctions.setManualRecording(req.user.username, false)
    .then(function (set) {
      if (set) {
        console.log("Diabled Manual");
        awsAutoscaleKubernetesMongoFunctions.setLoadTestRecording(req.user.username, loadTestName, true)
          .then(function (set) {
            if (set) {
              console.log("Enabled");

              var intervalKube = setInterval(function () {
                if (new Date().getTime() - startTime > 4000000) {
                  clearInterval(intervalKube);
                  return;
                }
                awsAutoscaleKubernetesMongoFunctions.getMasterIp(req.user.username)
                  .then(function (ip) {
                    if (ip) {
                      var objUrl = {
                        "urlEvents": "http://" + ip + ":8001/api/v1/events",
                        "urlPods": "http://" + ip + ":8001/api/v1/pods",
                        "urlContainers": "http://" + ip + ":8001/api/v1/pods",
                        "urlHpa": "http://" + ip + ":8001/apis/autoscaling/v1/horizontalpodautoscalers/",
                        "urlServices": "http://" + ip + ":8001/api/v1/services/",
                        "urlRpc": "http://" + ip + ":8001/api/v1/replicationcontrollers/",
                        "urlNodes": "http://" + ip + ":8001/api/v1/nodes/"
                      }
                      awsAutoscaleKubernetes.saveKubernetesDataLoadTest(req.user.username, loadTestName, objUrl);
                    }
                  });

              }, 2000);
              var intervalAws = setInterval(function () {
                if (new Date().getTime() - startTime > 4000000) {
                  clearInterval(intervalAws);
                  return;
                }
                awsAutoscaleKubernetesMongoFunctions.getUserInfoForDescription(req.user.username, res,req)
                  .then(function (data) {
                    if (data) {
                      var awsdata = {
                        "accessKeyId": data.awstoken,
                        "secretAccessKey": data.awssecret,
                        "region": data.awsregion,
                        "s3BucketName": data.s3bucketname,
                        "awsKeyName": data.awskeyname
                      };
                      awsAutoscaleKubernetes.saveAutoscalingGroupData(awsdata,req.user.username,loadTestName);
                    }
                  });

              }, 2000);
              var requests = 1;
              var flag = true;
              res.render('awskubernetes/success', {
                layout: '../awskubernetes/layouts/main',
                user: req.user.username,
                dataForm: "Request send to Server, Plese check the graphs after the test is over",
                dataClient: "Request send to Server, Plese check the graphs after the test is over"
              });
              var intervalReq = setInterval(function () {
                if (new Date().getTime() - startTime > 1200000 || requests > 10000) {
                  clearInterval(intervalReq);
                  return;
                }
                awsAutoscaleKubernetesMongoFunctions.getServiceURL(req.user.username)
                  .then(function (url) {
                    if (url) {
                      console.log("Found URL informtion");
                      console.log(url);

                      console.log("requests"+requests);
                      var options = '';
                      var username = req.user.username;
                      options = {
                        url: 'http://'+url + '/api/test',
                        concurrency: formElements["numConcurrClients"], //How many clients to start in parallel.
                        maxRequests: requests * 10, //A max number of requests; after they are reached the test will end.
                        timeout: 6500, //Timeout for each generated request in milliseconds. Setting this to 0 disables timeout (default).
                        requestsPerSecond: requests, //How many requests each client will send per second.
                        //maxSeconds: formElements["maxTime"],
                        statusCallback: function statusCallback(error, result, latency) {
                          var timeStamp = new Date().getTime();
                          var testData = {
                            "time": timeStamp,
                            "error": error,
                            "result": result,
                            "latency": latency
                          }
                          awsAutoscaleKubernetesMongoFunctions.addLoadTestRequestData(username, loadTestName, testData);
                        }
                      };
                      loadtest.loadTest(options, function (error) {
                        if (error) {
                          console.error('Got an error: %s', error);
                        }
                        console.log('Tests run successfully');
                      });
                      if(flag)
                      {
                        requests = 10 + Math.floor((Math.random() * 40) + 1);
                        flag=false;
                      }
                      else
                      {
                        requests = 50 - Math.floor((Math.random() * 40) + 1);
                        flag=true;
                      }
                    }
                  });
              }, 20000);
            }
            else {
              console.log("Error");
              res.render('awskubernetes/failure', {
                layout: '../awskubernetes/layouts/main',
                user: req.user.username,
                error: "App Service Is not running, PLease deploy first and then run"
              });
            }
          });
      }
    });
});


router.post('/getLoadTestData', function(req,res){
  formElements = req.body;
  var loadTestName = formElements.testName;

  var datarequestElapsedS = [];
  var datatotalTimeSeconds=[];
  var requestIndex = [];
  var maxLatency = [];
  var minLatency = [];
  var meanLatency = [];
  var barRPS = [];
  var totalTimeSeconds = [];
  var errors = [];
  awsAutoscaleKubernetesMongoFunctions.getTestData(req.user.username,loadTestName)
    .then(function (data) {
      if (data.length) {

        for(i=0;i<data.length;i++)
        {
          requestIndex.push(data[i].time);
          datarequestElapsedS.push(data[i].result.requestElapsed);
          datatotalTimeSeconds.push(data[i].latency.totalTimeSeconds);
          maxLatency.push(data[i].latency.maxLatencyMs);
          minLatency.push(data[i].latency.minLatencyMs);
          meanLatency.push(data[i].latency.meanLatencyMs);
          barRPS.push(data[i].latency.rps);
          totalTimeSeconds.push(data[i].latency.totalTimeSeconds);
          errors.push(data[i].latency.totalErrors);
        }
        var allData = {
          "requestIndex" : requestIndex,
          "datarequestElapsed" : datarequestElapsedS,
          "datatotalTimeSeconds" : datatotalTimeSeconds,
          "maxLatency" : maxLatency,
          "minLatency" : minLatency,
          "meanLatency" : meanLatency,
          "barRPS" : barRPS,
          "totalTimeSeconds" : totalTimeSeconds,
          "errors" : errors
        }
        res.send(allData);
      }
      else {
        var allData = {
          "requestIndex" : '',
          "datarequestElapsed" : '',
          "datatotalTimeSeconds" : '',
          "maxLatency" : '',
          "minLatency" : '',
          "meanLatency" : '',
          "barRPS" : '',
          "totalTimeSeconds" : '',
          "errors" : ''
        }
        res.send(allData);
      }
    });
});
router.get('/startRecordingData', function(req,res){
  var startTime = new Date().getTime();
  awsAutoscaleKubernetesMongoFunctions.setManualRecording(req.user.username, true)
    .then(function (set) {
      if (set) {
        console.log("Enabled");
        res.render('awskubernetes/success', {
          layout: '../awskubernetes/layouts/main',
          user: req.user.username,
          dataForm: "Started",
          dataClient: "Started"
        });
      }
      else {
        console.log("Error");
      }
    });
  var interval = setInterval(function () {
    awsAutoscaleKubernetesMongoFunctions.getManualRecording(req.user.username)
      .then(function (enable) {
        if (enable) {
          awsAutoscaleKubernetesMongoFunctions.getMasterIp(req.user.username)
            .then(function (ip) {
              if (ip) {
                console.log(ip);
                var objUrl = {
                  "urlEvents": "http://" + ip + ":8001/api/v1/events",
                  "urlPods": "http://" + ip + ":8001/api/v1/pods",
                  "urlContainers": "http://" + ip + ":8001/api/v1/pods",
                  "urlHpa": "http://" + ip + ":8001/apis/autoscaling/v1/horizontalpodautoscalers/",
                  "urlServices": "http://" + ip + ":8001/api/v1/services/",
                  "urlRpc": "http://" + ip + ":8001/api/v1/replicationcontrollers/",
                  "urlNodes": "http://" + ip + ":8001/api/v1/nodes/"
                }
                awsAutoscaleKubernetes.saveKubernetesData(req.user.username, objUrl);
              }
            });
        }
        else
        {
          clearInterval(interval);
          return;
        }
      });
  }, 2000);
});

router.get('/stopRecordingData', function(req,res){
  var startTime = new Date().getTime();
  awsAutoscaleKubernetesMongoFunctions.setManualRecording(req.user.username, false)
    .then(function (set) {
      if (set) {
        console.log("Stopped");
        res.render('awskubernetes/success', {
          layout: '../awskubernetes/layouts/main',
          user: req.user.username,
          dataForm: "Stopped",
          dataClient: "Stopped"
        });
      }
      else {
        console.log("Error");
        res.render('awskubernetes/failure', {
          layout: '../awskubernetes/layouts/main',
          user: req.user.username,
          error: "Not able to stop"
        });
      }
    });
});

router.get('/getCurrentData', function(req,res){

  awsAutoscaleKubernetesMongoFunctions.getUserInfoForDescription(req.user.username, res,req)
    .then(function (data) {
      if (data) {
        var awsdata = {
          "accessKeyId": data.awstoken,
          "secretAccessKey": data.awssecret,
          "region": data.awsregion,
          "s3BucketName": data.s3bucketname,
          "awsKeyName": data.awskeyname
        };
        var b = awsAutoscaleKubernetes.getCurrentData(awsdata, req.user.username, req, res);
      }
      else {
        console.log("fail");
        res.send("fail")
      }
    });


})
router.use(function(req, res, next){
  // the status option, or res.statusCode = 404
  // are equivalent, however with the option we
  // get the "status" local available as well
  //res.render('404',{user: req.user});
});
router.use(function(err, req, res, next){
  // we may use properties of the error object
  // here and next(err) appropriately, or if
  // we possibly recovered from the error, simply next().
  //res.render('500',{user: req.user});
});
//logs user out of site, deleting them from the session, and returns to homepage

module.exports = router;
