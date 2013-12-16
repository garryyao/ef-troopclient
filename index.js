exports = module.exports = function TroopClient() {
	"use strict"

	var COOKIE_DATA = "cookie";
	var SET_COOKIE = "set-cookie";
	var LOGIN_SUCCESS = "success";
	var DEFAULT_COUNTRY_COOKIE = "ctr=us";
	var QUERY_URL = "/query";
	var COMMAND_URL = "/command";
	var CP = "CP";
	var RESOURCE_ID = "ResourceId";
	var FAILED = "{ 'error': 1 }";

	var targetHost;
	var loginHandler;
	var userName;
	var password;
	var queryEndpoint;

	var data = {};
	var port = 7163;
	var clc = require("cli-color");
	var readline = require("readline");
	var when = require("when");

	function run() {

		var rlDefer = when.defer();
		var rl = readline.createInterface({
		  input: process.stdin,
		  output: process.stdout
		});

		rl.question("Target Host: ", function(answer) {
		  targetHost = answer;
		  loginHandler = "http://" + targetHost + "/login/handler.ashx";
		  queryEndpoint = "http://" + targetHost + "/services/shared/queryproxy";

		  rl.question("Username?", function(answer) {
		  	userName = answer;

		  	rl.question("Password?", function(answer) {
		  		password = answer;

		  		rl.close();
		  		rlDefer.resolve();
		  	})
		  })
		});

		rlDefer.promise.then(function() {
			var authDefer = when.defer();
			authenticate(authDefer);
			authDefer.promise.then(function(authResult) {
				if(authResult) {
					startServer();
				}
				else {
					console.log(clc.red("authenticate failed"));
				}
			});
		});
	}

	function startServer() {
		var connect = require("connect");
		connect()
			.use(connect.logger("dev"))
			.use(connect.static("static"))
			.use(function(req, res) {
				handleRequest(req, res);
			})
			.listen(port);

		var spawn = require('child_process').spawn;
		spawn("open", ["http://localhost:" + port  + "/index.htm"]);
	}

	function handleRequest(req, res) {
		if(req.url == QUERY_URL) {
			handleQuery(req, res);
		}
		else {
			res.end();
		}
	}

	function handleQuery(req, res) {
		var defer = when.defer();
		var request = require("request");

		readPostData(req, defer);
		res.writeHead(200, {"Content-Type": "application/json"});
		
		defer.promise.then(function(d) {
			var cp = d[CP];
			var resourceId = d[RESOURCE_ID];

			var jar = appendCookie(request);
			request({
				"url": queryEndpoint + "?c=" + cp,
				"method": "POST",
				"form": {
					"q": resourceId
				},
				"jar": jar
			}, function(error, response, body) {
				if(response && response.statusCode == 200) {
					res.end(JSON.stringify(body));
				}
				else {
					res.end(FAILED);
				}
			});

		}, function() {
			res.end(FAILED);
		})
	}

	function readPostData(req, defer) {
		var qs = require('querystring');

	    if (req.method == 'POST') {
	        var body = '';
	        req.on('data', function (data) {
	            body += data;
	        });
	        req.on('end', function () {
	            var postedData = qs.parse(body);
	            defer.resolve(postedData);
	        });
	    }
	    else {
	    	defer.reject();
	    }
	}

	function appendCookie(request) {
		var jar = request.jar();
		var cookie;

		if(data[COOKIE_DATA]) {
			data[COOKIE_DATA].forEach(function(item) {
				cookie = request.cookie(item);
				jar.add(cookie);
			})
		}

		return jar;
	}

	function authenticate(defer) {
		var request = require("request");

		var cookie = request.cookie(DEFAULT_COUNTRY_COOKIE);
		var jar = request.jar();
		jar.add(cookie);

		request({
			"url": loginHandler,
			"method": "POST",
			"form": {
				"UserName": userName,
				"Password": password,
				"NoRedirect": 1
			},
			"jar": jar
		}, function(error, response, body) {
			if(response && response.statusCode == 200 && body == LOGIN_SUCCESS) {
				data[COOKIE_DATA] = response.headers[SET_COOKIE];
				defer.resolve(true);
			}
			else {
				defer.resolve(false);
			}
		});
	}

	return {
		"run" : run
	};
};

