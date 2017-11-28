const express               = require('express');
const router                = express.Router();
const funct                 = require('../functions');
const passport              = require('passport');
const kube                  = require("../auto_scaling_solutions/kubernetes/index");
const kubeMongoFunctions    = require("../auto_scaling_solutions/kubernetes/kubeMongoFunctions");
var http                    = require('http');
var request                 = require('request');

//===============ROUTES=================
//displays our homepage
router.get('/', function(req, res){
  res.render('home', {user: req.user});
});
router.get('/edituserInfo', function(req, res){
  funct.getUserInfoforEdit(req.user.username, res,req);
});
//displays our signup page
router.get('/signin', function(req, res){
  res.render('signin');
});
router.get('/register', function(req, res){
    res.render('register');
});
//sends the request through our local signup strategy, and if successful takes user to homepage, otherwise returns then to signin page
router.post('/local-reg', passport.authenticate('local-signup', {
    successRedirect: '/',
    failureRedirect: '/signin'
  })
);


//sends the request through our local login/signin strategy, and if successful takes user to homepage, otherwise returns then to signin page
router.post('/login', passport.authenticate('local-signin', {
    successRedirect: '/',
    failureRedirect: '/signin'
  })
);
/* GET getUserInfo page. */
router.get('/userinfo', function(req, res) {
  funct.getUserInfo(req.user.username, res,req);
});
router.post('/saveuserInfo', function(req, res){
  funct.saveUserInfo(req.user.username, req.body, res.body)
    .then(function (user) {
      if (user) {
        console.log("added informtion");
        //dataForm:
        res.render('success', {
          user: req.user.username,
          dataForm: req.body,
          dataClient: req.body
        });
        //res.json({"message": "added"});
      }
      else {
        console.log("user not found");
        res.render('failure', {
          user: req.user.username,
          error: "Not able to submit, check your data"
        });
      }
    });
});
/*
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
*/
//logs user out of site, deleting them from the session, and returns to homepage
router.get('/logout', function(req, res, next){
  var name = req.user.username;
  console.log("LOGGIN OUT " + req.user.username);
  req.session.notice = "You have successfully been logged out " + name + "!";
  req.session.destroy(function(err) {
    res.redirect('/');
  });
});

module.exports = router;
