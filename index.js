'use strict';


var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    bodyParser = require('body-parser'),
    secret = 'secret',
    verifyGitHubSignature = require('./lib/verifyGitHubSignature'),
    getConfig = require('./lib/getConfig'),
    deployTasks = require('./lib/deployTasks');

app.use(bodyParser.urlencoded({extended: false}));

app.use(bodyParser.json());

verifyGitHubSignature.setSecret(secret);

app.get('/', function (req, res) {
	res.status(200).send('OK');
});

getConfig(function (config) {
    deployTasks.initConfig(config);

    var branch = config.branch || 'master';

    app.post(config.route, function (req, res) {

        // Checking if request is authentic
        if (verifyGitHubSignature.ofRequest(req)) {

            // If master was updated, do stuff
            if (req.body.ref && req.body.ref === `refs/heads/${branch}`) {

                console.log('Valid payload! Running commands');
                
                res.status(200).send();

                deployTasks.run(function () {
                    console.log("Done");
                });

            } else {
                // if other branches were updated, send 200 only to make github happy...
                console.log(`Received payload unrelated to ${branch} branch`);
                res.status(200).send();
            }
        } else {
            console.warn('Received payload with an invalid secret');
            res.status(403).send();
        }
    });

    server.listen(config.port, '0.0.0.0', function () {
        console.log(`Listening for webhook events on port ${config.port}`);
    });
});
