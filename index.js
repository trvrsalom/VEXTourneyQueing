var config = {
	port: 8080
};

var queuingStatus = ["none", "toBeQueued", "called", "queued"];

var matchList = 'Matches.csv';

var ws = require("nodejs-websocket");
var path = require('path');
var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var stringify = require('json-stringify-safe');
var app = express();
var matches = [];

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
  next();
});

app.use('/', express.static('static'));
if (fs.existsSync('matches.json')) {
	console.log("Loading matches from matches.json");
  matches = JSON.parse(fs.readFileSync('matches.json'));
}
else {
	matchList = fs.readFileSync(matchList, 'utf8').split('\n');
	console.log("Loading matches from " + matchList);
	for(var i = 1; i < matchList.length - 1; i++) {
		var currmatch = matchList[i].split(",");
		matches[i-1] = {
			'matchNum': currmatch[3],
			'r1': currmatch[5],
			'r1_status': 0,
			'r2': currmatch[6],
			'r2_status': 0,
			'b1': currmatch[8],
			'b1_status': 0,
			'b2': currmatch[9],
			'b2_status': 0
		};
	}
}

app.get('/schedule/', function (req, res) {
	res.json(matches);
});

app.post('/tmshook', function (req, res) {
	/*fs.writeFile('call.json', JSON.stringify(req), function(err) {
		if(err) throw err;
		//else process.exit();
	});*/
	console.log(req.query.type);
	if(req.query.type == "matchupdate") {
		fs.writeFile('call.json', stringify(req, null, 2), function(err) {
			if(err) throw err;
			//else process.exit();
		});
		//s
	}
});

function setTeamStatus(match, team, status) {
	matches[match-1][team + "_status"] = status;
}

function setMatchStatus(match, status) {
	setTeamStatus(match, "r1", status);
	setTeamStatus(match, "r2", status);
	setTeamStatus(match, "b1", status);
	setTeamStatus(match, "b2", status);
}

function parseSocketMessage(inp) {
	try {
		inp = JSON.parse(inp);
	} catch(e) {
		console.warn("Invalid JSON");
		inp = {};
	}
	switch(inp.method) {
		case "queueMatch":
			setMatchStatus(inp.data.match, 1);
			broadcastSocketMessage(inp);
			break;
		case "callTeam":
			setTeamStatus(inp.data.match, inp.data.spot, 2);
			broadcastSocketMessage(inp);
			break;
		case "checkTeam":
			setTeamStatus(inp.data.match, inp.data.spot, 3);
			broadcastSocketMessage(inp);
			break;
		default:
			broadcastSocketMessage({
				"method" : "error"
			});
			break;
	}
}

var server = ws.createServer(function (conn) {
  conn.on("text", function (str) {
    parseSocketMessage(str);
  });
  conn.on("close", function (code, reason) {
  	console.log("Connection closed");
  });
}).listen(config.port + 1);

function broadcastSocketMessage(msg) {
    server.connections.forEach(function (conn) {
        conn.sendText(JSON.stringify(msg));
    })
}

var nserver = app.listen(config.port);
console.log("Server started");

function saveAndClose() {
	nserver.close();
	console.log("\nShutting down");
	fs.writeFile('matches.json', JSON.stringify(matches), function(err) {
		if(err) throw err;
		else process.exit();
	});
}

process.on ('SIGTERM', saveAndClose);
process.on ('SIGINT', saveAndClose);
