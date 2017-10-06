const fs = require("fs");
const dateformat = require('dateformat');
const debuglog = require("util").debuglog("repo");

class RepoAsyncWriter {
  constructor(destination, destPath, tmpPath, tmpFd) {
    this.destination = destination;
    this.destPath = destPath;
    this._path = tmpPath;
    this._writer = fs.createWriteStream(null, {fd: tmpFd});
    this._write_fisished = false;
    const self = this;
    this._writer.on('error', err => {
      self.abort(err);
    });
    this._writer.on('finish', () => {
      self._write_fisished = true;
    });
  }

  writeStream() {
    return this._writer;
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
    const destPath = this.destPath;
    const destination = this.destination;
    const writer = this._writer;
    this._writer = null;

    const self = this;

    return new Promise((resolve, reject) => {
      if (writer) {
        writer.end();
        const rename = () => {
          fs.rename(tmpPath, destPath, err => {
            if (err) {
              console.error(`cannot rename ${tmpPath} to ${destPath}: ${err.message}`);
              self.abort();
              reject(err);
            } else {
              console.log(`completed write to ${destPath}`);
              resolve(destination);
            }
          });
        };
        if (self._write_fisished) {
          rename();
        } else {
          writer.on('finish', rename);
        }
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

  list() {
    return new Promise((resolve, reject) => {
      fs.readdir(this.basedir, (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files);
        }
      });
    });
  }

  mktemp(name) {
    const destination = (name || "scan") + "_" + Repo.nextId();

    const tmpPath = this.basedir + "/tmp/" + destination;
    const destPath = this.basedir + "/" + destination;

    return new Promise((resolve, reject) => {
      fs.open(tmpPath, "wx", 0o644, (err, fd) => {
        if (err) {
          reject(err);
        } else {
          resolve(new RepoAsyncWriter(destination, destPath, tmpPath, fd));
        }
      });
    });
  }
}

exports.Repo = Repo;
