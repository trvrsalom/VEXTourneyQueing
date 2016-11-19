var queueModes = ['Pit Queing', 'Field Queing'];
var queueMode = 0;
var queuingStatus = ["none", "toBeQueued", "called", "queued"];
var socket;
socket = new WebSocket("ws://162.243.153.213:8081");

function getList(next) {
	$.get( "/schedule/", function(data) {
		next(data);
	});
}

function queueMatch(match) {
	var p = {
		"method": "queueMatch",
		"data" : {
			"match" : match
		}
	};
	socket.send(JSON.stringify(p));
}

function callTeam(match, spot) {
	var p = {
		"method": "callTeam",
		"data": {
			"match": match,
			"spot": spot
		}
	};
	socket.send(JSON.stringify(p));
}

function checkTeam(match, spot) {
	var p = {
		"method": "checkTeam",
		"data": {
			"match": match,
			"spot": spot
		}
	};
	socket.send(JSON.stringify(p));
}

function setWarning(match, spot) {
	$("#m" + match + spot).removeClass("error");
	$("#m" + match + spot).removeClass("warning");
	$("#m" + match + spot).removeClass("positive");
	$("#m" + match + spot).addClass("warning");
}

function setMissing(match, spot) {
	$("#m" + match + spot).removeClass("error");
	$("#m" + match + spot).removeClass("warning");
	$("#m" + match + spot).removeClass("positive");
	$("#m" + match + spot).addClass("error");
}

function setPositive(match, spot) {
	$("#m" + match + spot).removeClass("error");
	$("#m" + match + spot).removeClass("warning");
	$("#m" + match + spot).removeClass("positive");
	$("#m" + match + spot).addClass("positive");
}

function setWarningWholeMatch(match) {
	setWarning(match, 'r1');
	setWarning(match, 'b1');
	setWarning(match, 'r2');
	setWarning(match, 'r3');
	setWarning(match, 'b2');
	setWarning(match, 'b3');
}

function setMissingWholeMatch(match) {
	setMissing(match, 'r1');
	setMissing(match, 'b1');
	setMissing(match, 'r2');
	setMissing(match, 'b2');
	setMissing(match, 'r3');
	setMissing(match, 'b3');
}

function setPositiveWholeMatch(match) {
	setPositive(match, 'r1');
	setPositive(match, 'b1');
	setPositive(match, 'r2');
	setPositive(match, 'b2');
	setPositive(match, 'r3');
	setPositive(match, 'b3');
}

function getCellStatus(match, spot) {
	var c = $("#m" + match + spot).attr("class");
	if(c === undefined) return 0;
	else if(c == "warning") return 1;
	else if(c == "error") return 2;
	else if(c == "positive") return 3;
}

function statusToClass(status) {
	if(status == 1) return "warning";
	else if(status == 2) return "error";
	else if(status == 3) return "positive";
	else return "";
}

function addMatchRow(match) {
	var buttonStr = "<td><button class='ui primary basic button queueMatchButton' id='queueMatchButton' onClick='queueMatch(" + match.matchNum + ")'>Queue Match</button></td>";
	var r1c = statusToClass(match.r1_status);
	var r2c = statusToClass(match.r2_status);
	var b1c = statusToClass(match.b1_status);
	var b2c = statusToClass(match.b2_status);
	var b3c = statusToClass(match.b3_status);
	var r3c = statusToClass(match.b3_status);
	console.log([r1c, r2c, b1c, b2c]);
	var str = "<tr id='m" + match.matchNum + "'><td>" + match.matchNum + "</td><td id='m" + match.matchNum + "r1' class='" + r1c + "' onclick='checkTeamCell(this)'>" + match.r1 + "</td><td id='m" + match.matchNum + "r2' class='" + r2c + "' onclick='checkTeamCell(this)'>" + match.r2 + "</td><td id='m" + match.matchNum + "r3' class='" + r3c + "' onclick='checkTeamCell(this)'>" + match.r3 + "</td><td id='m" + match.matchNum + "b1' class='" + b1c + "' onclick='checkTeamCell(this)'>" + match.b1 + "</td><td id='m" + match.matchNum + "b2' class='" + b2c + "' onclick='checkTeamCell(this)'>" + match.b2 + "</td><td id='m" + match.matchNum + "b3' class='" + b3c + "' onclick='checkTeamCell(this)'>" + match.b3 + "</td>" +  buttonStr + "</tr>";
	$("#matchList").append(str);
}

function checkTeamCell(cell) {
	var cellId = $(cell).attr("id");
	var match;
	if(cellId.indexOf('r') > -1) match = cellId.match('m(.*)r')[0];
	else match = cellId.match('m(.*)b')[0];
	match = match.substring(1, match.length-1);
	var spot = cellId.substring(cellId.length - 2, cellId.length);
	var status = getCellStatus(match, spot);
	if(queueMode === 0) {
		if(status === 1) callTeam(match, spot);
		else if(status == 1) uncallTeam(match, spot);
	}
	else if(queueMode == 1) {
		if(status === 0 || status == 1 || status == 2) checkTeam(match, spot);
		else if(status == 3) callTeam(match, spot);
	}
}


function switchQueueMode() {
	queueMode = queueMode === 0 ? 1 : 0;
	if(queueMode === 0) $(".queueMatchButton").hide();
	else $(".queueMatchButton").show();
	$("#mode").html(queueModes[queueMode]);
}

function onMessage(event) {
	var data = event.data;
	try {
		data = JSON.parse(data);
	}
	catch(e) {
		console.warn("Invalid JSON");
		data = {};
	}
	switch(data.method) {
		case "queueMatch":
			setWarningWholeMatch(data.data.match);
			break;
		case "callTeam":
			setMissing(data.data.match, data.data.spot);
			break;
		case "checkTeam":
			setPositive(data.data.match, data.data.spot);
			break;
		default:
			console.warn("Invalid method: " + data.method);
			break;
	}
}

getList(function(data) {
	for(var i = 0; i < data.length; i++) addMatchRow(data[i]);
	socket.onmessage = onMessage;

	switchQueueMode();
	switchQueueMode();
});
