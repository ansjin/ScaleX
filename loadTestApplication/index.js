// =============================================================================
var express             = require('express');
var app                 = express();
var config              = require("./config");
var bodyParser          = require('body-parser');
var loadtest            = require('loadtest');
var mongoose	        = require('mongoose');
var server              = require('http').createServer(app);
var loadTestModel		= require('./models/loadTestModel');
var io                  = require('socket.io').listen(server);
var path                = require('path');
var net                 = require('net');


var mongohost = process.env.MONGODB_HOST || config.mongo.host;
var mongodb = process.env.MONGODB_DB || config.mongo.db;

var port        = process.env.PORT || config.server.port; // set our port
var portForUI   = process.env.PORT || config.server.portForUI; // set our port

mongoose.connect('mongodb://'+mongohost+'/'+mongodb, function(err, res) {
    if(err) throw err;
    console.log('Connected to MongoDB');
});

/**
 *  for debugging and other optional flags
 */
var de = true; // true when debugging
var logging =true
function bug( msg ){console.log(msg); }

// configure body parser
app.use(express.static(__dirname + '/bower_components'));
app.use(express.static(path.resolve(__dirname, 'public')));
app.use(express.static(path.resolve(__dirname, 'views')));
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/views'));
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

server.listen(portForUI);
serverio = io.listen(server);

function statusCallback(error, result, latency) {
   // console.log('Current latency %j, result %j, error %j', latency, result, error);
    console.log('----');

    serverio.sockets.on("connection",function(serverSocket) {
        serverSocket.send({latencyS: latency,
            //resultS: result,
            errorS: error,
            requestElapsedS: result.requestElapsed,
            requestIndexS: result.requestIndex,
            instanceIndexS: result.instanceIndex
        });
    });

    if(result) {
       // console.log('Request elapsed milliseconds: ', result.requestElapsed);
       // console.log('Request index: ', result.requestIndex);
        //console.log('Request loadtest() instance index: ', result.instanceIndex);
        try {

            var m = new loadTestModel({
                latencyS: latency,
                resultS: result,
                errorS: error,
                requestElapsedS: result.requestElapsed,
                requestIndexS: result.requestIndex,
                instanceIndexS: result.instanceIndex
            });
        } catch (err)
        {
            console.log(err);
        }
    }
    else
    {
        try {

            var m = new loadTestModel({
                latencyS: latency,
                resultS: result,
                errorS: error,
                requestElapsedS: '',
                requestIndexS: '',
                instanceIndexS: ''
            });
        } catch (err)
        {
            console.log(err);
        }

    }
   try {
    m.save(function(err,loadTestVal ) {
        if (err) {
            console.log(err);
        }
        console.log("...................Added.....................");
    });
    } catch (err)
    {
        console.log(err);
    }
}
// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();
// middleware to use for all requests
router.use(function(req, res, next) {
    // do logging
    console.log('Generating the load');
    next();
});
router.route('/generateLoad')
    .post(function(req, res)
    {
        var url = req.body.url;

        if(url) {
            var options = {
                url: url,
                concurrency: 10, //How many clients to start in parallel.
                maxRequests: 4000, //A max number of requests; after they are reached the test will end.
                //maxSeconds: 112,
                //timeout: 0 //Timeout for each generated request in milliseconds. Setting this to 0 disables timeout (default).
                //method : GET //The method to use: POST, PUT. Default: GET.
                //body: // The contents to send in the body of the message, for POST or PUT requests. Can be a string or an object (which will be converted to JSON).
                //contentType: //The MIME type to use for the body. Default content type is text/plain.
                requestsPerSecond: 10, //How many requests each client will send per second.
                statusCallback: statusCallback
            };

            loadtest.loadTest(options, function(error) {
                if (error) {
                    return console.error('Got an error: %s', error);
                }
                console.log('Tests run successfully');
                res.json('Tests run successfully');
            });


        }
        else
        {
            res.json("send data properly");
        }
    });

app.use('/loadtest', router);
// START THE SERVER
// =============================================================================
app.listen(port);
serverio.sockets.on("connection",function(serverSocket) {
    de && bug('Server Connection with the client established')
    /*saving the client information*/
    serverSocketSaved = serverSocket;

    serverSocket.on("message", function (params) {

        var req = serverSocket.request;
        /**
         * Parse the params
         */
        clientParams = JSON.parse(params);
        de && bug(JSON.stringify(clientParams));
        /**
         * query to mongodb to fetch the data call the data analyzer and return the analyzed data
         */
        switch (clientParams.type){
            case "custom":
                de && bug(JSON.stringify(clientParams.options));
                var options = clientParams.options;
                options.statusCallback=statusCallback;
                de && bug(JSON.stringify(options));

                loadtest.loadTest(options, function(error) {
                    if (error) {
                        return console.error('Got an error: %s', error);
                    }
                    console.log('Tests run successfully');
                    res.json('Tests run successfully');
                });
                break;
            case "basic":
                de && bug(JSON.stringify(clientParams.options));
                var options = clientParams.options;
                options.statusCallback=statusCallback;
                de && bug(JSON.stringify(options));

                 loadtest.loadTest(options, function(error) {
                 if (error) {
                 console.error('Got an error: %s', error);
                 }
                 console.log('Tests run successfully');
                 });
                break;
            default:
                serverSocketSaved.send("Wrong Param");
                break;
        }

    });
});
console.log('Server started and listening on port ' + port);
