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

const http = require('http');
const Scan = require('./Scan').Scan;
const fs = require("fs");

const Repo = require('./Repository').Repo;
const repo = new Repo(argv.repoDir);

const scan = new Scan(argv.scan.command, argv.scan.args);

const s = argv.staticsDir;
const statics = ["/index.html", "/js/jquery-3.2.1.min.js"];

const errorHandler = (res) => e => {
  try {
    if (e instanceof Error) {
      console.error(e.stack);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end('{"error":"unknown"}');
    } else {
      res.statusCode = e.code;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({error: e.cause}))
    }
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end('{"error":"unknown"}');
  }
};

const handleScan = (req, res) => {
  const url = req.url;
  const method = req.method;

  if (/^\/scan\/?$/.test(url)) {

    if (method === 'POST') {
      repo.mktemp()
        .then(outTmp => {
          return scan.start(outTmp);
        })
        .then(scanning => {
          const id = scanning.id;
          res.statusCode = 201;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({id: id}));
        })
        .catch(errorHandler(res));
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(scan.list()));
    }
  } else if (/^\/scan\/[0-9]+/.test(url)) {
    const id = /^\/scan\/([0-9]+)/.exec(url)[1];
    if (method === "DELETE") {
      scan.stop(id)
        .then(() => {
          res.statusCode = 204;
          res.end();
        })
        .catch(errorHandler(res));
    } else {
      const status = scan.status(id);
      if (status) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(status));
      } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({error: "not found"}));
      }
    }
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({error: "not found"}));
  }
};

const httpServer = http.createServer((req, res) => {
  if (/^\/scan\/?.*/.test(req.url)) {
    handleScan(req, res);
  } else if (statics.includes(req.url)) {
    const path = s + req.url;
    fs.stat(path, (err, stat) => {
      if (err) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({error: "not found"}));
      } else {
        res.writeHead(200, {
          'Content-Length': stat.size
        });

        fs.createReadStream(path).pipe(res);
      }
    });

  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({error: "not found"}));
  }
});

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

console.log("listening on %s", listen);
httpServer.listen(listen);
