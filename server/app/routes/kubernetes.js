const express               = require('express');
const router                = express.Router();
const funct                 = require('../functions');
const passport              = require('passport');
const kube                  = require("../auto_scaling_solutions/kubernetes/index");
const kubeMongoFunctions    = require("../auto_scaling_solutions/kubernetes/kubeMongoFunctions");
var http                    = require('http');
var request                 = require('request');
var loadtest                 = require('loadtest');



//===============ROUTES=================
//displays our homepage
router.get('/', function(req, res){
  res.render('kubernetes/home',{layout: '../kubernetes/layouts/main',user: req.user} );
});
router.get('/charts', function(req, res){
  res.render('kubernetes/charts', {layout: '../kubernetes/layouts/main',user: req.user} );
});
router.get('/tables', function(req, res){
  res.render('kubernetes/tables', {layout: '../kubernetes/layouts/main',user: req.user} );
});
router.get('/timelineKubernetes', function(req, res){
  res.render('kubernetes/timeline', {layout: '../kubernetes/layouts/main',user: req.user} );
});
router.get('/edituserInfo', function(req, res){
  funct.getUserInfoforEdit(req.user.username, res,req);
});
router.get('/deploykubernetesAws', function(req, res){
  kubeMongoFunctions.getUserInfoforDeploy(req.user.username, res,req);
});
router.get('/loadtesthome', function(req, res){
  res.render('kubernetes/loadtesthome',{layout: '../kubernetes/layouts/main',user: req.user} );
});
router.get('/getPodsList', function(req, res) {

  kubeMongoFunctions.getMasterIp(req.user.username)
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
            var dataToSend = kube.loadPodTableList( ['name', 'namespace', 'creationTimestamp'], 'nodeName', 'phase', 'conditions',  body.items);
            res.send(dataToSend);
          }
        });
      }
      else {
        console.log("ip not found");
        var dataToSend = kube.loadPodTableList( ['name', 'namespace', 'creationTimestamp'], 'nodeName', 'phase', 'conditions',  body.items);
        res.send(dataToSend);
      }
    });
});
router.get('/getTimeLineData', function(req, res) {
  kubeMongoFunctions.getMasterIp(req.user.username)
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
            var dataToSend = kube.loadTableTimeline(body.items);
            res.send(dataToSend);
          }
        });
      }
      else {
        console.log("ip not found");
        var dataToSend = kube.loadTableTimeline(body.items);
        res.send(dataToSend);
      }
    });
});
router.get('/getAutoScalingList', function(req, res) {
  kubeMongoFunctions.getMasterIp(req.user.username)
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
            var dataToSend = kube.loadHpaList(['name','namespace', 'creationTimestamp'], body.items);
            res.send(dataToSend);
          }
        });
      }
      else {
        console.log("ip not found");
        var dataToSend = kube.loadHpaList(['name','namespace', 'creationTimestamp'], body.items);
        res.send(dataToSend);
      }
    });
});
router.get('/getServicesList', function(req, res) {
  kubeMongoFunctions.getMasterIp(req.user.username)
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
            var dataToSend = kube.loadTableServices( ['name', 'namespace', 'creationTimestamp'], body.items);
            res.send(dataToSend);
          }
        });
      }
      else {
        console.log("ip not found");
        var dataToSend = kube.loadTableServices( ['name', 'namespace', 'creationTimestamp'], body.items);
        res.send(dataToSend);
      }
    });
});
router.get('/getReplicationControllers', function(req, res) {
  kubeMongoFunctions.getMasterIp(req.user.username)
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
            var dataToSend = kube.loadReplicationControllerList( ['name', 'namespace', 'creationTimestamp'], body.items);
            res.send(dataToSend);
          }
        });
      }
      else {
        console.log("ip not found");
        var dataToSend = kube.loadReplicationControllerList( ['name', 'namespace', 'creationTimestamp'], body.items);
        res.send(dataToSend);
      }
    });
});
router.get('/getNodesData', function(req, res) {
  kubeMongoFunctions.getMasterIp(req.user.username)
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
            var dataToSend = kube.loadNodeList(['name', 'creationTimestamp'], body.items);
            res.send(dataToSend);
          }
        });
      }
      else {
        console.log("ip not found");
        var dataToSend = kube.loadNodeList(['name', 'creationTimestamp'], body.items);
        res.send(dataToSend);
      }
    });
});
router.get('/describeEc2Instances', function(req, res) {
  kubeMongoFunctions.getUserInfoForDescription(req.user.username, res,req)
    .then(function (data) {
      if (data) {
        var awsdata = {
          "accessKeyId": data.awstoken,
          "secretAccessKey": data.awssecret,
          "region": data.awsregion,
          "s3BucketName": data.s3bucketname,
          "awsKeyName": data.awskeyname
        };
        var b = kube.describeInstances(awsdata, req, res)
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
router.get('/terminateEc2Instances', function(req, res) {
  kubeMongoFunctions.getUserInfoForDescription(req.user.username, res,req)
    .then(function (data) {
      if (data) {
        var awsdata = {
          "accessKeyId": data.awstoken,
          "secretAccessKey": data.awssecret,
          "region": data.awsregion,
          "s3BucketName": data.s3bucketname,
          "awsKeyName": data.awskeyname
        };
        var b = kube.terminateInstances(awsdata, req.user.username, req, res);
      }
      else {
        res.send("fail")
      }
    });
});

router.post('/basicLoadTest', function(req,res){
  formElements = req.body;
  var startTime = new Date().getTime();
  kubeMongoFunctions.initLoadTest('testLoadTimeline')
    .then(function (removed) {
      var interval = setInterval(function () {
        if (new Date().getTime() - startTime > formElements["maxTime"] * 1000 + 600000) {
          clearInterval(interval);
          return;
        }
        kubeMongoFunctions.getMasterIp(req.user.username)
          .then(function (ip) {
            if (ip) {
              var url = "http://" + ip + ":8001/api/v1/events";
              console.log(url);
              request({
                url: url,
                method: "GET",
                json: true,
                headers: {
                  "content-type": "application/json",
                }
              }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                  kube.saveTableTimeline(body.items);
                }
                else
                {
                  console.log(error);
                }
              });
            }
          });

      }, 2000);
    });

  kubeMongoFunctions.initLoadTest('testLoad')
    .then(function (removed) {

      kubeMongoFunctions.getServiceURL(req.user.username)
        .then(function (url) {
          if (url) {
            console.log("Found URL informtion");
            var options = '';
            options = {
              url: url,
              concurrency: formElements["numConcurrClients"], //How many clients to start in parallel.
              maxRequests: formElements["maxRequests"], //A max number of requests; after they are reached the test will end.
              timeout: formElements["maxTimeOut"], //Timeout for each generated request in milliseconds. Setting this to 0 disables timeout (default).
              requestsPerSecond: formElements["maxRequestsPerSecond"], //How many requests each client will send per second.
              maxSeconds: formElements["maxTime"],
              statusCallback: statusCallback
            };

            loadtest.loadTest(options, function(error) {
              if (error) {
                console.error('Got an error: %s', error);
              }
              console.log('Tests run successfully');
            });
            // here neet to trigger load and save the data
            // save information of kubernetes every one second
            res.render('kubernetes/success', {
              layout: '../kubernetes/layouts/main',
              user: req.user.username,
              dataForm: "Request send to Server, Plese check the graphs after the test is over",
              dataClient: "Request send to Server, Plese check the graphs after the test is over"
            });
          }
          else {
            console.log("url not found");
            res.render('kubernetes/failure', {
              layout: '../kubernetes/layouts/main',
              user: req.user.username,
              error: "App Service Is not running, PLease deploy first and then run"
            });
          }
        });
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
  var k= 0;
  kubeMongoFunctions.getRequestTestData(req.user.username,loadTestName)
    .then(function (data) {
      try{
        if (data.length) {
          k = data.length;
          for (i = 0; i < data.length; i++) {
            if(data[i].result) {
              requestIndex.push(data[i].result.requestIndex);

              datarequestElapsedS.push(data[i].result.requestElapsed);
            }
            else
            {
              requestIndex.push(k);
              datarequestElapsedS.push("0");
              k++;
            }
            datatotalTimeSeconds.push(data[i].latency.totalTimeSeconds);
            maxLatency.push(data[i].latency.maxLatencyMs);
            minLatency.push(data[i].latency.minLatencyMs);
            meanLatency.push(data[i].latency.meanLatencyMs);
            barRPS.push(data[i].latency.rps);
            totalTimeSeconds.push(data[i].latency.totalTimeSeconds);
            errors.push(data[i].latency.totalErrors);
          }
          var allData = {
            "requestIndex": requestIndex,
            "datarequestElapsed": datarequestElapsedS,
            "datatotalTimeSeconds": datatotalTimeSeconds,
            "maxLatency": maxLatency,
            "minLatency": minLatency,
            "meanLatency": meanLatency,
            "barRPS": barRPS,
            "totalTimeSeconds": totalTimeSeconds,
            "errors": errors
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
      }catch(err) {
        console.log(err);
      }
      });
});
router.post('/getLoadKubernetesData', function(req,res){
  formElements = req.body;
  var loadTestName = formElements.testName;
  var timestamp = [];
  var desiredReplicas = [];
  var currentReplicas = [];
  var cpuPercentageCurrent = [];
  var cpuPercentageAvg = [];
  var k= 0;
  kubeMongoFunctions.getLoadKubernetesData(req.user.username,loadTestName)
    .then(function (dataArr) {
      try{
        console.log(dataArr.length);
        if (dataArr.length) {
          k = dataArr.length;
          for (i = 0; i < dataArr.length; i++) {
            timestamp.push(dataArr[i].time);
            if (dataArr[i].data.hpaInfo[0]) {
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
          }
          var allData = {
            "timestamp": timestamp,
            "desiredReplicas": desiredReplicas,
            "currentReplicas": currentReplicas,
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
router.post('/getLoadTestTimelineData', function(req,res){
  formElements = req.body;
  var loadTestName = formElements.testName;
  kubeMongoFunctions.getLoadTestTimelineData(req.user.username,loadTestName)
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
router.post('/deploykubernetesaws', function(req, res){
  var data = req.body;

  var kubedata =
    {
      "master": {
        "image": data.imageid,
        "name": 'MasterNode',
        "numInst": data.numInstMaster,
        "typeInst": data.typeInstMaster
      },
      "minion": {
        "image": data.imageid,
        "name": 'MinionNode',
        "numInst": data.numInstMinion,
        "typeInst": data.typeInstMinion
      },
      "scalingParams": {
        "policy": data.scalingParam,
        "cpuPercent": data.cpuPercent,
        "numMinPods": data.numMinPods,
        "numMaxPods": data.numMaxPods
      },
      "application":{
        "dockerId": "",
        "type":"",
        "name": "movie"
      }
    };

  var awsdata = {
      "accessKeyId": data.awstoken,
      "secretAccessKey": data.awssecret,
      "region": data.awsregion,
      "s3BucketName": data.s3bucketname,
      "awsKeyName": data.awskeyname,
      "securityId": [data.awssecurityid]
    };

  kube.deployOnAws(req.user.username,kubedata, awsdata,req, res);
});
router.post('/loadTest', function(req,res){
  formElements = req.body;
  var loadTestName = formElements.testName;

  var startTime = new Date().getTime();
  kubeMongoFunctions.setManualRecording(req.user.username, false)
    .then(function (set) {
      if (set) {
        console.log("Diabled Manual");
        kubeMongoFunctions.setLoadTestRecording(req.user.username,loadTestName, true)
          .then(function (set) {
            if (set) {
              console.log("Enabled");
              var interval = setInterval(function () {
                if (new Date().getTime() - startTime > formElements["maxTime"] * 1000 + 600000) {
                  clearInterval(interval);
                  return;
                }
                kubeMongoFunctions.getMasterIp(req.user.username)
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
                      kube.saveKubernetesDataLoadTest(req.user.username,loadTestName,objUrl);
                    }
                  });

              }, 2000);
              kubeMongoFunctions.getServiceURL(req.user.username)
                .then(function (url) {
                  if (url) {
                    console.log("Found URL informtion");
                    res.render('kubernetes/success', {
                      layout: '../kubernetes/layouts/main',
                      user: req.user.username,
                      dataForm: "Request send to Server, Plese check the graphs after the test is over",
                      dataClient: "Request send to Server, Plese check the graphs after the test is over"
                    });
                    var options = '';
                    var username = req.user.username;
                    options = {
                      url: url,
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
                        kubeMongoFunctions.addLoadTestRequestData(username,loadTestName,testData);
                      }
                    };

                    loadtest.loadTest(options, function(error) {
                      if (error) {
                        console.error('Got an error: %s', error);
                      }
                      console.log('Tests run successfully');
                    });
                    // here neet to trigger load and save the data
                    // save information of kubernetes every one second

                  }
                  else {
                    console.log("url not found");
                    res.render('kubernetes/failure', {
                      layout: '../kubernetes/layouts/main',
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
      else {
        console.log("Error");
      }
    });
});
router.post('/triangleLoadTest', function(req,res){
  formElements = req.body;
  var loadTestName = formElements.testName;

  var startTime = new Date().getTime();
  kubeMongoFunctions.setManualRecording(req.user.username, false)
    .then(function (set) {
      if (set) {
        console.log("Diabled Manual");
        kubeMongoFunctions.setLoadTestRecording(req.user.username,loadTestName, true)
          .then(function (set) {
            if (set) {
              console.log("Enabled");
              var intervalKube = setInterval(function () {
                if (new Date().getTime() - startTime > 2000000) {
                  clearInterval(intervalKube);
                  return;
                }
                kubeMongoFunctions.getMasterIp(req.user.username)
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
                      kube.saveKubernetesDataLoadTest(req.user.username,loadTestName,objUrl);
                    }
                  });

              }, 2000);
              var requests = 1;
              res.render('kubernetes/success', {
                layout: '../kubernetes/layouts/main',
                user: req.user.username,
                dataForm: "Request send to Server, Plese check the graphs after the test is over",
                dataClient: "Request send to Server, Plese check the graphs after the test is over"
              });
              var intervalReq = setInterval(function () {
                if (new Date().getTime() - startTime > 600000 || requests > 10000) {
                  clearInterval(intervalReq);
                  return;
                }
              kubeMongoFunctions.getServiceURL(req.user.username)
                .then(function (url) {
                  if (url) {
                    console.log("Found URL informtion");
                    console.log(url);

                    console.log("requests"+requests);
                    var options = '';
                    var username = req.user.username;
                    options = {
                      url: url,
                      concurrency: formElements["numConcurrClients"], //How many clients to start in parallel.
                      maxRequests: requests * 10, //A max number of requests; after they are reached the test will end.
                      timeout: 2500, //Timeout for each generated request in milliseconds. Setting this to 0 disables timeout (default).
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
                        kubeMongoFunctions.addLoadTestRequestData(username, loadTestName, testData);
                      }
                    };
                    loadtest.loadTest(options, function (error) {
                      if (error) {
                        console.error('Got an error: %s', error);
                      }
                      console.log('Tests run successfully');
                    });
                    if (((new Date().getTime() - startTime) < 300000)) {
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
            }
          });
      }
      else {
        console.log("Error");
      }
    });
});
router.post('/linearIncreaseLoadTest', function(req,res){
  formElements = req.body;
  var loadTestName = formElements.testName;

  var startTime = new Date().getTime();
  kubeMongoFunctions.setManualRecording(req.user.username, false)
    .then(function (set) {
      if (set) {
        console.log("Diabled Manual");
        kubeMongoFunctions.setLoadTestRecording(req.user.username,loadTestName, true)
          .then(function (set) {
            if (set) {
              console.log("Enabled");
              var intervalKube = setInterval(function () {
                if (new Date().getTime() - startTime > 2000000) {
                  clearInterval(intervalKube);
                  return;
                }
                kubeMongoFunctions.getMasterIp(req.user.username)
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
                      kube.saveKubernetesDataLoadTest(req.user.username,loadTestName,objUrl);
                    }
                  });

              }, 2000);
              res.render('kubernetes/success', {
                layout: '../kubernetes/layouts/main',
                user: req.user.username,
                dataForm: "Request send to Server, Plese check the graphs after the test is over",
                dataClient: "Request send to Server, Plese check the graphs after the test is over"
              });
              var requests=1;
              var intervalReq = setInterval(function () {
                if (new Date().getTime() - startTime > 600000 || requests > 10000) {
                  clearInterval(intervalReq);
                  return;
                }
                kubeMongoFunctions.getServiceURL(req.user.username)
                  .then(function (url) {
                    if (url) {
                      console.log("Found URL informtion");
                      var options = '';
                      var username = req.user.username;

                      options = {
                        url: url,
                        concurrency: formElements["numConcurrClients"], //How many clients to start in parallel.
                        maxRequests: requests * 4, //A max number of requests; after they are reached the test will end.
                        timeout: 2500, //Timeout for each generated request in milliseconds. Setting this to 0 disables timeout (default).
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
                          kubeMongoFunctions.addLoadTestRequestData(username, loadTestName, testData);
                        }
                      };
                      loadtest.loadTest(options, function (error) {
                        if (error) {
                          console.error('Got an error: %s', error);
                        }
                        console.log('Tests run successfully');
                      });
                      requests+=3;
                    }
                  });
              },20000);
            }
            else {
              console.log("Error");
            }
          });
      }
      else {
        console.log("Error");
      }
    });
});
router.post('/linearIncreaseConstantLoadTest', function(req,res){
  formElements = req.body;
  var loadTestName = formElements.testName;

  var startTime = new Date().getTime();
  kubeMongoFunctions.setManualRecording(req.user.username, false)
    .then(function (set) {
      if (set) {
        console.log("Diabled Manual");
        kubeMongoFunctions.setLoadTestRecording(req.user.username,loadTestName, true)
          .then(function (set) {
            if (set) {
              console.log("Enabled");
              var intervalKube = setInterval(function () {
                if (new Date().getTime() - startTime > 2000000) {
                  clearInterval(intervalKube);
                  return;
                }
                kubeMongoFunctions.getMasterIp(req.user.username)
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
                      kube.saveKubernetesDataLoadTest(req.user.username,loadTestName,objUrl);
                    }
                  });

              }, 2000);
              res.render('kubernetes/success', {
                layout: '../kubernetes/layouts/main',
                user: req.user.username,
                dataForm: "Request send to Server, Plese check the graphs after the test is over",
                dataClient: "Request send to Server, Plese check the graphs after the test is over"
              });
              var requests=1;
              var intervalReq = setInterval(function () {
                if (new Date().getTime() - startTime > 600000 || requests > 10000) {
                  clearInterval(intervalReq);
                  return;
                }
                kubeMongoFunctions.getServiceURL(req.user.username)
                  .then(function (url) {
                    if (url) {
                      console.log("Found URL informtion");
                      var options = '';
                      var username = req.user.username;

                      options = {
                        url: url,
                        concurrency: formElements["numConcurrClients"], //How many clients to start in parallel.
                        maxRequests: requests * 4, //A max number of requests; after they are reached the test will end.
                        timeout: 2500, //Timeout for each generated request in milliseconds. Setting this to 0 disables timeout (default).
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
                          kubeMongoFunctions.addLoadTestRequestData(username, loadTestName, testData);
                        }
                      };
                      loadtest.loadTest(options, function (error) {
                        if (error) {
                          console.error('Got an error: %s', error);
                        }
                        console.log('Tests run successfully');
                      });
                      if(((new Date().getTime() - startTime) < 300000) && requests < 10000)
                      {
                        requests+=5;

                      }
                      else
                      {
                        // the requests will be fixed now
                      }
                    }
                  });
              },20000);
            }
            else {
              console.log("Error");
            }
          });
      }
      else {
        console.log("Error");
      }
    });
});
router.post('/upDownLoadTest', function(req,res){
  formElements = req.body;
  var loadTestName = formElements.testName;
  var flag=true;
  var startTime = new Date().getTime();
  kubeMongoFunctions.setManualRecording(req.user.username, false)
    .then(function (set) {
      if (set) {
        console.log("Diabled Manual");
        kubeMongoFunctions.setLoadTestRecording(req.user.username,loadTestName, true)
          .then(function (set) {
            if (set) {
              console.log("Enabled");
              var intervalKube = setInterval(function () {
                if (new Date().getTime() - startTime > 2000000) {
                  clearInterval(intervalKube);
                  return;
                }
                kubeMongoFunctions.getMasterIp(req.user.username)
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
                      kube.saveKubernetesDataLoadTest(req.user.username,loadTestName,objUrl);
                    }
                  });

              }, 2000);
              res.render('kubernetes/success', {
                layout: '../kubernetes/layouts/main',
                user: req.user.username,
                dataForm: "Request send to Server, Plese check the graphs after the test is over",
                dataClient: "Request send to Server, Plese check the graphs after the test is over"
              });
              var requests=1;
              var intervalReq = setInterval(function () {
                if (new Date().getTime() - startTime > 600000 || requests > 10000) {
                  clearInterval(intervalReq);
                  return;
                }
                kubeMongoFunctions.getServiceURL(req.user.username)
                  .then(function (url) {
                    if (url) {
                      console.log("Found URL informtion");
                      var options = '';
                      var username = req.user.username;

                      options = {
                        url: url,
                        concurrency: formElements["numConcurrClients"], //How many clients to start in parallel.
                        maxRequests: requests * 4, //A max number of requests; after they are reached the test will end.
                        timeout: 2500, //Timeout for each generated request in milliseconds. Setting this to 0 disables timeout (default).
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
                          kubeMongoFunctions.addLoadTestRequestData(username, loadTestName, testData);
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
              },20000);
            }
            else {
              console.log("Error");
            }
          });
      }
      else {
        console.log("Error");
      }
    });
});
router.get('/startRecordingData', function(req,res){
  var startTime = new Date().getTime();
  kubeMongoFunctions.setManualRecording(req.user.username, true)
    .then(function (set) {
      if (set) {
        console.log("Enabled");
        res.render('kubernetes/success', {
          layout: '../kubernetes/layouts/main',
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
    kubeMongoFunctions.getManualRecording(req.user.username)
      .then(function (enable) {
        if (enable) {
          kubeMongoFunctions.getMasterIp(req.user.username)
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
                kube.saveKubernetesData(req.user.username, objUrl);
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
  kubeMongoFunctions.setManualRecording(req.user.username, false)
    .then(function (set) {
      if (set) {
        console.log("Stopped");
        res.render('kubernetes/success', {
          layout: '../kubernetes/layouts/main',
          user: req.user.username,
          dataForm: "Stopped",
          dataClient: "Stopped"
        });
      }
      else {
        console.log("Error");
        res.render('kubernetes/failure', {
          layout: '../kubernetes/layouts/main',
          user: req.user.username,
          error: "Not able to stop"
        });
      }
    });
});
router.use(function(req, res, next){
  // the status option, or res.statusCode = 404
  // are equivalent, however with the option we
  // get the "status" local available as well
  res.render('404', {user: req.user});
});
router.use(function(err, req, res, next){
  // we may use properties of the error object
  // here and next(err) appropriately, or if
  // we possibly recovered from the error, simply next().
  res.render('500', {user: req.user});
});
//logs user out of site, deleting them from the session, and returns to homepage

module.exports = router;


