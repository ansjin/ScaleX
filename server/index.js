'use strict';
const config = require('./config');
const serverPort =  config.server.port;
const app = require('./app');
app.listen(serverPort, function (err) {
    if (err) {
        throw err
    }
    console.log('Server is listening at ' + serverPort);
});
