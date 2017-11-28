const express                       = require('express');
const router                        = express.Router();
const funct                         = require('../functions');
const passport                      = require('passport');
const awsAutoscale                  = require("../auto_scaling_solutions/aws_autoscale/index");
const awsAutoScaleMongoFunctions    = require("../auto_scaling_solutions/aws_autoscale/awsAutoscaleMongoFunctions");
var http                            = require('http');
var request                         = require('request');
var loadtest                        = require('loadtest');



//===============ROUTES=================
//displays our homepage
router.get('/', function(req, res){
  res.render('awsautoscale/home',{layout: '../awsautoscale/layouts/main',user: req.user} );
});
router.get('/edituserInfo', function(req, res){
  funct.getUserInfoforEdit(req.user.username, res,req);
});
router.get('/getUserInfoForDeploy', function(req, res){
  awsAutoScaleMongoFunctions.getUserInfoforDeploy(req.user.username, res,req);
});
router.get('/loadtesthome', function(req, res){
  res.render('awsautoscale/loadtesthome',{layout: '../awsautoscale/layouts/main',user: req.user} );
});
router.get('/describeEc2Instances', function(req, res) {
  awsAutoScaleMongoFunctions.getUserInfoForDescription(req.user.username, res,req)
    .then(function (data) {
      if (data) {
        var awsdata = {
          "accessKeyId": data.awstoken,
          "secretAccessKey": data.awssecret,
          "region": data.awsregion,//"us-west-2",
          "s3BucketName": data.s3bucketname,
          "awsKeyName": data.awskeyname
        };
        var b = awsAutoscale.describeInstances(awsdata, req, res)
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
  awsAutoScaleMongoFunctions.getUserInfoForDescription(req.user.username, res,req)
    .then(function (data) {
      if (data) {
        var awsdata = {
          "accessKeyId": data.awstoken,
          "secretAccessKey": data.awssecret,
          "region": data.awsregion,
          "s3BucketName": data.s3bucketname,
          "awsKeyName": data.awskeyname
        };
        var b = awsAutoscale.describeAutoscalingGroups(awsdata, req, res)
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
  awsAutoScaleMongoFunctions.getUserInfoForDescription(req.user.username, res,req)
    .then(function (data) {
      if (data) {
        var awsdata = {
          "accessKeyId": data.awstoken,
          "secretAccessKey": data.awssecret,
          "region": data.awsregion,
          "s3BucketName": data.s3bucketname,
          "awsKeyName": data.awskeyname
        };
        var b = awsAutoscale.describeLoadBalancer(awsdata, req, res)
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
console.log(JSON.stringify(data));
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
        "subnet": "" +data.awssubnetid,
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
          ],
      },
      "application":{
        "giturl": data.giturl,
        "port": data.appPort,
        "name": appName
      }
    };

  console.log("sdf"+JSON.stringify(awsDeployData));
  var awsdata = {
    "accessKeyId": data.awstoken,
    "secretAccessKey": data.awssecret,
    "region": data.awsregion,
    "s3BucketName": data.s3bucketname,
    "awsKeyName": data.awskeyname,
    "securityId": [data.awssecurityid]
  };

  awsAutoscale.deployAutoscaler(req.user.username,awsDeployData, awsdata,req, res);
});
router.get('/terminate', function(req, res) {
  awsAutoScaleMongoFunctions.getUserInfoForDescription(req.user.username, res,req)
    .then(function (data) {
      if (data) {
        var awsdata = {
          "accessKeyId": data.awstoken,
          "secretAccessKey": data.awssecret,
          "region": data.awsregion,
          "s3BucketName": data.s3bucketname,
          "awsKeyName": data.awskeyname
        };
        var b = awsAutoscale.terminateAutoScale(awsdata, req.user.username, req, res);
      }
      else {
        res.send("fail")
      }
    });
});
router.post('/loadTest', function(req,res){
  formElements = req.body;
  var startTime = new Date().getTime();
  var loadTestName = formElements.testName;
  awsAutoScaleMongoFunctions.setLoadTestRecording(req.user.username,loadTestName, true)
    .then(function (set) {
      if (set) {
        console.log("Enabled");

        var interval = setInterval(function () {
          if (new Date().getTime() - startTime > formElements["maxTime"] * 1000 + 600000) {
            clearInterval(interval);
            return;
          }
          awsAutoScaleMongoFunctions.getUserInfoForDescription(req.user.username, res,req)
            .then(function (data) {
              if (data) {
                var awsdata = {
                  "accessKeyId": data.awstoken,
                  "secretAccessKey": data.awssecret,
                  "region": data.awsregion,
                  "s3BucketName": data.s3bucketname,
                  "awsKeyName": data.awskeyname
                };
                awsAutoscale.saveAutoscalingGroupData(awsdata,req.user.username,loadTestName);
              }
            });

        }, 2000);

        awsAutoScaleMongoFunctions.getServiceURL(req.user.username)
          .then(function (url) {
            if (url) {
              console.log("Found URL informtion");
              var options = '';
              var username = req.user.username;
              options = {
                url: 'http://'+url + '/api/test',
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
                  awsAutoScaleMongoFunctions.addLoadTestRequestData(username,loadTestName,testData);
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
              res.render('awsautoscale/success', {
                layout: '../awsautoscale/layouts/main',
                user: req.user.username,
                dataForm: "Request send to Server, Plese check the graphs after the test is over",
                dataClient: "Request send to Server, Plese check the graphs after the test is over"
              });
            }
            else {
              console.log("url not found");
              res.render('awsautoscale/failure', {
                layout: '../awsautoscale/layouts/main',
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
});
router.post('/triangleLoadTest', function(req,res){
  formElements = req.body;
  var startTime = new Date().getTime();
  var loadTestName = formElements.testName;
  awsAutoScaleMongoFunctions.setLoadTestRecording(req.user.username,loadTestName, true)
    .then(function (set) {
      if (set) {
        console.log("Enabled");

        var intervalAws = setInterval(function () {
          if (new Date().getTime() - startTime > 2000000) {
            clearInterval(intervalAws);
            return;
          }
          awsAutoScaleMongoFunctions.getUserInfoForDescription(req.user.username, res,req)
            .then(function (data) {
              if (data) {
                var awsdata = {
                  "accessKeyId": data.awstoken,
                  "secretAccessKey": data.awssecret,
                  "region": data.awsregion,
                  "s3BucketName": data.s3bucketname,
                  "awsKeyName": data.awskeyname
                };
                awsAutoscale.saveAutoscalingGroupData(awsdata,req.user.username,loadTestName);
              }
            });

        }, 2000);
        var requests = 1;
        res.render('awsautoscale/success', {
          layout: '../awsautoscale/layouts/main',
          user: req.user.username,
          dataForm: "Request send to Server, Plese check the graphs after the test is over",
          dataClient: "Request send to Server, Plese check the graphs after the test is over"
        });
        var intervalReq = setInterval(function () {
          if (new Date().getTime() - startTime > 600000 || requests > 10000) {
            clearInterval(intervalReq);
            return;
          }
          awsAutoScaleMongoFunctions.getServiceURL(req.user.username)
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
                    awsAutoScaleMongoFunctions.addLoadTestRequestData(username, loadTestName, testData);
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
        res.render('awsautoscale/failure', {
          layout: '../awsautoscale/layouts/main',
          user: req.user.username,
          error: "App Service Is not running, PLease deploy first and then run"
        });
      }
    });
});
router.post('/linearIncreaseLoadTest', function(req,res){
  formElements = req.body;
  var startTime = new Date().getTime();
  var loadTestName = formElements.testName;
  awsAutoScaleMongoFunctions.setLoadTestRecording(req.user.username,loadTestName, true)
    .then(function (set) {
      if (set) {
        console.log("Enabled");

        var intervalAws = setInterval(function () {
          if (new Date().getTime() - startTime > 2000000) {
            clearInterval(intervalAws);
            return;
          }
          awsAutoScaleMongoFunctions.getUserInfoForDescription(req.user.username, res,req)
            .then(function (data) {
              if (data) {
                var awsdata = {
                  "accessKeyId": data.awstoken,
                  "secretAccessKey": data.awssecret,
                  "region": data.awsregion,
                  "s3BucketName": data.s3bucketname,
                  "awsKeyName": data.awskeyname
                };
                awsAutoscale.saveAutoscalingGroupData(awsdata,req.user.username,loadTestName);
              }
            });

        }, 2000);
        var requests = 1;
        res.render('awsautoscale/success', {
          layout: '../awsautoscale/layouts/main',
          user: req.user.username,
          dataForm: "Request send to Server, Plese check the graphs after the test is over",
          dataClient: "Request send to Server, Plese check the graphs after the test is over"
        });
        var intervalReq = setInterval(function () {
          if (new Date().getTime() - startTime > 600000 || requests > 10000) {
            clearInterval(intervalReq);
            return;
          }
          awsAutoScaleMongoFunctions.getServiceURL(req.user.username)
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
                    awsAutoScaleMongoFunctions.addLoadTestRequestData(username, loadTestName, testData);
                  }
                };
                loadtest.loadTest(options, function (error) {
                  if (error) {
                    console.error('Got an error: %s', error);
                  }
                  console.log('Tests run successfully');
                });
                requests=requests+3;
                }
            });
        }, 20000);
      }
      else {
        console.log("Error");
        res.render('awsautoscale/failure', {
          layout: '../awsautoscale/layouts/main',
          user: req.user.username,
          error: "App Service Is not running, PLease deploy first and then run"
        });
      }
    });
});
router.post('/linearIncreaseConstantLoadTest', function(req,res){
  formElements = req.body;
  var startTime = new Date().getTime();
  var loadTestName = formElements.testName;
  awsAutoScaleMongoFunctions.setLoadTestRecording(req.user.username,loadTestName, true)
    .then(function (set) {
      if (set) {
        console.log("Enabled");

        var intervalAws = setInterval(function () {
          if (new Date().getTime() - startTime > 2000000) {
            clearInterval(intervalAws);
            return;
          }
          awsAutoScaleMongoFunctions.getUserInfoForDescription(req.user.username, res,req)
            .then(function (data) {
              if (data) {
                var awsdata = {
                  "accessKeyId": data.awstoken,
                  "secretAccessKey": data.awssecret,
                  "region": data.awsregion,
                  "s3BucketName": data.s3bucketname,
                  "awsKeyName": data.awskeyname
                };
                awsAutoscale.saveAutoscalingGroupData(awsdata,req.user.username,loadTestName);
              }
            });

        }, 2000);
        var requests = 1;
        res.render('awsautoscale/success', {
          layout: '../awsautoscale/layouts/main',
          user: req.user.username,
          dataForm: "Request send to Server, Plese check the graphs after the test is over",
          dataClient: "Request send to Server, Plese check the graphs after the test is over"
        });
        var intervalReq = setInterval(function () {
          if (new Date().getTime() - startTime > 600000 || requests > 10000) {
            clearInterval(intervalReq);
            return;
          }
          awsAutoScaleMongoFunctions.getServiceURL(req.user.username)
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
                    awsAutoScaleMongoFunctions.addLoadTestRequestData(username, loadTestName, testData);
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
                  requests=requests+5;

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
        res.render('awsautoscale/failure', {
          layout: '../awsautoscale/layouts/main',
          user: req.user.username,
          error: "App Service Is not running, PLease deploy first and then run"
        });
      }
    });
});
router.post('/upDownLoadTest', function(req,res){
  formElements = req.body;
  var flag=true;
  var startTime = new Date().getTime();
  var loadTestName = formElements.testName;
  awsAutoScaleMongoFunctions.setLoadTestRecording(req.user.username,loadTestName, true)
    .then(function (set) {
      if (set) {
        console.log("Enabled");

        var intervalAws = setInterval(function () {
          if (new Date().getTime() - startTime > 2000000) {
            clearInterval(intervalAws);
            return;
          }
          awsAutoScaleMongoFunctions.getUserInfoForDescription(req.user.username, res,req)
            .then(function (data) {
              if (data) {
                var awsdata = {
                  "accessKeyId": data.awstoken,
                  "secretAccessKey": data.awssecret,
                  "region": data.awsregion,
                  "s3BucketName": data.s3bucketname,
                  "awsKeyName": data.awskeyname
                };
                awsAutoscale.saveAutoscalingGroupData(awsdata,req.user.username,loadTestName);
              }
            });

        }, 2000);
        var requests = 1;
        res.render('awsautoscale/success', {
          layout: '../awsautoscale/layouts/main',
          user: req.user.username,
          dataForm: "Request send to Server, Plese check the graphs after the test is over",
          dataClient: "Request send to Server, Plese check the graphs after the test is over"
        });
        var intervalReq = setInterval(function () {
          if (new Date().getTime() - startTime > 600000 || requests > 10000) {
            clearInterval(intervalReq);
            return;
          }
          awsAutoScaleMongoFunctions.getServiceURL(req.user.username)
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
                    awsAutoScaleMongoFunctions.addLoadTestRequestData(username, loadTestName, testData);
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
        res.render('awsautoscale/failure', {
          layout: '../awsautoscale/layouts/main',
          user: req.user.username,
          error: "App Service Is not running, PLease deploy first and then run"
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
  awsAutoScaleMongoFunctions.getTestData(req.user.username,loadTestName)
    .then(function (data) {
      if (data.length) {
        data.sort(function(a, b) {
          var aD = a.result.requestIndex, bD = b.result.requestIndex;
          return (aD) - (bD);
        });
        for(i=0;i<data.length;i++)
        {
          requestIndex.push(data[i].result.requestIndex);
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
router.get('/getCurrentData', function(req,res){

  awsAutoScaleMongoFunctions.getUserInfoForDescription(req.user.username, res,req)
    .then(function (data) {
      if (data) {
        var awsdata = {
          "accessKeyId": data.awstoken,
          "secretAccessKey": data.awssecret,
          "region": data.awsregion,
          "s3BucketName": data.s3bucketname,
          "awsKeyName": data.awskeyname
        };
        var b = awsAutoscale.getCurrentData(awsdata, req.user.username, req, res);
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
