'use strict';

const listen = process.argv.length > 2 ? process.argv[2] : 8080;
const repodir = "/tmp";

const WebSocket = require('ws');

const http = require('http');
const scan = require('./Scan');

const Repo = require('./Repository').Repo;
const repo = new Repo(repodir);

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
  if (/^\/scan\/.*/.test(req.url)) {
    handleScan(req, res);
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
