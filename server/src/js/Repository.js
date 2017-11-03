const common = require("./Common");
const express = require("express");
const fs = require("fs");
const dateformat = require('dateformat');
const debuglog = require("util").debuglog("repo");
const multiparty = require('multiparty');

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
  constructor(app, basedir) {
    this.app = app;
    this.basedir = basedir;
  }

  static nextId() {
    return dateformat(new Date(), "isoUtcDateTime");
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

  mktemp(finalOutput) {
    const destName = finalOutput.name.replace(/[/?&`$:]/g, "_") + "_" + Repo.nextId() + finalOutput.ext;

    const tmpPath = this.basedir + "/tmp/" + destName;
    const destPath = this.basedir + "/" + destName;
    const destUrl = this.app.mountpath + "/" + destName;

    return new Promise((resolve, reject) => {
      fs.open(tmpPath, "wx", 0o644, (err, fd) => {
        if (err) {
          reject(err);
        } else {
          resolve(new RepoAsyncWriter(destUrl, destPath, tmpPath, fd));
        }
      });
    });
  }
}

app = basedir => {
  const rv = express();
  const repo = (rv.locals.repo = new Repo(rv, basedir));

  rv.use(express.static(basedir, {
    index: false
  }));

  rv.get('/', (req, res, next) => {
    repo.list()
      .then(files => {
        res.json(files);
      })
      .catch(next);
  });

  rv.post('/', (req, res, next) => {
    const form = new multiparty.Form();

    let name;
    let success = false;

    form.on('error', next);

    form.on('field', (fieldName, fieldValue) => {
      if (fieldName === "name") {
        name = fieldValue;
      }
    });

    form.on('part', part => {
      if (part.filename) {
        part.on('error', next);

        const filename = common.splitFilename(part.filename);

        if (name) {
          filename.name = name;
        }

        repo.mktemp(filename)
          .then(outTmp => {
            const stream = part.pipe(outTmp.writeStream());
            stream.on('finish', () => {
              outTmp
                .commit()
                .then(path => {
                  res.status(201).json({path: path});
                })
                .catch(next);
            });
          })
          .catch(next);

        success = true;
      } else {
        part.resume();
      }
    });

    form.on('close', () => {
      if (!success) {
        res.status(400).json({error: "no file provided"});
      }
    });

    form.parse(req);
  });

  rv.mktemp = repo.mktemp.bind(repo);
  rv.list = repo.list.bind(repo);

  return rv;
};

exports.app = app;

