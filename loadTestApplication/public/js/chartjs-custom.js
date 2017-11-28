$(document).ready(function() {

    var socket = io.connect("/");
    var datarequestElapsedS = [];
    var datatotalTimeSeconds=[];
    var requestIndex = [];
    var maxLatency = [];
    var minLatency = [];
    var meanLatency = [];
    var barRPS = [];
    var totalTimeSeconds = [];
    var errors = [];

    socket.on("message",function(message) {
        console.log("Message From the server arrived");
        var num = 1;
        requestIndex.push(message.requestIndexS);
        datarequestElapsedS.push(message.requestElapsedS);
        datatotalTimeSeconds.push(message.latencyS.totalTimeSeconds);
        maxLatency.push(message.latencyS.maxLatencyMs);
        minLatency.push(message.latencyS.minLatencyMs);
        meanLatency.push(message.latencyS.meanLatencyMs);
        barRPS.push(message.latencyS.rps);
        totalTimeSeconds.push(message.latencyS.totalTimeSeconds);
        errors.push(message.latencyS.totalErrors);
    });
    console.log(datarequestElapsedS);
    console.log(datatotalTimeSeconds);
    var ctx = document.getElementById('line').getContext('2d');
    var myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: requestIndex,
            datasets: [{
                label: 'Request Elapsed Sec',
                data: datarequestElapsedS,
                backgroundColor: "rgba(255,153,0,0.6)"
            }]
        }
    });

    var ctxLatency = document.getElementById('lineLatency').getContext('2d');
    var myChartLatency = new Chart(ctxLatency, {
        type: 'line',
        data: {
            labels: requestIndex,
            datasets: [{
                label: 'Max Latency',
                data: maxLatency,
                borderColor: "rgba(255,153,0,0.6)",
                fill: false,
            }, {
                label: 'Min Latency',
                data: minLatency,
                borderColor: "red",
                fill: false,
            },{
                label: 'Mean Latency',
                data: meanLatency,
                borderColor: "blue",
                fill: false,
            }
                ]
        }
    });

    var ctxLatency = document.getElementById('barRPS').getContext('2d');
    var myChartLatency = new Chart(ctxLatency, {
        type: 'bar',
        data: {
            labels: requestIndex,
            datasets: [{
                label: 'Requests Per Second',
                data: barRPS,
                backgroundColor: "blue"
            }
            ]
        }
    });
    var ctxlatencyTotal = document.getElementById('lineLatencyTotal').getContext('2d');
    var myChartLatencyTotal = new Chart(ctxlatencyTotal, {
        type: 'line',
        data: {
            labels: requestIndex,
            datasets: [{
                label: 'Total Latency Time (in Sec)',
                data: totalTimeSeconds,
                backgroundColor: "#54F5B7"
            }]
        }
    });
    var ctxErrors = document.getElementById('barErrors').getContext('2d');
    var myChartErrors = new Chart(ctxErrors, {
        type: 'bar',
        data: {
            labels: requestIndex,
            datasets: [{
                label: 'Errors',
                data: errors,
                backgroundColor: "#F5C454"
            }
            ]
        }
    });
});
