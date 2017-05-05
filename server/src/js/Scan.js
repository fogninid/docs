const spawn = require('child_process').spawn;

const command = "/usr/bin/cat";
const commandArgs = ['/home/daniele/img/DFognini.jpg'];

const running = {};

let current = 0;
const nextId = () => {
  return current++;
};

exports.start = destination => {
  const id = nextId();

  const status = {running: true};
  const handle = {status: status};

  running[id] = handle;

  return new Promise((resolve, reject) => {
    try {
      const process = spawn(command, commandArgs);

      handle.process = process;
      process.stdin.end();

      process.on('error', e => {
        console.warn(`error from process: ${e.stack}`);
        status.running = false;
        status.error = e.message;
      });

      process.stdout.on('data', data => {
        const size = status.size || 0;
        status.size = size + data.length;
      });

      process.stderr.setEncoding('utf8');
      process.stderr.on('data', data => {
        console.log(`got '${data}' on stderr of ${process.pid}`);
      });

      process.on('exit', (code, signal) => {
        if (code !== null) {
          console.info(`process ${process.pid} exited with code ${code}`);
        }
        if (signal !== null) {
          console.info(`process ${process.pid} exited with signal ${signal}`);
        }
        status.running = false;
        status.code = code;
      });
      resolve(id);
    } catch (e) {
      reject(e);
    }
  });
};

exports.stop = id => {
  return new Promise((resolve, reject) => {
    if (running.hasOwnProperty(id)) {
      const handle = running[id];
      if (handle.status.running) {
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