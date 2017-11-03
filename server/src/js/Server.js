'use strict';

const argv = require('optimist')
  .default({
    listen: 8080,
    scan: {
      command: "scan",
      args: []
    },
    repoDir: "/tmp/node",
    staticsDir: "client/build"
  })
  .argv;

const listen = argv.listen;

const WebSocket = require('ws');

const express = require('express');
const app = express();

const common = require('./Common');
const repoApp = require('./Repository').app(argv.repoDir);
const repo = repoApp.locals.repo;

const scanApp = require('./Scan').app(repo, argv.scan.command, argv.scan.args);

app.use(express.static(argv.staticsDir));
app.use('/repo', repoApp);
app.use('/scan', scanApp);

app.use(common.errorHandler);

app.listen(argv.listen);

if (false) {
  const wsServer = new WebSocket.Server({server: httpServer});

  wsServer.on('connection', (ws) => {
    ws.on('message', (message) => {
      console.log('received: %s', message);
      ws.send('I got ' + message);
    });

    ws.send('I\'m server');
  });

  wsServer.on('listening', () => {
    console.log('web socket server started');
  });

  httpServer.listen(listen);

  httpServer.on('listening', () => {
    console.log("listening on %s", listen);
  });
}
