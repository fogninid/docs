const fs = require("fs");
const dateformat = require('dateformat');
const debuglog = require("util").debuglog("repo");

class RepoAsyncWriter {
  constructor(destination, tmpPath, tmpFd) {
    this.destination = destination;
    this._path = tmpPath;
    this._writer = fs.createWriteStream(null, {fd: tmpFd});
    this._writer.on('error', err => {
      this.abort(err);
    })
  }

  write(data) {
    if (this._writer) {
      if (this._writer.write(data)) {
        this.abort();
      }
    }
  }

  abort() {
    if (this._writer) {
      this._writer.end();
      fs.unlink(this._path, err => {
        if (err) {
          console.warn(`cannot remove temporary file ${this._path}: ${err.message}`);
        }
      });
      this._writer = null;
      this._path = null;
    }
  }

  commit() {
    debuglog("committing %s", this._path);
    const tmpPath = this._path;
    const destination = this.destination;
    const writer = this._writer;
    this._writer = null;

    const self = this;

    return new Promise((resolve, reject) => {
      if (writer) {
        writer.end();
        writer.on('finish', () => {
          fs.rename(tmpPath, destination, err => {
            if (err) {
              console.error(`cannot rename ${tmpPath} to ${destination}: ${err.message}`);
              self.abort();
              reject(err);
            } else {
              console.log(`completed write to ${destination}`);
              resolve(destination);
            }
          });
        });
      } else {
        reject("already failed");
      }
    });
  }
}

class Repo {
  constructor(basedir) {
    this.basedir = basedir;
  }

  static nextId() {
    return dateformat(new Date(), "isoUtcDateTime") + ".jpg";
  };


  _nextTmpPath() {
    return this.basedir + "/tmp/" + Repo.nextId();
  }

  _nextDstPath() {
    return this.basedir + "/" + Repo.nextId();
  }

  mktemp() {
    const tmpPath = this._nextTmpPath();
    const destination = this._nextDstPath();

    return new Promise((resolve, reject) => {
      fs.open(tmpPath, "wx", 0o600, (err, fd) => {
        if (err) {
          reject(err);
        } else {
          resolve(new RepoAsyncWriter(destination, tmpPath, fd));
        }
      });
    });
  }
}

exports.Repo = Repo;
