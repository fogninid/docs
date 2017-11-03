const common = require("./Common");
const express = require("express");
const multiparty = require('multiparty');

app = repo => {
  const rv = express();

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

  return rv;
};

exports.app = app;

