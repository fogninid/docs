'use strict';

const WebSocket = require('ws');
const http = require('http');

const scan = require('./Scan');

const errorHandler = (res) => e => {
  if (Error.isPrototypeOf(e)) {
    console.error(e.stack);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({error: e}));
  } else {
    res.statusCode = e.code;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({error: e.cause}))
  }
};

const handleScan = (req, res) => {
  const url = req.url;
  const method = req.method;

  if (/^\/scan\/?$/.test(url)) {

    if (method === 'POST') {
      scan.start()
        .then(id => {
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

const listen = process.argv.length > 2 ? process.argv[2] : 8080;
console.log("listening on %s", listen);
httpServer.listen(listen);
