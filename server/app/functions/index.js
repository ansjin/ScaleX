var ObjectId          = require('mongodb').ObjectID;
const bcrypt          = require('bcryptjs');
const Q                = require('q');
const config          = require('../../config');
var http              = require('http');
var request           = require('request');
// MongoDB connection information
const mongodbUrl = 'mongodb://'+ config.mongodb.host + ':'+config.mongodb.port+'/'+config.mongodb.dbUsersData.name;
const collectionName = config.mongodb.dbUsersData.collectionName;
var MongoClient = require('mongodb').MongoClient;

exports.localReg = function (username, password) {
  var deferred = Q.defer();
  MongoClient.connect(mongodbUrl, function (err, db) {
    var collection = db.collection(collectionName);
    //check if username is already assigned in our database
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result) {
          console.log("USERNAME ALREADY EXISTS:", result.username);
          deferred.resolve(false); // username exists
        }
        else  {
          var hash = bcrypt.hashSync(password, 8);
          var user = {
            "userInfo": {
              "username": username,
              "password": hash,
              "avatar": "http://placepuppy.it/images/homepage/Beagle_puppy_6_weeks.JPG"
            }
          }
          console.log("CREATING USER:", username);
          collection.insert(user)
            .then(function () {
              db.close();
              deferred.resolve(user["userInfo"]);
            });
        }
      });
  });
  return deferred.promise;
};
exports.localAuth = function (username, password) {
  var deferred = Q.defer();

  MongoClient.connect(mongodbUrl, function (err, db) {
    var collection = db.collection(collectionName);

    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null == result) {
          console.log("USERNAME NOT FOUND:", username);

          deferred.resolve(false);
        }
        else {
          var hash = result["userInfo"].password;

          console.log("FOUND USER: " + result["userInfo"].username);

          if (bcrypt.compareSync(password, hash)) {
            deferred.resolve(result["userInfo"]);
          } else {
            console.log("AUTHENTICATION FAILED");
            deferred.resolve(false);
          }
        }
        db.close();
      });
  });
  return deferred.promise;
}
exports.getUserInfo = function (username, res,req) {

  console.log(username);
  MongoClient.connect(mongodbUrl, function (err, db) {
    var collection = db.collection(collectionName);

    //check if username is already assigned in our database
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result) {
          console.log("found in userInfo");
          res.render('user', {
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
exports.getUserInfoforEdit = function (username, res,req) {

  console.log(username);
  MongoClient.connect(mongodbUrl, function (err, db) {
    var collection = db.collection(collectionName);
    //check if username is already assigned in our database
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result) {
          console.log("found");
          res.render('editUser', {
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
exports.saveUserInfo = function (username,data, responseExData) {

  var deferred = Q.defer();

  MongoClient.connect(mongodbUrl, function (err, db) {
    var collection = db.collection(collectionName);

    //check if username is already assigned in our database
    collection.findOne({'userInfo.username' : username})
      .then(function (result) {
        if (null != result)
        {
          console.log("USERNAME  EXISTS:", result["userInfo"].username);

          collection.update({'userInfo.username' : username},
            {$set : {
              "userInfo.name": data.name,
              "userInfo.email": data.email,
              "userInfo.awstoken":data.awstoken ,
              "userInfo.awssecret":data.awssecret,
              "userInfo.awskeyname":data.awskeyname,
              "userInfo.awsregion":data.awsregion,
              "userInfo.awssecurityid":data.awssecurityid,
              "userInfo.awssubnetid":data.awssubnetid,
              "userInfo.awssubnetid2":data.awssubnetid2,
              "userInfo.lrzinfo":data.lrzinfo,
              "userInfo.other":data.other
            }
            },
            {upsert:false})

          deferred.resolve(true); // username exists
        }
        else
        {

          console.log("user Not exists:", username);
          deferred.resolve(false); // username not exists
        }
      });
  });

  return deferred.promise;
};
