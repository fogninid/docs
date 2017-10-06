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

const staticsDir = argv.staticsDir;
const statics = ["/index.html", "/js/jquery-3.2.1.min.js", "/assets/repo.png"];

function parseJSON(req) {
  let body = '';
  req.setEncoding('utf8');

  req.on('data', (chunk) => {
    body += chunk;
  });

  return new Promise((resolve, reject) => {
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (er) {
        reject(er);
      }
    });
  });
}

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
      parseJSON(req)
        .then(data => {
          return repo.mktemp(data.name);
        })
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

function returnError(res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({error: "not found"}));
}

function serveFile(path, res) {
  fs.stat(path, (err, stat) => {
    if (err) {
      returnError(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size
      });

      fs.createReadStream(path).pipe(res);
    }
  });
}

const httpServer = http.createServer((req, res) => {
  const url = req.url;
  if (/^\/scan\/?.*/.test(url)) {
    handleScan(req, res);
  } else if (/^\/repo\/.*/.test(url)) {
    const repoUrl = /^\/repo\/(.*)/.exec(url)[1];
    if (/\.\./.test(repoUrl)) {
      returnError(res);
    } else {
      serveFile(repo.basedir + "/" + repoUrl, res);
    }
  } else if (statics.includes(url)) {
    serveFile(staticsDir + url, res);
  } else {
    returnError(res);
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

httpServer.listen(listen);

httpServer.on('listening', () => {
  console.log("listening on %s", listen);
});
