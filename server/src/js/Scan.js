const spawn = require('child_process').spawn;

const running = {};

let current = 0;

const nextId = () => {
  return current++;
};

exports.start = () => {
  const id = nextId();
  running[id] = {
    status: {running: true}
  };

  return new Promise((resolve, reject) => {
    resolve(id);
  });
};

exports.stop = id => {
  return new Promise((resolve, reject) => {
    if (running.hasOwnProperty(id)) {
      delete running[id];
      resolve();
    } else {
      reject({code: 404, cause: "not such job"});
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