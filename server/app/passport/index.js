const passport      = require('passport');
const LocalStrategy = require('passport-local');
//===============PASSPORT=================
exports.initPassport = function() {
  "use strict";
// Passport session setup.
  passport.serializeUser(function (user, done) {
    console.log("serializing " + user.username);
    done(null, user);
  });

  passport.deserializeUser(function (obj, done) {
    console.log("deserializing " + obj);
    done(null, obj);
  });

// Use the LocalStrategy within Passport to login users.
  passport.use('local-signin', new LocalStrategy(
    {passReqToCallback: true}, //allows us to pass back the request to the callback
    function (req, username, password, done) {
      funct.localAuth(username, password)
        .then(function (user) {
          if (user) {
            console.log("LOGGED IN AS: " + user.username);
            req.session.success = 'You are successfully logged in ' + user.username + '!';
            done(null, user);
          }
          if (!user) {
            console.log("COULD NOT LOG IN");
            req.session.error = 'Could not log user in. Please try again.'; //inform user could not log them in
            done(null, user);
          }
        })
        .fail(function (err) {
          console.log(err.body);
        });
    }
  ));

// Use the LocalStrategy within Passport to Register/"signup" users.
  passport.use('local-signup', new LocalStrategy(
    {passReqToCallback: true}, //allows us to pass back the request to the callback
    function (req, username, password, done) {
      funct.localReg(username, password)
        .then(function (user) {
          if (user) {
            console.log("REGISTERED: " + user.username);
            req.session.success = 'You are successfully registered and logged in ' + user.username + '!';
            done(null, user);
          }
          if (!user) {
            console.log("COULD NOT REGISTER");
            req.session.error = 'That username is already in use, please try a different one.'; //inform user could not log them in
            done(null, user);
          }
        })
        .fail(function (err) {
          console.log(err.body);
        });
    }
  ));
}
