const Q                       = require('q');
const http                    = require('http');
const request                 = require('request');
const AWS                     = require('aws-sdk');
const kubeMaster              = require('./masterScript');
const kubeMinion              = require('./minionScript');
const kubeMongoFunctions      = require('./kubeMongoFunctions');

exports.deployOnAws = function (username, kubeData, awsData,req, res) {
  var ec2 = new AWS.EC2({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2016-11-15'});
  var cloudwatch = new AWS.CloudWatch({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2016-11-15'});
  var autoscaling = new AWS.AutoScaling({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2016-11-15'});
  var elbv2 = new AWS.ELBv2({accessKeyId: awsData.accessKeyId,secretAccessKey: awsData.secretAccessKey,region: awsData.region, apiVersion: '2015-12-01'});

//First Create Master Node wait for around 2 minutes and then create Minion Node
  // Master Config
  var paramsMaster = {
    ImageId: kubeData.master.image,
    InstanceType: kubeData.master.typeInst,
    SecurityGroupIds: awsData.securityId,
    Monitoring: {
      Enabled: true /* required */
    },
    MinCount:kubeData.master.numInst,
    MaxCount:kubeData.master.numInst,
    KeyName: awsData.awsKeyName,
    UserData: kubeMaster.getMasterScript(kubeData, awsData)
  };

  var instanceIdMaster = "";

  ec2.runInstances(paramsMaster, function(err, data) {
    if (err) {
      console.log("Could not create Master instance", err);
      return;
    }
    instanceIdMaster = data.Instances[0].InstanceId;
    // Add tags to the instance
    if(kubeData.master.name == "")
    {
      kubeData.master.name = "MasterNode";
    }
    var paramsMasterTag = {Resources: [instanceIdMaster], Tags: [{
        Key: 'Name',
        Value: kubeData.master.name
      }]
    };

    ec2.createTags(paramsMasterTag, function(err) {
      console.log("Tagging instance", err ? "failure" : "success");
    });
  });

  setTimeout(function () {
    // Minion Config
    var paramsMinion = {
      ImageId: kubeData.minion.image,
      InstanceType: kubeData.minion.typeInst,
      SecurityGroupIds:awsData.securityId,
      Monitoring: {
        Enabled: true /* required */
      },
      MinCount:kubeData.minion.numInst,
      MaxCount:kubeData.minion.numInst,
      KeyName: awsData.awsKeyName,
      UserData: kubeMinion.getMinionScript(kubeData, awsData)
    };
    ec2.runInstances(paramsMinion, function(err, data) {
      if (err) {
        console.log("Could not create Minion instance", err);
        return;
      }
      var instanceIdMinions = [];
      var tags = [];
      for(i=0; i< data.Instances.length; i++)
      {
        instanceIdMinions.push(data.Instances[i].InstanceId)
        tags.push({
          Key: 'Name',
          Value: "MinionNode"
        });
      }
      var paramMasterDescription = {
        DryRun: false,
        InstanceIds: [instanceIdMaster]
      };
      ec2.describeInstances(paramMasterDescription, function (err, data) {
        if (err) {
          console.log("Error", err.stack);
        } else {
          var awsMasterNode= [];
          var instance = data.Reservations[0];
          var serviceURL = "";
          var urlService= "http://"+instance["Instances"][0]["PublicIpAddress"]+":8001/api/v1/services/";
          var max= 100;
          var retry = (function() {
            var count = 0;
            return function(next) {
              request({
                url: urlService,
                method: "GET",
                json: true,
                headers: {
                  "content-type": "application/json",
                }}, function (error, response, body) {
                if (error || response.statusCode !== 200 || body.items =="undefined") {
                  console.log('fail');

                  if (count++ < max) {
                    return setTimeout(function() {
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
          retry(function(err, body) {
            var servicesArr = body.items;
            for(i=0;i<servicesArr.length;i++)
            {
              if(servicesArr[i]["metadata"]['name'].indexOf(kubeData.application.name)!== -1)
              {
                var portNumber = servicesArr[i]["spec"]["ports"][0].nodePort;
                serviceURL = url= "http://"+instance["Instances"][0]["PublicIpAddress"]+":"+ portNumber+"/api/test";
                console.log(serviceURL);
                break;
              }
            }
            awsMasterNode = {
              "tag" : instance["Instances"][0]["Tags"][0]["Value"],
              "instanceid" : instance["Instances"][0]["InstanceId"],
              "ip" : instance["Instances"][0]["PublicIpAddress"],
              "serviceURL" :serviceURL
            }
            var awsMinionNodeInstanceIds = instanceIdMinions;
            var awsMasterMinion = {
              "master" : awsMasterNode,
              "minion": awsMinionNodeInstanceIds
            }
            kubeMongoFunctions.addConfigData(username,awsMasterMinion)
              .then(function (added) {
                if (added) {
                  console.log("added master minion informtion");
                }
                else {
                  console.log("user not found");
                }
              });
          });

        }
      });
      var paramsMinionTags = {Resources: instanceIdMinions, Tags:tags }
      ec2.createTags(paramsMinionTags, function(err) {
        console.log("Tagging instance", err ? "failure" : "success");
      });
    });
  }, 120000);
  res.render('success', {
    user: username,
    dataForm: req.body,
    dataClient: "Request Sent to Server for Deployment"
  });
};
exports.terminateInstances = function(awsData,username,req, res) {
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

  kubeMongoFunctions.getInstancesId(username)
    .then(function (Ids) {
      if (Ids.length) {
        var params = {
          InstanceIds: Ids,
          DryRun: false
        };
        ec2.terminateInstances(params, function(err, data) {
          if (err) console.log(err, err.stack); // an error occurred
          else     console.log(data);           // successful response
        });
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
          dataClient: "No Instances Found to Terminate"
        });
      }
    });
}
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
exports.saveTableTimeline= function(data) {
  data.forEach(function(item) {
    var saveRow = {};
    saveRow = {
      "name": item["involvedObject"]["name"],
      "kind": item["involvedObject"]["kind"],
      "namespace": item["involvedObject"]["namespace"],
      "reason": item["reason"],
      "firstTimestamp": item["firstTimestamp"],
      "lastTimestamp": item["lastTimestamp"],
      "count": item["count"],
      "message": item["message"]
    };
    kubeMongoFunctions.savePodInfo(saveRow, 'testLoadTimeline')
      .then(function (added) {
        if (added) {
          console.log("added informtion");
        }
        else {
          console.log("user not found");
        }
      });
  });

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
        if(hpaStatus)
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
                              kubeMongoFunctions.addRecordedData(username,dataAll)
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
                              kubeMongoFunctions.addLoadTestKubernetesData(username,loadTestName,dataAll)
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
