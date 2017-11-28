var socket = io.connect("/");

function performLoadTest(param){
    console.log("enter performLoadTest");

    if(param=='custom') {
        var customLoadTestForm = document.getElementById("customLoadTestForm");

        var testUrl = customLoadTestForm.elements["testUrl"].value;
        var numConcurrClients = customLoadTestForm.elements["numConcurrClients"].value;
        var maxRequests = customLoadTestForm.elements["maxRequests"].value;
        var maxSeconds = customLoadTestForm.elements["maxSeconds"].value;
        var maxTimeOut = customLoadTestForm.elements["maxTimeOut"].value;
        var method = customLoadTestForm.elements["methodForm"].value;

        var maxRequestsPerSecond = customLoadTestForm.elements["maxRequestsPerSecond"].value;
        var options = '';
        if (method == "PUT" || method == "POST") {
            var body = customLoadTestForm.elements["body"].value;
            if (body) {
                var contentType = customLoadTestForm.elements["contentType"].value;
                options = {
                    url: testUrl,
                    concurrency: numConcurrClients, //How many clients to start in parallel.
                    maxRequests: maxRequests, //A max number of requests; after they are reached the test will end.
                    maxSeconds: maxSeconds,
                    timeout: maxTimeOut, //Timeout for each generated request in milliseconds. Setting this to 0 disables timeout (default).
                    method: method, //The method to use: POST, PUT. Default: GET.
                    body: body,// The contents to send in the body of the message, for POST or PUT requests. Can be a string or an object (which will be converted to JSON).
                    contentType: contentType,//The MIME type to use for the body. Default content type is text/plain.
                    requestsPerSecond: maxRequestsPerSecond //How many requests each client will send per second.
                };
            }
            else {
                alert("Please Specify the Body if the method is PUT or POST");
                document.location.href = "/custom_test.html";
            }
        }
        else {
            options = {
                url: testUrl,
                concurrency: numConcurrClients, //How many clients to start in parallel.
                maxRequests: maxRequests, //A max number of requests; after they are reached the test will end.
                maxSeconds: maxSeconds,
                timeout: maxTimeOut, //Timeout for each generated request in milliseconds. Setting this to 0 disables timeout (default).
                requestsPerSecond: maxRequestsPerSecond //How many requests each client will send per second.
            };
        }
        console.log(JSON.stringify(options));
        var data = {
            /*creating a Js ojbect to be sent to the server*/
            "type": "custom",
            "options": options
        }
        socket.send(JSON.stringify(data));
        alert("Request Sent To the Server, You can now view the graphs tab");
        document.location.href = "/basic_table.html";
    }
    else if(param=='basic'){

        var basicLoadTestForm = document.getElementById("basicLoadTestForm");
        var optionSelected = parseInt(basicLoadTestForm.elements["optionsRadios"].value) -1 ;

        var testUrl = basicLoadTestForm.elements["testUrl"].value;
        if(testUrl) {
            var numConcurrClients = basicLoadTestForm.elements["numConcurrClients"][optionSelected].value;
            var maxRequests = basicLoadTestForm.elements["maxRequests"][optionSelected].value;
            var maxTimeOut = basicLoadTestForm.elements["maxTimeOut"][optionSelected].value;
            var maxRequestsPerSecond = basicLoadTestForm.elements["maxRequestsPerSecond"][optionSelected].value;
            var options = '';
            options = {
                url: testUrl,
                concurrency: numConcurrClients, //How many clients to start in parallel.
                maxRequests: maxRequests, //A max number of requests; after they are reached the test will end.
                timeout: maxTimeOut, //Timeout for each generated request in milliseconds. Setting this to 0 disables timeout (default).
                requestsPerSecond: maxRequestsPerSecond //How many requests each client will send per second.
            };
            var data = {
                /*creating a Js ojbect to be sent to the server*/
                "type": "basic",
                "options": options
            }
            socket.send(JSON.stringify(data));
            alert("Request Sent To the Server, You can now view the graphs tab");
            document.location.href = "/basic_table.html";
        }
        else
        {
            alert("Please Enter URL before submitting");
            document.location.href = "/basic_test.html";
        }
    }
}

function showMapData(locations) {
    console.log(locations);
    var testData = {
        max: 80,
        data: locations
    };
    var baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
    });
    var cfg = {
        "radius": 2,
        "maxOpacity": .8,
        "scaleRadius": true,
        "useLocalExtrema": true,
        latField: 'lat',
        lngField: 'lng',
        valueField: 'count'
    };
    var heatmapLayer = new HeatmapOverlay(cfg);
    var map = new L.Map('map-canvas', {
        center: new L.LatLng(24.6408, 46.7728),
        zoom: 4,
        layers: [baseLayer, heatmapLayer]
    });
    heatmapLayer.setData(testData);


};