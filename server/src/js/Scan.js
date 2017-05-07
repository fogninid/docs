const EventEmitter = require('events');
const spawn = require('child_process').spawn;

const debuglog = require("util").debuglog("scan");

const Transform = require("stream").Transform;

let current = 0;
const nextId = () => {
  return current++;
};

class CountTransformer extends Transform {
  constructor(updater) {
    super();
    this.updater = updater;
  }

  _transform(chunk, encoding, callback) {
    this.push(chunk);
    this.updater(chunk.length);
    callback();
  }
}

class ProgressParser extends Transform {
  constructor() {
    super({
      objectMode: true
    });
    this._left = "";
  }

  _transform(chunk, encoding, callback) {
    const data = this._left + (chunk.toString());
    const self = this;
    const lines = data.split('\n');
    const full = lines.length - 1;
    lines.forEach((value, index) => {
      if (index < full) {
        self._pushParsed(value);
      } else {
        self._left = value;
      }
    });
    callback();
  }

  _pushParsed(value) {
    try {
      if (/^[0-9]+$/.test(value)) {
        this.push(parseInt(value));
      }
    } catch (e) {
    }
  }

  _flush(callback) {
    this._pushParsed(this._left);
    callback();
  }
}


class ScanProgress extends EventEmitter {
  constructor(id, destination) {
    super();
    this.id = id;
    this.destination = destination;
  }
}

class Scan {
  constructor(command, commandArgs) {
    this._command = command;
    this._commandArgs = Object.values(commandArgs) || [];
    this._running = {};
  }

  start(destination) {
    const command = this._command;
    const commandArgs = this._commandArgs;
    const running = this._running;

    const id = nextId();

    const status = {status: "started", size: 0};
    const handle = {status: status};

    running[id] = handle;

    return new Promise((resolve, reject) => {
      try {
        debuglog("spawning '%s' with '%j'", command, commandArgs);
        const process = spawn(command, commandArgs);

        handle.process = process;
        process.stdin.end();

        const scanProgress = new ScanProgress(id);

        const setError = e => {
          delete handle.process;
          const message = e.message || e;
          console.warn(`error from process: ${message}`);
          status.status = "error";
          status.error = message;
        };

        process.on('error', setError);
        process.stdout.on('error', setError);
        process.stdout
          .pipe(new CountTransformer(count => {
            status.size += count;
          }))
          .pipe(destination.writeStream());

        process.stderr.setEncoding('utf8');
        process.stderr
          .pipe(new ProgressParser())
          .on('data', progress => {
            status.progress = progress;
          });

        process.on('exit', (code, signal) => {
          handle.running = false;
          delete handle.process;
          if (code !== null) {
            if (code === 0 && status.status !== "error") {
              debuglog("process %d completed", process.pid);
              destination
                .commit()
                .then(() => {
                  status.status = "success";
                  scanProgress.emit('complete');
                })
                .catch(err => {
                  status.status = "error";
                  status.cause = err.message || err;
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
  }

  stop(id) {
    const running = this._running;
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
  }

  list() {
    const running = this._running;
    return Object.keys(running);
  }

  status(id) {
    const running = this._running;
    if (running.hasOwnProperty(id)) {
      return running[id].status;
    } else {
      return null;
    }
  }
}

exports.Scan = Scan;
