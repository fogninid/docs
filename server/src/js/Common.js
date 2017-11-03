function errorHandler(e, req, res, next) {
  try {
    if (e instanceof Error) {
      console.error(e.stack);
    }
    res.status(e.code || e.status || e.statusCode || 500).json({error: e.cause || e.message || "unknown"});
  } catch (e) {
    res.status(500).json({error: "unknown"});
  }
}

function splitFilename(fileName){
  const rex = /(.*)(\.\w+)$/.exec(fileName);
  const basename = (rex ? rex[1] : false) || fileName;
  const ext = (rex ? rex[2] : false) || "";

  return {
    name: basename,
    ext: ext
  };
}

exports.errorHandler = errorHandler;
exports.splitFilename = splitFilename;

