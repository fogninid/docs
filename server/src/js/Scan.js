const EventEmitter = require('events');
const spawn = require('child_process').spawn;

const debuglog = require("util").debuglog("scan");

const command = "/usr/bin/cat";
const commandArgs = ['/home/daniele/img/DFognini.jpg'];

const running = {};

let current = 0;
const nextId = () => {
  return current++;
};

class ScanProgress extends EventEmitter {
  constructor(id, destination) {
    super();
    this.id = id;
    this.destination = destination;
  }
}

exports.start = destination => {
  const id = nextId();

  const status = {status: "started"};
  const handle = {status: status};

  running[id] = handle;

  return new Promise((resolve, reject) => {
    try {
      const process = spawn(command, commandArgs);

      handle.process = process;
      process.stdin.end();

      const scanProgress = new ScanProgress(id);

      process.on('error', e => {
        console.warn(`error from process: ${e.stack}`);
        delete handle.process;
        status.status = "error";
        status.error = e.message;
        scanProgress.emit('error', e);
      });

      process.stdout.on('data', data => {
        const size = status.size || 0;
        status.size = size + data.length;
        destination.write(data);
      });

      process.stderr.setEncoding('utf8');
      process.stderr.on('data', data => {
        console.log(`got '${data}' on stderr of ${process.pid}`);
      });

      process.on('exit', (code, signal) => {
        handle.running = false;
        delete handle.process;
        if (code !== null) {
          if (code === 0) {
            debuglog("process %d completed", process.pid);
            destination.commit()
              .then(() => {
                status.status = "success";
                scanProgress.emit('complete');
              })
              .catch(err => {
                status.status = "error";
                status.cause = err.message;
              });
            return;
          } else {
            console.info(`process ${process.pid} exited with code ${code}`);
          }
        }
        if (signal !== null) {
          console.info(`process ${process.pid} exited with signal ${signal}`);
        }
        destination.abort();
        status.status = "error";
      });
      resolve(scanProgress);
    } catch (e) {
      reject(e);
    }
  });
};

exports.stop = id => {
  return new Promise((resolve, reject) => {
    if (running.hasOwnProperty(id)) {
      const handle = running[id];
      if (handle.running) {
        try {
          console.info(`killing process ${handle.process.pid}`);
          handle.process.kill();
        } catch (e) {
          console.warn(`cannot kill: ${e.message}\n ${e.stack}`)
        }
      }
      delete running[id];
      resolve();
    } else {
      reject({code: 404, cause: "no job with id=" + id});
    }
  });
};

exports.list = () => {
  return Object.keys(running);
};

exports.status = id => {
  if (running.hasOwnProperty(id)) {
    return running[id].status;
  } else {
    return null;
  }
};