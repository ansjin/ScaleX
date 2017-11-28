const ObjectId          = require('mongodb').ObjectID;
const bcrypt            = require('bcryptjs');
const Q                 = require('q');
const config            = require('../../../config');
const http              = require('http');
const request           = require('request');
// MongoDB connection information
const mongodbUrlKubeConfig = 'mongodb://'+ config.mongodb.host + ':'+config.mongodb.port+'/'+config.mongodb.dbUsersData.name;
const collectionNameKubeConfig = config.mongodb.dbUsersData.collectionName;

const mongodbUrlKubeTestData = 'mongodb://'+config.mongodb.host + ':'+config.mongodb.port+'/'+config.mongodb.dbKubernetesTestData.name;
const collectionNameKubeTestData = '';
const MongoClient = require('mongodb').MongoClient;

exports.addConfigData = function (username,data) {
  var deferred = Q.defer();
  MongoClient.connect(mongodbUrlKubeConfig, function (err, db) {
    var collection = db.collection(collectionNameKubeConfig);
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result)
        {
          collection.update({'userInfo.username' : username},
            {
              $set : {
                "kubernetes.kubernetesConfig": {
                  "master": data.master,
                  "minionIds": data.minion
                }
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
  MongoClient.connect(mongodbUrlKubeConfig, function (err, db) {
    var collection = db.collection(collectionNameKubeConfig);
    //check if username is already assigned in our database
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result)
        {
          var masterId= result["kubernetes"]["kubernetesConfig"].master.instanceid;
          var minionIds = result["kubernetes"]["kubernetesConfig"].minionIds;
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
  MongoClient.connect(mongodbUrlKubeConfig, function (err, db) {
    var collection = db.collection(collectionNameKubeConfig);
    //check if username is already assigned in our database
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result) {
          console.log("found");
          res.render('kubernetes/kubernetesAws', {
            layout: '../kubernetes/layouts/main',
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
  console.log("Hello"+username);
  MongoClient.connect(mongodbUrlKubeConfig, function (err, db) {
    var collection = db.collection(collectionNameKubeConfig);

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

  MongoClient.connect(mongodbUrlKubeConfig, function (err, db) {
    var collection = db.collection(collectionNameKubeConfig);

    //check if username is already assigned in our database
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result)
        {
          var ip= result["kubernetes"]["kubernetesConfig"].master.ip;
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
exports.getServiceURL = function(username) {
  var deferred = Q.defer();

  MongoClient.connect(mongodbUrlKubeConfig, function (err, db) {
    var collection = db.collection(collectionNameKubeConfig);

    //check if username is already assigned in our database
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result)
        {
          //console.log("USERNAME  EXISTS:", result.username);
          var url= result["kubernetes"]["kubernetesConfig"].master.serviceURL;
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

exports.setManualRecording = function (username,data) {
  var deferred = Q.defer();
  MongoClient.connect(mongodbUrlKubeConfig, function (err, db) {
    var collection = db.collection(collectionNameKubeConfig);
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result )
        {
          if(data) {
            collection.update({'userInfo.username': username},
              {
                $set: {
                  "kubernetes.manualRecording": data,
                }
              },
              {upsert: false});
            MongoClient.connect(mongodbUrlKubeTestData, function (err, db) {
              var collectionName = 'manualData'+username;

              db.listCollections({name: collectionName})
                .next(function(err, collinfo) {
                  if (collinfo) {
                    // The collection exists
                    db.collectionName.drop();
                  }
                });
            });
          }
          else
          {
            collection.update({'userInfo.username': username},
              {
                $set: {
                  "kubernetes.manualRecording": data
                }
              },
              {upsert: false});
          }
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
exports.getManualRecording = function(username) {
  var deferred = Q.defer();
  MongoClient.connect(mongodbUrlKubeConfig, function (err, db) {
    var collection = db.collection(collectionNameKubeConfig);
    //check if username is already assigned in our database
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result)
        {
          var value= result["kubernetes"]["manualRecording"];
          deferred.resolve(value);
        }
        else
        {
          console.log("user Not exists:", username);
          deferred.resolve(false);
        }
      });
  });
  return deferred.promise;
}
exports.setLoadTestRecording = function (username,testName,data) {
  var deferred = Q.defer();
  MongoClient.connect(mongodbUrlKubeConfig, function (err, db) {
    var collection = db.collection(collectionNameKubeConfig);

    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result )
        {
          if(data) {
            collection.update({'userInfo.username': username},
              {
                $set: {
                  ["kubernetes."+testName+".enable"]: data
                }
              },
              {upsert: false});

            MongoClient.connect(mongodbUrlKubeTestData, function (err, dbin) {
              var collectionNameRequestData = testName+'requestData'+username;
              var collectionNameKubeData = testName+'kubernetesData'+username;

              dbin.listCollections({name: collectionNameRequestData})
                .next(function(err, collinfo) {
                  if (collinfo) {
                    // The collection exists
                    console.log(collinfo);
                    var collection = dbin.collection(collectionNameRequestData);
                    collection.drop();
                  }
                });
              dbin.listCollections({name: collectionNameKubeData})
                .next(function(err, collinfo) {
                  if (collinfo) {
                    // The collection exists
                    console.log(collinfo);
                    var collection = dbin.collection(collectionNameKubeData);
                    collection.drop();
                  }
                });
            });
          }
          else
          {
            collection.update({'userInfo.username': username},
              {
                $set: {
                  "kubernetes.manualRecording": data
                }
              },
              {upsert: false})
          }
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

exports.addRecordedData = function (username,data) {
  var deferred = Q.defer();
  MongoClient.connect(mongodbUrlKubeTestData, function (err, db) {
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
  MongoClient.connect(mongodbUrlKubeTestData, function (err, db) {
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
exports.addLoadTestRequestData = function (username,testName,data) {
  var deferred = Q.defer();
  MongoClient.connect(mongodbUrlKubeTestData, function (err, db) {
    var collectionNameRequestData = testName+'requestData'+username;
    var collection = db.collection(collectionNameRequestData);
    collection.insert(data)
      .then(function () {
        db.close();
        deferred.resolve(true);
      });
  });
  return deferred.promise;
};
exports.getRequestTestData = function(username,testName) {
  var deferred = Q.defer();
  var dataAll = [];
  MongoClient.connect(mongodbUrlKubeTestData, function (err, db) {
    var collectionNameRequestData = testName+'requestData'+username;
    var collection = db.collection(collectionNameRequestData);

    collection.find({}).toArray(function (err,result) {
        if (result.length)
        {
          dataAll=result;
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
  MongoClient.connect(mongodbUrlKubeTestData, function (err, db) {
    var collectionNameKubeData = testName+'kubernetesData'+username;
    var collection = db.collection(collectionNameKubeData);

    collection.find({}).toArray(function (err,result) {
      if (result.length)
      {
        dataAll=result;
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
  MongoClient.connect(mongodbUrlKubeTestData, function (err, db) {
    var collectionNameKubeData = testName+'kubernetesData'+username;
    var collection = db.collection(collectionNameKubeData);

    collection.find({}).toArray(function (err,result) {
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
exports.savePodInfo = function (data, collectionName) {

  var deferred = Q.defer();

  MongoClient.connect(mongodbUrlKubeConfig, function (err, db) {
    var collection = db.collection(collectionName);

    collection.insert(data)
      .then(function () {
        db.close();
        deferred.resolve(true);
      });
  });
  return deferred.promise;
};


exports.saveLoadTestData = function(loadTestData,collectionName) {
  var data = {};
  var latency = loadTestData.latency;
  var result = loadTestData.result;
  var error = loadTestData.error;
  if(result) {
    data = {
      "latency": latency,
      "result": result,
      "error": error,
      "requestElapsed": result.requestElapsed,
      "requestIndex": result.requestIndex,
      "instanceIndex": result.instanceIndex
    };
  }
  else
  {
    data = {
      "latency": latency,
      "result": result,
      "error": error,
      "requestElapsed":'',
      "requestIndex": '',
      "instanceIndex": ''
    };
  }

  var deferred = Q.defer();

  MongoClient.connect(mongodbUrlKubeConfig, function (err, db) {
    var collection = db.collection(collectionName);
    collection.save(data)
      .then(function () {
        db.close();
        deferred.resolve(true);
      });
  });
  return deferred.promise;
}
exports.initLoadTest = function (collectionName) {

  var deferred = Q.defer();

  MongoClient.connect(mongodbUrlKubeConfig, function (err, db) {


    db.listCollections({name: collectionName})
      .next(function (err, collinfo) {
        if (collinfo) {
          var collection = db.collection(collectionName);
          collection.drop()
            .then(function () {
              db.close();
              deferred.resolve(true);
            });
        }
        else{
          console.log("not present");
          deferred.resolve(true);
        }
      });
  });
  return deferred.promise;
};

