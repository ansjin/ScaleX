const ObjectId          = require('mongodb').ObjectID;
const bcrypt            = require('bcryptjs');
const Q                 = require('q');
const config            = require('../../../config');
const http              = require('http');
const request           = require('request');
// MongoDB connection information
const mongodbUrlConfig = 'mongodb://'+ config.mongodb.host + ':'+config.mongodb.port+'/'+config.mongodb.dbUsersData.name;
const collectionNameConfig = config.mongodb.dbUsersData.collectionName;

const mongodbUrlAwsKubeAutoScaleTestData = 'mongodb://'+ config.mongodb.host + ':'+config.mongodb.port+'/'+config.mongodb.dbawsKubeAutoscale.name;

const collectionNameAwsAutoScaleTestData = '';
const MongoClient = require('mongodb').MongoClient;

exports.addConfigData = function (username,data) {
  var deferred = Q.defer();
  MongoClient.connect(mongodbUrlConfig, function (err, db) {
    var collection = db.collection(collectionNameConfig);
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result)
        {
          collection.update({'userInfo.username' : username},
            {
              $set : {
                "awsKubeAutoScale.awsKubeAutoScaleConfig": data

              }
            },
            {upsert:false})
          deferred.resolve(true); // username exists
        }
        else
        {
          deferred.resolve(false); // username not exists
        }
      });
  });
  return deferred.promise;
};

exports.addFurtherConfigData = function (username,data) {
  var deferred = Q.defer();
  MongoClient.connect(mongodbUrlConfig, function (err, db) {
    var collection = db.collection(collectionNameConfig);
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result)
        {
          collection.update({'userInfo.username' : username},
            {
              $set : {
                "awsKubeAutoScale.ipConfig": data

              }
            },
            {upsert:false})
          deferred.resolve(true); // username exists
        }
        else
        {
          deferred.resolve(false); // username not exists
        }
      });
  });
  return deferred.promise;
};
exports.getInstancesId = function(username) {
  var deferred = Q.defer();
  var ids = [];
  MongoClient.connect(mongodbUrlConfig, function (err, db) {
    var collection = db.collection(collectionNameConfig);
    //check if username is already assigned in our database
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result)
        {
          var masterId= result["awsKubeAutoScale"]["kubernetesConfig"].master.instanceid;
          var minionIds = result["awsKubeAutoScale"]["kubernetesConfig"].minionIds;
          ids = minionIds;
          ids.push(masterId)
          deferred.resolve(ids);
        }
        else
        {
          console.log("user Not exists:", username);
          deferred.resolve(ids);
        }
      });
  });

  return deferred.promise;
}
exports.getUserInfoforDeploy = function (username, res,req) {
  console.log(username);
  MongoClient.connect(mongodbUrlConfig, function (err, db) {
    var collection = db.collection(collectionNameConfig);
    //check if username is already assigned in our database
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result) {
          console.log("found");
          res.render('awskubernetes/deploy', {
            layout: '../awskubernetes/layouts/main',
            user: username,
            info: result["userInfo"]
          });
        }
        else
        {
          console.log("not found");
        }
      });
  });
};
exports.getUserInfoForDescription = function (username, res,req) {
  var deferred = Q.defer();
  MongoClient.connect(mongodbUrlConfig, function (err, db) {
    var collection = db.collection(collectionNameConfig);

    //check if username is already assigned in our database
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result) {
          deferred.resolve(result["userInfo"]);
        }
        else
        {
          console.log("not found");
        }
      });
  });
  return deferred.promise;
};
exports.getMasterIp = function(username) {
  var deferred = Q.defer();

  MongoClient.connect(mongodbUrlConfig, function (err, db) {
    var collection = db.collection(collectionNameConfig);

    //check if username is already assigned in our database
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result)
        {
          var ip= result["awsKubeAutoScale"]["ipConfig"].Masterip;
          deferred.resolve(ip); // username exists
        }
        else
        {
          console.log("user Not exists:", username);
          deferred.resolve(false); // username not exists
        }
      });
  });

  return deferred.promise;
}
exports.getAwsAutoScaleInfo = function(username) {
  var deferred = Q.defer();
  var deployInfo = {};
  MongoClient.connect(mongodbUrlConfig, function (err, db) {
    var collection = db.collection(collectionNameConfig);

    //check if username is already assigned in our database
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result)
        {
          deployInfo= result["awsKubeAutoScale"];
          deferred.resolve(deployInfo); // username exists
        }
        else
        {
          console.log("Error", username);
          deferred.resolve(deployInfo); // username not exists
        }
      });
  });

  return deferred.promise;
}
exports.getLatencyData = function(username) {
  var deferred = Q.defer();
  var latencyarray = {};
  MongoClient.connect('mongodb://'+ config.mongodb.host + ':'+config.mongodb.port+'/dbPerfData', function (err, db) {
    var collection = db.collection('usersPerfData');

    //check if username is already assigned in our database
    collection.findOne({"username": username}, {"LatencyDatapoints": []})
      .then(function (result) {
        if (null != result)
        {
          latencyarray = result["LatencyDatapoints"];
          deferred.resolve(latencyarray); // username exists
        }
        else
        {
          console.log("Error", username);
          deferred.resolve(latencyarray); // username not exists
        }
      });
  });

  return deferred.promise;
}

exports.getResponseTimeData = function(username) {
  var deferred = Q.defer();
  var resptimearray = {};
  MongoClient.connect('mongodb://'+ config.mongodb.host + ':'+config.mongodb.port+'/dbPerfData', function (err, db) {
    var collection = db.collection('usersPerfData');

    //check if username is already assigned in our database
    collection.findOne({"username": username}, {"ResponseTimeDatapoints": []})
      .then(function (result) {
        if (null != result)
        {
          resptimearray = result["ResponseTimeDatapoints"];
          deferred.resolve(resptimearray); // username exists
        }
        else
        {
          console.log("Error", username);
          deferred.resolve(resptimearray); // username not exists
        }
      });
  });

  return deferred.promise;
}

exports.getServiceURL = function(username) {
  var deferred = Q.defer();

  MongoClient.connect(mongodbUrlConfig, function (err, db) {
    var collection = db.collection(collectionNameConfig);

    //check if username is already assigned in our database
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result)
        {
          console.log("USERNAME  EXISTS:", result.username);
          var url= result["awsKubeAutoScale"]["ipConfig"]["LoadBalIp"];
          deferred.resolve(url); // username exists
        }
        else
        {
          console.log("user Not exists:", username);
          deferred.resolve(false); // username not exists
        }
      });
  });

  return deferred.promise;
}
exports.addCurrentRecordedData = function (username,data) {
  MongoClient.connect(mongodbUrlAwsKubeAutoScaleTestData, function (err, db) {
    var collectionNameCurrentData = 'currentData'+username;
    var collection = db.collection(collectionNameCurrentData);
    collection.insert(data)
      .then(function () {
        db.close();
      });
  });
};
exports.setLoadTestRecording = function (username,testName,data) {
  var deferred = Q.defer();
  MongoClient.connect(mongodbUrlConfig, function (err, db) {
    var collection = db.collection(collectionNameConfig);
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result )
        {
          if(data) {
            collection.update({'userInfo.username': username},
              {
                $set: {
                  ["awsKubeAutoScale."+testName+".enable"]: data
                }
              },
              {upsert: false});

            MongoClient.connect(mongodbUrlAwsKubeAutoScaleTestData, function (err, db) {
              var collectionNameRequestData = testName+'requestData'+username;

              console.log(collectionNameRequestData);
              db.listCollections({name: collectionNameRequestData})
                .next(function(err, collinfo) {
                  if (collinfo) {
                    // The collection exists
                    console.log(collinfo);
                    var collection = db.collection(collectionNameRequestData);
                    collection.drop();
                  }
                });

              var collectionNameKubeData = testName+'kubernetesData'+username;

              console.log(collectionNameKubeData);
              db.listCollections({name: collectionNameKubeData})
                .next(function(err, collinfo) {
                  if (collinfo) {
                    // The collection exists
                    console.log(collinfo);
                    var collection = db.collection(collectionNameKubeData);
                    collection.drop();
                  }
                });
              var collectionNameKubeData = testName+'autoscaleData'+username;

              console.log(collectionNameKubeData);
              db.listCollections({name: collectionNameKubeData})
                .next(function(err, collinfo) {
                  if (collinfo) {
                    // The collection exists
                    console.log(collinfo);
                    var collection = db.collection(collectionNameKubeData);
                    collection.drop();
                  }
                });
              deferred.resolve(true); // username exists
            });
          }
        }
        else
        {
          deferred.resolve(false); // username not exists
        }
      });
  });
  return deferred.promise;
};
exports.addLoadTestRequestData = function (username,testName,data) {
  var deferred = Q.defer();
  MongoClient.connect(mongodbUrlAwsKubeAutoScaleTestData, function (err, db) {
    var collectionNameRequestData = testName+'requestData'+username;
    console.log(collectionNameRequestData);
    var collection = db.collection(collectionNameRequestData);
    collection.insert(data)
      .then(function () {
        db.close();
        deferred.resolve(true);
      });
  });
  return deferred.promise;
};
exports.addRecordedData = function (username,data) {
  var deferred = Q.defer();
  MongoClient.connect(mongodbUrlAwsKubeAutoScaleTestData, function (err, db) {
    var collectionNameManualData = 'manualData'+username;
    var collection = db.collection(collectionNameManualData);
    collection.insert(data)
      .then(function () {
        db.close();
        deferred.resolve(true);
      });
  });
  return deferred.promise;
};
exports.addLoadTestKubernetesData = function (username,testName,data) {
  var deferred = Q.defer();
  MongoClient.connect(mongodbUrlAwsKubeAutoScaleTestData, function (err, db) {
    var collectionNameKubeData = testName+'kubernetesData'+username;
    var collection = db.collection(collectionNameKubeData);
    collection.insert(data)
      .then(function () {
        db.close();
        deferred.resolve(true);
      });
  });
  return deferred.promise;
};
exports.addautoscaleData = function (username,testName,data) {
  var deferred = Q.defer();
  MongoClient.connect(mongodbUrlAwsKubeAutoScaleTestData, function (err, db) {
    var collectionNameKubeData = testName+'autoscaleData'+username;
    var collection = db.collection(collectionNameKubeData);
    collection.insert(data)
      .then(function () {
        db.close();
        deferred.resolve(true);
      });
  });
  return deferred.promise;
};
exports.setManualRecording = function (username,data) {
  var deferred = Q.defer();
  MongoClient.connect(mongodbUrlConfig, function (err, db) {
    var collection = db.collection(collectionNameConfig);
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result )
        {
          if(data) {
            collection.update({'userInfo.username': username},
              {
                $set: {
                  "awsKubeAutoScale.manualRecording": data,
                }
              },
              {upsert: false});
            db.close();
            MongoClient.connect(mongodbUrlAwsKubeAutoScaleTestData, function (err, db) {
              var collectionName = 'manualData'+username;

              db.listCollections({name: collectionName})
                .next(function(err, collinfo) {
                  if (collinfo) {
                    // The collection exists
                    db.collectionName.drop();
                    db.close();
                  }
                });
            });
          }
          else
          {
            collection.update({'userInfo.username': username},
              {
                $set: {
                  "awsKubeAutoScale.manualRecording": data
                }
              },
              {upsert: false});
          }
          db.close();
          deferred.resolve(true); // username exists
        }
        else
        {
          db.close();
          deferred.resolve(false); // username not exists
        }
      });
  });
  return deferred.promise;
};
exports.getManualRecording = function(username) {
  var deferred = Q.defer();
  MongoClient.connect(mongodbUrlConfig, function (err, db) {
    var collection = db.collection(collectionNameConfig);
    //check if username is already assigned in our database
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result)
        {
          var value= result["awsKubeAutoScale"]["manualRecording"];
          db.close();
          deferred.resolve(value);
        }
        else
        {
          console.log("user Not exists:", username);
          db.close();
          deferred.resolve(false);
        }
      });
  });
  return deferred.promise;
}
exports.getServiceURLPort = function(username) {
  var deferred = Q.defer();

  MongoClient.connect(mongodbUrlConfig, function (err, db) {
    var collection = db.collection(collectionNameConfig);

    //check if username is already assigned in our database
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result)
        {
          console.log("USERNAME  EXISTS:", result.username);
          var port= result["awsKubeAutoScale"]["kubernetesConfig"].master.serviceURLPort;
          db.close();
          deferred.resolve(port); // username exists
        }
        else
        {
          console.log("user Not exists:", username);
          db.close();
          deferred.resolve(false); // username not exists
        }
      });
  });

  return deferred.promise;
}
exports.setServiceURLPort = function(username, port) {
  var deferred = Q.defer();

  MongoClient.connect(mongodbUrlConfig, function (err, db) {
    var collection = db.collection(collectionNameConfig);

    collection.update({'userInfo.username' : username},
      {
        $set : {
          "awsKubeAutoScale.kubernetesConfig.master.serviceURLPort": port
        }
      },
      {upsert:false})
    db.close();
    deferred.resolve(true); // username exists
  });
  return deferred.promise;
}
exports.getTestData = function(username,testName) {
  var deferred = Q.defer();
  var dataAll = [];
  MongoClient.connect(mongodbUrlAwsKubeAutoScaleTestData, function (err, db) {
    var collectionNameRequestData = testName+'requestData'+username;
    var collection = db.collection(collectionNameRequestData);

    collection.find({}).limit(1000).toArray(function (err,result) {
      if (result.length)
      {
        dataAll=result;
        db.close();
        deferred.resolve(dataAll); // username exists
      }
      else
      {
        deferred.resolve(dataAll); // username not exists
      }
    });
  });
  return deferred.promise;
};
exports.getRequestTestData = function(username,testName) {
  var deferred = Q.defer();
  var dataAll = [];
  MongoClient.connect(mongodbUrlAwsKubeAutoScaleTestData, function (err, db) {
    var collectionNameRequestData = testName+'requestData'+username;
    var collection = db.collection(collectionNameRequestData);

    collection.find({}).limit(1000).toArray(function (err,result) {
      if (result.length)
      {
        dataAll=result;
        db.close();
        deferred.resolve(dataAll); // username exists
      }
      else
      {
        deferred.resolve(dataAll); // username not exists
      }
    });
  });
  return deferred.promise;
};
exports.getLoadKubernetesData = function(username,testName) {
  var deferred = Q.defer();
  var dataAll = [];
  MongoClient.connect(mongodbUrlAwsKubeAutoScaleTestData, function (err, db) {
    var collectionNameKubeData = testName+'kubernetesData'+username;
    var collection = db.collection(collectionNameKubeData);

    collection.find({}).limit(1000).toArray(function (err,result) {
      if (result.length)
      {
        dataAll=result;
        db.close();
        deferred.resolve(dataAll); // username exists
      }
      else
      {
        deferred.resolve(dataAll); // username not exists
      }
    });
  });

  return deferred.promise;
};
exports.getAutoscaleData = function(username,testName) {
  var deferred = Q.defer();
  var dataAll = [];
  MongoClient.connect(mongodbUrlAwsKubeAutoScaleTestData, function (err, db) {
    var collectionNameAutoscaleData = testName+'autoscaleData'+username;
    var collection = db.collection(collectionNameAutoscaleData);

    collection.find({}).limit(1000).toArray(function (err,result) {
      if (result.length)
      {
        dataAll=result;
        db.close();
        deferred.resolve(dataAll); // username exists


      }
      else
      {
        deferred.resolve(dataAll); // username not exists
      }
    });
  });

  return deferred.promise;
};
exports.getLoadTestTimelineData = function(username,testName) {
  var deferred = Q.defer();
  var dataAll = [];
  MongoClient.connect(mongodbUrlAwsKubeAutoScaleTestData, function (err, db) {
    var collectionNameKubeData = testName+'kubernetesData'+username;
    var collection = db.collection(collectionNameKubeData);

    collection.find({}).limit(1000).toArray(function (err,result) {
      if (result.length)
      {
        var eventsArr= [];;
        for(i=0;i<result.length;i++)
        {
          for(j=0;j<result[i].data.eventsInfo.length;j++) {
            eventsArr.push(result[i].data.eventsInfo[j]);
          }
        }
        dataAll=eventsArr;
        db.close();
        deferred.resolve(dataAll); // username exists

      }
      else
      {
        deferred.resolve(dataAll); // username not exists
      }
    });
  });

  return deferred.promise;
};
exports.addAutoscalingData = function (username,testName,data) {
  var deferred = Q.defer();
  MongoClient.connect(mongodbUrlAwsKubeAutoScaleTestData, function (err, db) {
    var collectionNameRequestData = testName+'autoscaleData'+username;
    console.log(collectionNameRequestData);
    var collection = db.collection(collectionNameRequestData);
    collection.insert(data)
      .then(function () {
        db.close();
        deferred.resolve(true);
      });
  });
  return deferred.promise;
};
exports.addGenericTestData = function (username, data) {
  var deferred = Q.defer();
  MongoClient.connect(mongodbUrlAwsKubeAutoScaleTestData, function (err, db) {
    var collectionNameRequestData = 'genericTestData'+username;
    console.log(collectionNameRequestData);
    var collection = db.collection(collectionNameRequestData);
    collection.insert(data)
      .then(function () {
        db.close();
        deferred.resolve(true);
      });
  });
  return deferred.promise;
};
